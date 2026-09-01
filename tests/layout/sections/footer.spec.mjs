import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * The footer wordmark, and the history matters because this spec taught me
 * something twice.
 *
 * It started as `<svg><text>` with `preserveAspectRatio="none"` and
 * `textLength="88%" lengthAdjust="spacingAndGlyphs"`. Two distortions compounded:
 * the horizontal scale grew with the viewport (6.13 / 10.48 / 16.88 at
 * 768 / 1280 / 1920) against a vertical fixed at 2.5, while the glyph advance was
 * squeezed from its natural 229.2 units to 88. Net effect on the letterforms:
 * 0.94x at 768px, 1.61x at 1280px, 2.59x at 1920px -- compressed at one width and
 * stretched at another.
 *
 * The first fix replaced it with DOM text. Gabriel then supplied the real
 * logotype as vector paths, which is what it is now.
 *
 * Both times the implementation changed shape, and both times my probes had the
 * old shape baked in: the first only understood svg text and fell through to a
 * fallback that asserted nearly nothing, and then two assertions ended up
 * contradicting each other -- one demanding vector paths while another hunted for
 * a text node to measure. Hence a single probe below. Every test reads from it, so
 * there is exactly one place that knows how the wordmark is drawn.
 */
const WORDMARK_STATE = () => {
  const mark = document.querySelector("[data-footer-wordmark]");
  if (!mark) return null;

  const svg = mark.querySelector("svg");
  const textLeaf = Array.from(mark.querySelectorAll("*")).find(
    (el) => (el.textContent ?? "").trim() && !el.children.length,
  );
  const drawn = svg ?? textLeaf ?? null;
  if (!drawn) return null;

  const box = drawn.getBoundingClientRect();
  const container = mark.parentElement?.getBoundingClientRect();
  const paths = Array.from(mark.querySelectorAll("path"));

  const state = {
    kind: svg ? (svg.querySelector("text") ? "svg-text" : "paths") : "dom-text",
    width: Math.round(box.width),
    height: Math.round(box.height),
    share: container?.width ? box.width / container.width : null,
    pathCount: paths.length,
    hasViewBox: Boolean(svg?.viewBox?.baseVal?.width),
    // A literal colour in the markup cannot follow a token; currentColor can.
    hardcodedFills: [
      ...new Set(
        paths
          .map((path) => path.getAttribute("fill"))
          .filter((fill) => fill && fill.toLowerCase() !== "currentcolor"),
      ),
    ],
    pointerEvents: getComputedStyle(mark).pointerEvents,
    distortion: null,
    detail: "",
  };

  if (state.kind === "paths") {
    // The cleanest case: the viewBox declares the artwork's true aspect, so any
    // non-uniform scaling shows up as the rendered box disagreeing with it. No
    // font metrics involved.
    const view = svg.viewBox.baseVal;
    state.distortion = box.width / box.height / (view.width / view.height);
    state.detail = `rendered ${state.width}x${state.height} against a ${view.width}x${view.height} viewBox, preserveAspectRatio "${svg.getAttribute("preserveAspectRatio") ?? "(default)"}"`;
    return state;
  }

  if (state.kind === "svg-text") {
    const text = svg.querySelector("text");
    const matrix = text.getScreenCTM();
    const probe = text.cloneNode(true);
    probe.removeAttribute("textLength");
    probe.removeAttribute("lengthAdjust");
    svg.append(probe);
    const naturalUnits = probe.getBBox().width;
    probe.remove();
    const forcedUnits = text.getBBox().width;
    state.distortion = (forcedUnits * matrix.a) / (naturalUnits * matrix.d);
    state.detail = `x${matrix.a.toFixed(2)} against y${matrix.d.toFixed(2)}, advance forced from ${naturalUnits.toFixed(1)} to ${forcedUnits.toFixed(1)} units`;
    return state;
  }

  // DOM text: render the same string with the same computed font, free of any
  // transform, and compare aspect ratios.
  const style = getComputedStyle(drawn);
  const probe = document.createElement("span");
  probe.textContent = drawn.textContent;
  for (const property of [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStretch",
    "letterSpacing",
    "textTransform",
    "lineHeight",
  ]) {
    probe.style[property] = style[property];
  }
  probe.style.position = "absolute";
  probe.style.whiteSpace = "nowrap";
  probe.style.visibility = "hidden";
  probe.style.transform = "none";
  document.body.append(probe);
  const natural = probe.getBoundingClientRect();
  probe.remove();

  state.distortion = box.width / box.height / (natural.width / natural.height);
  state.detail = `rendered ${state.width}x${state.height} against a natural ${Math.round(natural.width)}x${Math.round(natural.height)}, transform ${style.transform}`;
  return state;
};

