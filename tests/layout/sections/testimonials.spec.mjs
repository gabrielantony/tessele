import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

const RAIL = '[aria-label="Cases de clientes"]';

/*
 * The "dark bar" Gabriel wanted gone is the rail's native scrollbar. Its cards
 * are `w-full shrink-0` under a max-width, so the rail overflows at every width
 * and is the only thing on the page that scrolls sideways.
 *
 * Hiding the bar alone would leave content reachable only by a gesture with
 * nothing on screen saying so, which is the defect `hiddenScrollers` in
 * landing-layout.spec.mjs exists to catch. So the bar goes and a visible control
 * takes over the job of announcing the overflow -- that check now earns its
 * exemption by finding such a control, rather than by an ALLOWED entry.
 */

/*
 * The control count is read off the rail rather than written down, because the
 * guarantee is "one control per case", not "two controls". A literal here would
 * have to be edited every time a case is added -- and an edit that just bumps a
 * number is indistinguishable from an edit that papers over a missing dot.
 */
const railCounts = async (page) => {
  const railId = await page.locator(RAIL).getAttribute("id");
  expect(railId, "the rail needs an id so its controls can reference it").toBeTruthy();

  const cards = await page.locator(`#${railId} > *`).count();
  expect(
    cards,
    "the rail holds fewer than two cases, so it has nothing to page through",
  ).toBeGreaterThan(1);

  return { railId, cards };
};

/*
 * Measures, for every case card, how far its painted shadow is cut by each
 * ancestor that clips.
 *
 * Runs whole inside the page like the probe in landing-layout.spec.mjs, so the
 * helpers it needs are declared in here rather than serialised in from module
 * scope.
 */
const SHADOW_PROBE = () => {
  /*
   * Chrome and WebKit both serialise box-shadow with the colour first and
   * ALWAYS four lengths -- x, y, blur, spread -- even where the author wrote
   * three. Tailwind's `shadow-*` utility prepends two fully transparent ring
   * layers; they paint nothing, so counting their zeros as reach would be
   * wrong in the safe direction and hide a real cut.
   */
  const reachOf = (value) => {
    const layers = [];
    let depth = 0;
    let current = "";
    for (const ch of value) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (ch === "," && depth === 0) {
        layers.push(current);
        current = "";
        continue;
      }
      current += ch;
    }
    layers.push(current);

    const reach = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const layer of layers) {
      if (/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(layer)) continue;
      const lengths = [...layer.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => Number(m[1]));
      if (lengths.length < 3) continue;
      const [x, y, blur] = lengths;
      const out = blur + (lengths[3] ?? 0);
      reach.left = Math.max(reach.left, out - x);
      reach.right = Math.max(reach.right, out + x);
      reach.top = Math.max(reach.top, out - y);
      reach.bottom = Math.max(reach.bottom, out + y);
    }
    return reach;
  };

  const cards = Array.from(document.querySelectorAll("[data-case-card]"));

  return cards.map((card, index) => {
    const reach = reachOf(getComputedStyle(card).boxShadow);
    const box = card.getBoundingClientRect();
    const painted = {
      top: box.top - reach.top,
      bottom: box.bottom + reach.bottom,
      left: box.left - reach.left,
    };

    const clippers = [];
    let node = card.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        // Overflow clips at the padding box, which is the client box: the
        // border-box rect inset by the border, sized by clientWidth/Height.
        const nodeBox = node.getBoundingClientRect();
        const top = nodeBox.top + node.clientTop;
        const left = nodeBox.left + node.clientLeft;

        clippers.push({
          clipper: `${node.tagName.toLowerCase()}.${String(node.className).split(/\s+/)[0]}`,
          overflow: `${style.overflowX}/${style.overflowY}`,
          cutTop: Math.round(Math.max(0, top - painted.top)),
          cutBottom: Math.round(Math.max(0, painted.bottom - (top + node.clientHeight))),
          // Where the left clip edge lands in the viewport. A left cut is only
          // acceptable when it happens at or past the viewport edge, where it
          // reads as the shadow running off the page rather than a drawn line.
          leftClipAt: Math.round(left),
        });
      }
      node = node.parentElement;
    }

    return { card: index, reach, paintedLeft: Math.round(painted.left), clippers };
  });
};

