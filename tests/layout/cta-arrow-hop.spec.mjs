import { expect, test } from "@playwright/test";

import { canHover, gotoLanding } from "./sections/helpers.mjs";

/*
 * The arrow's idle hop -- the small recurring nudge that asks for the click.
 *
 * Measured rather than inspected. The failure this suite exists for is the one
 * that leaves the source looking right: the hop and the hover nudge both drive
 * translateX, and if they ever shared an element one would overwrite the other
 * and park the arrow mid-travel. Reading the class names, the constants or the
 * timeline back would confirm nothing about that -- only the composited
 * transform of each element, sampled while both are live, does.
 */

const HOVER_TRAVEL = 4;

// The hop's own cycle: a rest beat of phi^2 plus two hops of phi^-3 out and
// phi^-2 back. A window has to be longer than that to be sure it saw a peak,
// whatever phase the page happened to be in when sampling started.
const CYCLE_MS = 3854;

const HERO_CTA = "[data-cta-button]";
const HOP = `${HERO_CTA} [data-cta-arrow-hop]`;
const ARROW = `${HERO_CTA} [data-cta-arrow]`;

/*
 * Samples every frame from inside the page and returns the whole series in one
 * round trip. Polling over the wire instead would spend most of the window in
 * IPC and could step straight over a 236ms hop.
 */
const translateXSeries = (page, selector, windowMs) =>
  page.evaluate(
    ([sel, duration]) =>
      new Promise((resolve) => {
        const element = document.querySelector(sel);
        if (!element) {
          resolve(null);
          return;
        }

        const samples = [];
        const started = performance.now();
        const read = () => {
          const transform = getComputedStyle(element).transform;
          // matrix(a, b, c, d, tx, ty) -- the translation is the fifth value.
          samples.push(
            transform === "none"
              ? 0
              : Number(transform.slice(7, -1).split(",")[4]),
          );

          if (performance.now() - started < duration) {
            requestAnimationFrame(read);
          } else {
            resolve(samples);
          }
        };

        requestAnimationFrame(read);
      }),
    [selector, windowMs],
  );

test.describe("cta arrow idle hop", () => {
  test("the arrow leaves rest and returns, without reaching the hover travel", async ({
    page,
  }) => {
    await gotoLanding(page, 1280, { motion: true });

    const series = await translateXSeries(page, HOP, CYCLE_MS + 600);
    expect(series, "the hop wrapper is not in the markup").not.toBeNull();

    const peak = Math.max(...series);
    const trough = Math.min(...series);

    /*
     * A hop that never moves and a hop that never comes back both read as a
     * static arrow in a screenshot, so both directions are asserted. 1.4px is
     * under the smaller of the two hops (phi^-1 of 4px, then phi^-1 again) and
     * above the noise of a subpixel-rounded matrix.
     */
    expect(peak, "the arrow never left its rest position").toBeGreaterThan(1.4);
    expect(
      series.some((x) => Math.abs(x) < 0.05),
      "the arrow moved but never came back to rest",
    ).toBe(true);

    /*
     * The hover nudge travels 4px and means "the pointer is on this button". An
     * idle hop that matched or passed it would spend the interaction saying the
     * same thing as the resting state.
     */
    expect(
      peak,
      "the idle hop travels as far as the hover nudge, so hover stops reading as a state change",
    ).toBeLessThan(HOVER_TRAVEL);
    expect(trough, "the hop overshoots backwards").toBeGreaterThan(-0.05);
  });

  test("the pointer arriving leaves exactly one animation on the arrow", async ({
    page,
  }) => {
    await gotoLanding(page, 1280, { motion: true });

    /*
     * Which animation that is depends on the profile, because the button
     * refuses hover where a pointer cannot rest on it: `pointerenter` fires on
     * a tap and the matching `pointerleave` frequently never does, so anything
     * hover took there would stick. Both branches assert the same property from
     * opposite sides -- one owner of `x`, and no offset left behind by the other.
     */
    const hoverable = await canHover(page);

    await page.locator(HERO_CTA).first().hover();
    // Long enough for the hop to scrub back (phi^-2) and the nudge to arrive.
    await page.waitForTimeout(700);

    if (!hoverable) {
      /*
       * A whole cycle, not the 1200ms the cursor branch samples: the hop rests
       * for phi^2 of every phi^2 + 2(phi^-3 + phi^-2) seconds, so a short window
       * lands inside the rest beat and reads a running hop as a stopped one.
       * That is not hypothetical -- 1200ms here reported max|x| = 0 on the
       * iPhone profile while the same page measured 2.47px across a full cycle.
       */
      const idle = await translateXSeries(page, HOP, CYCLE_MS + 600);
      const parked = await translateXSeries(page, ARROW, 300);

      expect(
        Math.max(...idle),
        "the hop stopped for a pointer that cannot hover, and no pointerleave is coming to restart it",
      ).toBeGreaterThan(1.4);
      expect(
        Math.max(...parked.map((x) => Math.abs(x))),
        "the arrow took the hover nudge on a touch profile, where it would stick at 4px",
      ).toBeLessThan(0.05);
      return;
    }

    const hop = await translateXSeries(page, HOP, 1200);
    const arrow = await translateXSeries(page, ARROW, 300);

    /*
     * This is the pair that proves the two animations are on separate elements.
     * Sharing one would show up here as a wrapper still hopping under a nudged
     * arrow, or as a nudge that never reaches 4px because the loop keeps
     * resetting it.
     */
    expect(
      Math.max(...hop.map((x) => Math.abs(x))),
      "the hop kept running while the pointer was on the button",
    ).toBeLessThan(0.05);
    expect(
      Math.min(...arrow),
      "the hover nudge did not reach its travel while the hop was paused",
    ).toBeGreaterThan(HOVER_TRAVEL - 0.05);
  });

  test("reduced motion gets no hop at all", async ({ page }) => {
    // gotoLanding emulates `prefers-reduced-motion: reduce` unless told otherwise.
    await gotoLanding(page, 1280);

    const series = await translateXSeries(page, HOP, CYCLE_MS + 600);

    expect(
      Math.max(...series.map((x) => Math.abs(x))),
      "the arrow hops for a visitor who asked for no motion",
    ).toBeLessThan(0.05);
  });
});
