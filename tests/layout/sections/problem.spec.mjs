import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * The section shows three factors around a decision and lights them up one at a
 * time: the hub pulses, the line to that factor draws itself green, the card
 * lights, and the dashed arc behind it fills to the next factor. Two layouts
 * carry it -- a circle from 640px, a stacked column below -- and one timeline
 * drives both.
 *
 * What replaced this: a 21s orbit that carried the cards around the circle, and
 * with them every geometry bug in `2026-09-01-problem-section-and-gpt-sections.md`
 * -- an offset derived from the cards' rendered width at init, stale on resize
 * and wrong on every viewport where a card was taller than wide. Nothing here
 * measures a rendered box to place anything any more, so the tests below are
 * about the two properties that survived the rewrite as risks: the labels have to
 * fit the cards, and the cards have to stay inside the square.
 */

/*
 * Below 640px the cards are full-width in a column, so the label fits by
 * construction. From 640px up they are 34% of a square that is itself fluid,
 * which is where a 14px/700 uppercase word can outgrow its box again. The
 * narrowest square is not at the narrowest viewport: it is at 1280px, where the
 * section splits into two columns and the square drops from 768px to ~496px.
 *
 * The suite's `parentOverflow` probe cannot see this: it compares element boxes,
 * and a text run is not an element. The <p> box stays put while its glyphs paint
 * outside it, so the measurement has to come from Range.getClientRects().
 */
const TEXT_OUTSIDE_ITS_BOX = () => {
  const findings = [];
  for (const card of document.querySelectorAll("[data-factor-card]")) {
    for (const el of card.querySelectorAll("p")) {
      if (el.children.length) continue;
      const text = (el.textContent ?? "").trim();
      if (!text) continue;

      const style = getComputedStyle(el);
      const content =
        el.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);

      // The painted width of the widest line, which is what actually escapes --
      // el.scrollWidth rounds and misses sub-pixel overflow.
      const range = document.createRange();
      range.selectNodeContents(el);
      const widest = Math.max(
        0,
        ...Array.from(range.getClientRects()).map((rect) => rect.width),
      );

      const over = Math.round(widest - content);
      if (over > 1) {
        findings.push({
          text: text.slice(0, 28),
          paintedPx: Math.round(widest),
          contentBoxPx: Math.round(content),
          overflowPx: over,
        });
      }
    }
  }
  return findings;
};

// The cards and the hub are placed by percentage inside the square, and the type
// inside them is not -- so a card can still grow past the edge if a description
// wraps to another line at some width. Measured on all four edges: the bug that
// preceded this section was on the two nobody was looking at.
const ESCAPE = () => {
  const square = document.querySelector("[data-diagram]");
  if (!square) return null;

  const box = square.getBoundingClientRect();
  const worst = { left: 0, right: 0, top: 0, bottom: 0 };

  for (const el of square.querySelectorAll("[data-factor-card], [data-hub]")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    worst.left = Math.max(worst.left, Math.round(box.left - rect.left));
    worst.right = Math.max(worst.right, Math.round(rect.right - box.right));
    worst.top = Math.max(worst.top, Math.round(box.top - rect.top));
    worst.bottom = Math.max(worst.bottom, Math.round(rect.bottom - box.bottom));
  }

  return worst;
};

/*
 * One reading of the diagram's animated state.
 *
 * Per step, how much of its line is drawn AND how visible the layer holding it
 * is, multiplied -- because a fully drawn line inside a layer at opacity 0 is
 * invisible, and reporting it as drawn would let a stuck layer pass. The paths
 * of the layout that is not on screen are skipped by their zero-sized box.
 *
 * Every line the step owns counts, and the step is worth its LEAST drawn one:
 * the circle has two (`in`, from the hub to the card, and `out`, from that card
 * to the next), the stacked column has only the `out` connector. Taking the
 * minimum is what makes "the step is drawn" mean all of it -- a max would let a
 * dead arc hide behind a healthy spoke.
 *
 * Before the hook runs there is no inline dash offset at all, which computes to
 * 0 and would read as fully drawn; the layer's opacity attribute is 0 there, so
 * the product is still 0. That is the resting state, and it is what the
 * reduced-motion assertion measures.
 */