test.describe("testimonials", () => {
  for (const width of [390, 768, 1280]) {
    test(`the cases rail hides its native scrollbar at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const state = await page.evaluate((selector) => {
        const rail = document.querySelector(selector);
        if (!rail) return null;
        const style = getComputedStyle(rail);
        return {
          overflowX: style.overflowX,
          scrollbarWidth: style.scrollbarWidth,
          webkitBarHidden: getComputedStyle(rail, "::-webkit-scrollbar").display === "none",
          hiddenPx: rail.scrollWidth - rail.clientWidth,
        };
      }, RAIL);

      expect(state, "the cases rail was not found").not.toBeNull();
      expect(state.hiddenPx, "the rail no longer overflows, so this test is measuring nothing").toBeGreaterThan(0);
      expect(
        state.scrollbarWidth === "none" || state.webkitBarHidden,
        `the rail still shows a native scrollbar (scrollbar-width: ${state.scrollbarWidth})`,
      ).toBe(true);
    });
  }

  /*
   * Reported from the page, not inferred: the card's shadow ended in a hard
   * horizontal edge just under it. Measured at the time -- 114px cut at the
   * bottom and 10px at the top, at every width, by the rail itself.
   *
   * The rail scrolls sideways so it must clip sideways; that is the feature.
   * Vertically it must not, and that is the easy thing to get wrong: authoring
   * `overflow-x: auto` alone leaves `overflow-y: visible`, which CSS coerces to
   * `auto`. The rail becomes a clipper on an axis nobody asked it to clip.
   *
   * Asserting the cut is zero rather than asserting a padding value is
   * deliberate. Padding is one way to hold the shadow and an
   * `overflow-clip-margin` would be another; the guarantee is the shadow.
   */
  for (const width of [390, 768, 1280, 1600]) {
    test(`no ancestor cuts the case card shadow vertically at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);
      await page.locator("[data-case-card]").first().scrollIntoViewIfNeeded();

      const report = await page.evaluate(SHADOW_PROBE);

      expect(report.length, "no case card was found").toBeGreaterThan(0);
      expect(
        report[0].reach.bottom,
        "the card carries no downward shadow, so this test is measuring nothing",
      ).toBeGreaterThan(0);
      expect(
        report.flatMap((entry) => entry.clippers).length,
        "nothing clips the card any more -- if that is intended, this test can go",
      ).toBeGreaterThan(0);

      const cut = report.flatMap(({ card, clippers }) =>
        clippers
          .filter((clip) => clip.cutTop > 0 || clip.cutBottom > 0)
          .map((clip) => ({ card, ...clip })),
      );

      expect(cut, `a clipper cuts the card shadow top or bottom: ${JSON.stringify(cut)}`).toEqual([]);
    });
  }

  /*
   * The left side is the one direction the shadow genuinely cannot fit: it
   * reaches 108px left of the card, and the page gutter is 20px on a phone. So
   * the rule is not "never cut" but "only cut off the page", where it reads as
   * the shadow running past the edge instead of a line drawn across it.
   */
  for (const width of [390, 1280]) {
    test(`the case card shadow is only cut off-page on the left at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);
      await page.locator("[data-case-card]").first().scrollIntoViewIfNeeded();

      const [first] = await page.evaluate(SHADOW_PROBE);

      const drawnInside = first.clippers.filter(
        (clip) => clip.leftClipAt > 0 && clip.leftClipAt > first.paintedLeft,
      );

      expect(
        drawnInside,
        `the left shadow is cut inside the page, which draws an edge: ${JSON.stringify(drawnInside)}`,
      ).toEqual([]);
    });
  }

  test("the rail announces its overflow with visible controls", async ({ page }) => {
    await gotoLanding(page, 1280);

    const { railId, cards } = await railCounts(page);

    const controls = page.locator(`[aria-controls="${railId}"]`);
    await expect(
      controls,
      `${cards} cases in the rail, so a different number of controls leaves at least one case unannounced`,
    ).toHaveCount(cards);

    for (let index = 0; index < cards; index += 1) {
      await expect(controls.nth(index), `control ${index} is not visible`).toBeVisible();
    }
  });

  // A control that looks like pagination and does nothing is worse than no
  // control: it reads as "you have seen everything". Assert the effect.
  test("a rail control scrolls the rail and reflects the position", async ({ page }) => {
    await gotoLanding(page, 1280);

    const { railId, cards } = await railCounts(page);
    const controls = page.locator(`[aria-controls="${railId}"]`);
    const scrollLeft = () => page.evaluate((s) => document.querySelector(s).scrollLeft, RAIL);

    // Fail on the missing control rather than on a 60s click timeout waiting for
    // one: the useful message is "there is no control", not "the click expired".
    await expect(
      controls,
      "the rail has no controls to exercise -- see the previous test",
    ).toHaveCount(cards);

    await page.locator(RAIL).scrollIntoViewIfNeeded();
    expect(await scrollLeft(), "the rail does not start at its first case").toBe(0);

    // The last control, not the second: it targets the case furthest from the
    // start, so the rail has to travel to reach it whatever the case count.
    await controls.nth(cards - 1).click();
    await page.waitForTimeout(700);
    const afterForward = await scrollLeft();
    expect(afterForward, "clicking the last control did not move the rail").toBeGreaterThan(0);

    // Whichever control is current has to be distinguishable from the rest, or
    // the dots carry no state and the reader cannot tell where they are.
    const marks = await page.evaluate((selector) => {
      const els = Array.from(document.querySelectorAll(selector));
      return els.map((el) => ({
        selected: el.getAttribute("aria-selected") ?? el.getAttribute("aria-current"),
        background: getComputedStyle(el).backgroundColor,
        width: Math.round(el.getBoundingClientRect().width),
        opacity: getComputedStyle(el).opacity,
      }));
    }, `[aria-controls="${railId}"]`);

    const distinguishable =
      new Set(marks.map((m) => JSON.stringify([m.selected, m.background, m.width, m.opacity])))
        .size > 1;
    expect(
      distinguishable,
      `every rail control renders identically after moving, so nothing shows the current case: ${JSON.stringify(marks)}`,
    ).toBe(true);

    await controls.nth(0).click();
    await page.waitForTimeout(700);
    expect(
      await scrollLeft(),
      "clicking the first control did not bring the rail back",
    ).toBeLessThan(afterForward);
  });
});
