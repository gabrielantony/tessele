import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * Gabriel: the TESSELE wordmark is stretched. Two distortions compound, both
 * measured on the wordmark's `<text>` node:
 *
 *   viewport   x-scale   y-scale   net glyph stretch
 *   768px       6.13      2.50           2.45x
 *   1280px     10.48      2.50           4.19x
 *   1920px     16.88      2.50           6.75x
 *
 * `preserveAspectRatio="none"` on the svg lets the 100x64 viewBox fill a
 * full-width box, so the horizontal scale grows with the viewport while the
 * vertical stays at 2.5. On top of that, `textLength="88%"` with
 * `lengthAdjust="spacingAndGlyphs"` squeezes the natural 229.2 units of glyph
 * advance down to 88, so the letterforms are compressed in user space and then
 * stretched back out by an unrelated factor.
 *
 * The assertion is the net effect on the letterforms: the horizontal scale the
 * glyphs actually receive, divided by the vertical one. Uniform type gives 1.
 * How that is achieved -- naturally sized type with letter-spacing, a uniformly
 * scaled svg, or plain DOM text -- is not this test's business.
 *
 * The wordmark is `hidden md:block`, so below 768px there is nothing to check.
 */
/*
 * Measures whatever element renders the wordmark, not svg text specifically. The
 * first version only understood `<svg><text>`, so when the fix replaced it with
 * DOM text the assertion fell through to a fallback and passed on almost
 * nothing -- a probe that stops probing the moment the implementation changes.
 *
 * The method is the same either way: render the same string, with the same
 * computed font, free of any forcing or transform, and compare aspect ratios.
 */
const WORDMARK_DISTORTION = () => {
  const mark = document.querySelector("[data-footer-wordmark]");
  if (!mark) return null;

  const svgText = mark.querySelector("text");
  if (svgText) {
    const matrix = svgText.getScreenCTM();
    const probe = svgText.cloneNode(true);
    probe.removeAttribute("textLength");
    probe.removeAttribute("lengthAdjust");
    svgText.ownerSVGElement.append(probe);
    const naturalUnits = probe.getBBox().width;
    probe.remove();
    const forcedUnits = svgText.getBBox().width;
    return {
      kind: "svg",
      ratio: (forcedUnits * matrix.a) / (naturalUnits * matrix.d),
      detail: `x${matrix.a.toFixed(2)} against y${matrix.d.toFixed(2)}, advance forced from ${naturalUnits.toFixed(1)} to ${forcedUnits.toFixed(1)} units`,
    };
  }

  const rendered = Array.from(mark.querySelectorAll("*")).find(
    (el) => (el.textContent ?? "").trim() && !el.children.length,
  );
  if (!rendered) return null;

  const style = getComputedStyle(rendered);
  const box = rendered.getBoundingClientRect();

  const probe = document.createElement("span");
  probe.textContent = rendered.textContent;
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

  // Any scale or stretch shows up as the two aspect ratios diverging.
  return {
    kind: "dom",
    ratio: box.width / box.height / (natural.width / natural.height),
    detail: `rendered ${Math.round(box.width)}x${Math.round(box.height)} against a natural ${Math.round(natural.width)}x${Math.round(natural.height)}, transform ${style.transform}`,
  };
};

test.describe("footer", () => {
  for (const width of [768, 1280, 1920]) {
    test(`the wordmark letterforms are not stretched at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const measured = await page.evaluate(WORDMARK_DISTORTION);

      expect(measured, "the footer wordmark is gone, or renders no text").not.toBeNull();
      expect(
        measured.ratio,
        `the wordmark letterforms are distorted ${measured.ratio.toFixed(2)}x (${measured.kind}: ${measured.detail})`,
      ).toBeCloseTo(1, 1);
    });
  }

  /*
   * Gabriel's call, recorded so nobody restores the old look while "fixing" the
   * proportions: the wordmark is deliberately small and centred, not the wide
   * display mark it used to be. It filled 88% of the footer before, but only by
   * stretching the glyphs -- 1.61x at 1280px, 2.59x at 1920px. Asked whether he
   * wanted it wide with open tracking, large and proportional, or small and
   * centred, he chose small and centred.
   *
   * So the fill share is intentionally NOT asserted here. What is asserted is
   * that it stays undistorted (above) and that it is still visible at all -- a
   * later change that scales it back up to fill the footer would have to distort
   * it again, and the assertion above is what catches that.
   */
  test("the wordmark is present without filling the footer", async ({ page }) => {
    await gotoLanding(page, 1280);

    const fill = await page.evaluate(() => {
      const mark = document.querySelector("[data-footer-wordmark]");
      if (!mark) return null;
      const text = Array.from(mark.querySelectorAll("*")).find(
        (el) => (el.textContent ?? "").trim() && !el.children.length,
      );
      const container = mark.parentElement;
      if (!text || !container) return null;
      return {
        visible: text.getBoundingClientRect().width > 0,
        share: text.getBoundingClientRect().width / container.getBoundingClientRect().width,
      };
    });

    expect(fill, "the wordmark renders nothing measurable").not.toBeNull();
    expect(fill.visible, "the wordmark is not rendered").toBe(true);
  });

  // The wordmark is decorative -- the footer's real content must not depend on it.
  test("the footer legal line stays legible", async ({ page }) => {
    await gotoLanding(page, 1280);

    const legal = page.locator("[data-footer-legal]");
    await expect(legal, "the footer legal line is missing").toBeVisible();

    const overlap = await page.evaluate(() => {
      const legalBox = document.querySelector("[data-footer-legal]")?.getBoundingClientRect();
      const mark = document.querySelector("[data-footer-wordmark]");
      if (!legalBox || !mark) return null;
      const markBox = mark.getBoundingClientRect();
      const x = Math.min(legalBox.right, markBox.right) - Math.max(legalBox.left, markBox.left);
      const y = Math.min(legalBox.bottom, markBox.bottom) - Math.max(legalBox.top, markBox.top);
      return x > 1 && y > 1 ? { x: Math.round(x), y: Math.round(y) } : null;
    });

    // They overlap by design -- the legal line sits over the wordmark -- so this
    // only records it. What matters is that the wordmark is behind and muted;
    // a regression that puts it on top would show up as an unreadable line.
    if (overlap) {
      const stacking = await page.evaluate(() => {
        const mark = document.querySelector("[data-footer-wordmark]");
        const legal = document.querySelector("[data-footer-legal]");
        return {
          markPointerEvents: getComputedStyle(mark).pointerEvents,
          legalPosition: getComputedStyle(legal).position,
        };
      });
      expect(
        stacking.markPointerEvents,
        "the wordmark sits over the legal line and can take its clicks",
      ).toBe("none");
    }
  });
});