const DIAGRAM_STATE = () => {
  const shown = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  };

  const steps = new Map();
  for (const path of document.querySelectorAll("[data-fill]")) {
    if (!shown(path)) continue;

    const length = Number(path.dataset.fillLength);
    const offset = parseFloat(getComputedStyle(path).strokeDashoffset);
    const drawn = Number.isFinite(offset)
      ? Math.max(0, Math.min(1, 1 - offset / length))
      : 1;
    const layer = path.closest("[data-fill-layer]");
    const opacity = layer ? Number(getComputedStyle(layer).opacity) : 0;

    const index = Number(path.dataset.fill);
    steps.set(index, Math.min(steps.get(index) ?? 1, drawn * opacity));
  }

  const rings = Array.from(document.querySelectorAll("[data-card-active]"), (ring) =>
    Number(getComputedStyle(ring).opacity),
  );

  const pulses = Array.from(document.querySelectorAll("[data-pulse]"), (pulse) => {
    const style = getComputedStyle(pulse);
    const scale = Number(style.transform.match(/matrix\(([-\d.]+)/)?.[1] ?? 1);
    return { opacity: Number(style.opacity), scale };
  });

  // The green over the hub's grey. 0 is the resting state -- the decision has
  // not been made -- and it is the attribute on the element, not something the
  // hook writes, so this reads 0 before any JS has run too.
  const fill = document.querySelector("[data-hub-fill]");

  return {
    lines: Array.from(steps.keys())
      .sort((a, b) => a - b)
      .map((index) => steps.get(index)),
    rings,
    pulses,
    hub: fill ? Number(getComputedStyle(fill).opacity) : 0,
  };
};

const trace = async (page, { samples, everyMs }) => {
  const readings = [];
  for (let sample = 0; sample < samples; sample += 1) {
    readings.push(await page.evaluate(DIAGRAM_STATE));
    await page.waitForTimeout(everyMs);
  }
  return readings;
};

