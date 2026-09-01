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

  /*
   * The dots that used to live under the rail are gone -- the design does not
   * have them, and the row is meant to read as a strip that continues past the
   * edge. Two guarantees the dots carried have to survive that, so they are
   * asserted directly here instead of through a control:
   *
   *   1. something on screen says the row continues (this test), and
   *   2. the hidden cases are actually reachable (the next one).
   *
   * The third thing the dots did -- show which case you are on -- goes away
   * with them on purpose. That is the design decision, not a dropped guarantee.
   */
  for (const width of [390, 768, 1280, 1600]) {
    test(`a case peeks past the rail edge to announce the row at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);
      await page.locator(RAIL).scrollIntoViewIfNeeded();

      const peek = await page.evaluate((selector) => {
        const rail = document.querySelector(selector);
        const left = rail.getBoundingClientRect().left + rail.clientLeft;
        const right = left + rail.clientWidth;

        return Array.from(rail.children)
          .map((child, index) => {
            const box = child.getBoundingClientRect();
            return {
              index,
              shown: Math.round(Math.min(box.right, right) - Math.max(box.left, left)),
              hidden: Math.round(Math.max(0, box.right - right) + Math.max(0, left - box.left)),
            };
          })
          .filter((child) => child.shown > 0 && child.hidden > 0);
      }, RAIL);

      // Both halves matter. Something visible enough to notice, and enough of it
      // cut off to read as "there is more" rather than as the row ending here.
      const announcing = peek.filter((child) => child.shown >= 16 && child.hidden >= 16);
      expect(
        announcing.length,
        `no case straddles the rail edge, so nothing says the row continues: ${JSON.stringify(peek)}`,
      ).toBeGreaterThan(0);
    });
  }

  test("the cases hidden past the edge can be scrolled to", async ({ page }) => {
    await gotoLanding(page, 1280);
    await page.locator(RAIL).scrollIntoViewIfNeeded();

    const cards = await page.locator(`${RAIL} > *`).count();
    expect(cards, "the rail holds one case, so nothing is hidden to reach").toBeGreaterThan(1);

    const lastFullyShown = () =>
      page.evaluate((selector) => {
        const rail = document.querySelector(selector);
        const left = rail.getBoundingClientRect().left + rail.clientLeft;
        const right = left + rail.clientWidth;
        const last = rail.children[rail.children.length - 1].getBoundingClientRect();
        return last.left >= left - 1 && last.right <= right + 1;
      }, RAIL);

    expect(await lastFullyShown(), "the last case is already in view, so this measures nothing").toBe(false);

    await page.evaluate((selector) => {
      const rail = document.querySelector(selector);
      rail.scrollLeft = rail.scrollWidth;
    }, RAIL);
    await page.waitForTimeout(300);

    expect(await lastFullyShown(), "scrolling the rail to its end does not bring the last case into view").toBe(true);
  });

  /*
   * The metrics strip under the rail is meant to sit in the same box as the
   * card above it. Asserted from lg up only, and deliberately: below lg the
   * card is held short of the rail so the next one can peek, so there is no
   * shared box to line up with.
   */
  for (const width of [1024, 1280, 1600]) {
    test(`the metrics strip lines up with the card above it at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const edges = await page.evaluate(() => {
        const card = document.querySelector("[data-case-card]").getBoundingClientRect();
        const strip = document
          .querySelector("[data-relationship-metric]")
          .parentElement.getBoundingClientRect();
        return {
          cardLeft: Math.round(card.left),
          cardRight: Math.round(card.right),
          stripLeft: Math.round(strip.left),
          stripRight: Math.round(strip.right),
        };
      });

      expect(Math.abs(edges.stripLeft - edges.cardLeft), `left edges differ: ${JSON.stringify(edges)}`).toBeLessThanOrEqual(1);
      expect(Math.abs(edges.stripRight - edges.cardRight), `right edges differ: ${JSON.stringify(edges)}`).toBeLessThanOrEqual(1);
    });
  }

  /*
   * Two separate guarantees about the metric labels, because they hold over
   * different ranges.
   *
   * The complaint was one label reading differently from its neighbours -- a
   * lone "recorrente" on the second line while the other two carried a pair of
   * words there. So the rule that holds everywhere the three sit side by side
   * is that they agree with each other and the tail always owns the last line.
   *
   * The stricter rule -- exactly two lines, tail on the second -- needs room
   * the columns only have from lg up. At md the three share about 164px each
   * and the first half wraps too, giving three consistent lines. Gabriel took
   * that as the acceptable case: the display does not have the width.
   */
  for (const width of [768, 1024, 1280, 1600]) {
    test(`the metric labels break consistently at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const labels = await page.evaluate(() => {
        /*
         * Line count comes from the rendered height over the line height, not
         * from counting Range rects. A block-level child contributes both its
         * own box and the text inside it, so a two-line label yields three
         * rects at three distinct tops -- the rect count reads 3 while the
         * paragraph is plainly 48px tall on a 24px line.
         */
        return Array.from(document.querySelectorAll("[data-metric-tail]")).map((tail) => {
          const label = tail.parentElement;
          const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
          const labelTop = label.getBoundingClientRect().top;

          return {
            text: label.textContent.trim().replace(/\s+/g, " "),
            tail: tail.textContent.trim(),
            lineHeight,
            lines: Math.round(label.getBoundingClientRect().height / lineHeight),
            // Exactly one line down, not merely lower: two lines split in the
            // wrong place would still be two lines.
            tailLineOffset: Math.round(
              (tail.getBoundingClientRect().top - labelTop) / lineHeight,
            ),
          };
        });
      });

      expect(labels.length, "no metric labels were found").toBe(3);

      // Holds at every width here: no label is the odd one out, and the tail is
      // never left sharing a line with what comes before it.
      const counts = new Set(labels.map((label) => label.lines));
      expect(
        counts.size,
        `the metric labels do not agree on their line count: ${JSON.stringify(labels)}`,
      ).toBe(1);

      const shared = labels.filter((label) => label.tailLineOffset !== label.lines - 1);
      expect(
        shared,
        `a metric tail does not own the last line: ${JSON.stringify(labels)}`,
      ).toEqual([]);

      // The intended split, only where the columns are wide enough for it.
      if (width >= 1024) {
        const wrong = labels.filter((label) => label.lines !== 2);
        expect(
          wrong,
          `a metric label is not the intended two lines: ${JSON.stringify(labels)}`,
        ).toEqual([]);
      }
    });
  }
});