test.describe("footer", () => {
  // `hidden md:block`, so below 768px there is nothing to check.
  for (const width of [768, 1280, 1920]) {
    test(`the wordmark letterforms are not stretched at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const state = await page.evaluate(WORDMARK_STATE);
      expect(state, "the footer wordmark is gone, or draws nothing").not.toBeNull();
      expect(
        state.distortion,
        `the wordmark letterforms are distorted ${state.distortion.toFixed(2)}x (${state.kind}: ${state.detail})`,
      ).toBeCloseTo(1, 1);
    });
  }

  /*
   * Gabriel supplied the logotype as vector paths and asked for it to be used, so
   * this is his requirement rather than the test's preference: drawn artwork,
   * taking its colour from the palette. The supplied file hardcodes #142A1E, a
   * fifth green next to accent (#112118) and accent-hover (#1a3224).
   */
  test("the wordmark is drawn artwork taking its colour from the palette", async ({ page }) => {
    await gotoLanding(page, 1280);

    const state = await page.evaluate(WORDMARK_STATE);
    expect(state, "the footer wordmark was not found").not.toBeNull();
    expect(state.pathCount, "the wordmark is not drawn as vector paths").toBeGreaterThan(0);
    expect(state.hasViewBox, "the wordmark svg has no viewBox to scale by").toBe(true);
    expect(
      state.hardcodedFills,
      "these fills are literal colours, so the wordmark cannot follow the palette",
    ).toEqual([]);
  });

  /*
   * The point of drawing a logotype rather than setting type is that it stops
   * depending on a webfont: the shapes are the shapes. Block the fonts and require
   * the geometry not to move. DOM text reflows to fallback metrics here -- measured
   * 229x64 with the font and 249x64 without it -- and paths cannot.
   */
  test("the wordmark does not depend on the webfont", async ({ page }) => {
    await gotoLanding(page, 1280);
    const withFont = await page.evaluate(WORDMARK_STATE);
    expect(withFont, "the footer wordmark draws nothing measurable").not.toBeNull();

    await page.route("**/*.woff2", (route) => route.abort());
    await gotoLanding(page, 1280);
    const withoutFont = await page.evaluate(WORDMARK_STATE);

    expect(
      [withoutFont?.width, withoutFont?.height],
      `the wordmark measured ${withFont.width}x${withFont.height} with the webfont and ${withoutFont?.width}x${withoutFont?.height} without it, so its shape still comes from the font`,
    ).toEqual([withFont.width, withFont.height]);
  });

  /*
   * Gabriel's call, recorded so nobody restores the old look while "fixing" the
   * proportions: the wordmark is deliberately small and centred, not the wide
   * display mark it used to be. It filled 88% of the footer before, but only by
   * stretching the glyphs. Asked whether he wanted it wide with open tracking,
   * large and proportional, or small and centred, he chose small and centred.
   *
   * Now that it is vector artwork the trade-off is gone -- width costs no
   * distortion -- so the fill share is deliberately NOT asserted, and going wide
   * later is a one-class change that the distortion test above still guards.
   */
  test("the wordmark is present", async ({ page }) => {
    await gotoLanding(page, 1280);

    const state = await page.evaluate(WORDMARK_STATE);
    expect(state, "the footer wordmark draws nothing measurable").not.toBeNull();
    expect(state.width, "the wordmark has no width").toBeGreaterThan(0);
    expect(state.height, "the wordmark has no height").toBeGreaterThan(0);
  });

  // The wordmark is decorative and sits under the legal line; it must not be able
  // to take the line's clicks.
  test("the footer legal line stays legible", async ({ page }) => {
    await gotoLanding(page, 1280);

    await expect(page.locator("[data-footer-legal]"), "the footer legal line is missing").toBeVisible();

    const state = await page.evaluate(WORDMARK_STATE);
    expect(
      state.pointerEvents,
      "the wordmark can take the legal line's clicks",
    ).toBe("none");
  });
});