const showDiagram = async (page) => {
  await page.evaluate(() =>
    document.querySelector("[data-diagram]")?.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(400);
};

test.describe("problem", () => {
  for (const width of [320, 390, 430, 640, 768, 1024, 1280, 1600]) {
    test(`no factor card label paints outside its card at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const cards = await page.locator("[data-factor-card]").count();
      expect(cards, "no factor cards found").toBeGreaterThan(0);

      const findings = await page.evaluate(TEXT_OUTSIDE_ITS_BOX);
      expect(findings, "label glyphs painting outside the card holding them").toEqual([]);
    });

    test(`the diagram holds its cards and hub inside the square at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width);
      await showDiagram(page);

      const worst = await page.evaluate(ESCAPE);
      expect(worst, "[data-diagram] not found").not.toBeNull();
      expect(
        worst,
        `a card or the hub sits up to ${Math.max(...Object.values(worst ?? {}))}px outside the diagram`,
      ).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    });
  }

  /*
   * The same bounds, measured while the sequence runs. The cards do not travel
   * any more -- what moves is the ring pulsing out of the hub and the green lines
   * drawing themselves -- so this is cheap: three widths, one cycle each, rather
   * than the 110 samples per width the orbit needed.
   */
  for (const width of [390, 768, 1280]) {
    test(`the diagram holds its bounds while the sequence runs at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width, { motion: true });
      await showDiagram(page);

      const worst = { left: 0, right: 0, top: 0, bottom: 0 };
      for (let sample = 0; sample < 18; sample += 1) {
        const now = await page.evaluate(ESCAPE);
        for (const edge of Object.keys(worst)) {
          worst[edge] = Math.max(worst[edge], now[edge]);
        }
        await page.waitForTimeout(400);
      }

      expect(
        worst,
        `something left the diagram by up to ${Math.max(...Object.values(worst))}px somewhere in the loop`,
      ).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    });
  }

  // Rotating a phone crosses 640px without a reload, and 640px is where the whole
  // layout switches between the circle and the column. The geometry is CSS
  // percentages either side of it, so nothing is recomputed in JS -- which is the
  // claim this test exists to hold true.
  test("the diagram survives a resize across the layout switch", async ({ page }) => {
    await gotoLanding(page, 390, { motion: true });
    await showDiagram(page);

    expect(
      await page.evaluate(ESCAPE),
      "a card leaves the diagram at the width it loaded at",
    ).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(600);
    await showDiagram(page);

    expect(
      await page.evaluate(ESCAPE),
      "a card leaves the diagram after the viewport crosses 640px",
    ).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  // 390px is the stacked layout, 1280px the circle. Both run the same timeline,
  // and it is the timeline that is under test here.
  for (const width of [390, 1280]) {
    test(`the factors light up one at a time, in order, at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width, { motion: true });
      await showDiagram(page);

      // 15s covers two full cycles (6.8s each), so the sequence is measured
      // whole no matter where in the loop the trace happened to start.
      const readings = await trace(page, { samples: 100, everyMs: 150 });

      const count = readings[0].lines.length;
      expect(count, "no drawable lines on screen in this layout").toBe(3);

      const peak = Array.from({ length: count }, (_, step) =>
        Math.max(...readings.map((reading) => reading.lines[step])),
      );
      const neverDrawn = peak
        .map((value, step) => ({ step, peak: Number(value.toFixed(3)) }))
        .filter((entry) => entry.peak < 0.98);
      expect(neverDrawn, "a line never draws itself green").toEqual([]);

      /*
       * "One at a time, in order" as a measurement: for every pair, there has to
       * be a moment where the earlier factor is drawn and the later one is not.
       * An animation that ran all three together, or ran them backwards, cannot
       * produce that moment -- and unlike an assertion on timestamps, this does
       * not care where in the cycle the trace began.
       */
      const gaps = [];
      for (let earlier = 0; earlier < count; earlier += 1) {
        for (let later = earlier + 1; later < count; later += 1) {
          const seen = readings.some(
            (reading) =>
              reading.lines[earlier] >= 0.9 && reading.lines[later] <= 0.1,
          );
          if (!seen) gaps.push(`${earlier} before ${later}`);
        }
      }
      expect(gaps, "these factors never showed one drawn while the next was not").toEqual([]);

      // The card lights with its line, and the hub pulses.
      const litRings = Array.from({ length: count }, (_, step) =>
        Math.max(...readings.map((reading) => reading.rings[step] ?? 0)),
      );
      expect(
        litRings.every((value) => value >= 0.9),
        `a card never lights up (peaks ${litRings.map((v) => v.toFixed(2)).join(", ")})`,
      ).toBe(true);

      const pulsed = readings.some((reading) =>
        reading.pulses.some((pulse) => pulse.opacity > 0.05 && pulse.scale > 1.05),
      );
      expect(pulsed, "the hub never pulses").toBe(true);

      /*
       * The decision is the last thing to happen, and the reason the hub rests
       * grey: it lights only once every factor has fed it. Stated as the
       * invariant rather than as a timestamp, so it holds wherever in the cycle
       * the trace began -- there must be no reading where the hub is green and
       * some line is not yet drawn.
       */
      const lit = readings.filter((reading) => reading.hub >= 0.9);
      expect(
        lit.length,
        "the hub never turns green, so the sequence never resolves",
      ).toBeGreaterThan(0);

      /*
       * "Not yet drawn" is measured at 0.5, not at 0.9, and the reset is why:
       * there the hub's green and the lines' layer fade together, on the same
       * duration and the same linear ease, so at 0.9 this would be comparing two
       * floats that are meant to be equal. Half-drawn is unambiguous, and the
       * failure this guards against -- the hub lighting on step one or two --
       * leaves the later lines at 0.
       */
      const early = lit.filter((reading) =>
        reading.lines.some((value) => value < 0.5),
      );
      expect(
        early.length,
        `the hub was green in ${early.length} readings where the circle was not yet closed`,
      ).toBe(0);
    });

    test(`the diagram stays at rest under reduced motion at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);
      await showDiagram(page);

      // Long enough that a loop nobody suppressed would have drawn a line.
      const readings = await trace(page, { samples: 20, everyMs: 200 });

      const moved = readings.filter(
        (reading) =>
          reading.lines.some((value) => value > 0.02) ||
          reading.rings.some((value) => value > 0.02) ||
          reading.pulses.some((pulse) => pulse.opacity > 0.02) ||
          reading.hub > 0.02,
      );

      expect(
        moved.length,
        `the diagram animated in ${moved.length} of ${readings.length} samples with reduced motion asked for`,
      ).toBe(0);
    });
  }
});
