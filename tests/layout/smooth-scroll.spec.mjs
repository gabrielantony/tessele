import { expect, test } from "@playwright/test";

/*
 * The page scrolls through Lenis (src/components/SmoothScroll.tsx), which
 * interpolates the scroll position toward wherever the input asked for instead
 * of jumping there. Every scroll-linked section reads that position, so this is
 * page-wide behaviour and it gets a page-wide contract.
 *
 * Two of the three assertions here are about the accessibility guarantee, and
 * that is the reason this file exists rather than a comment in the component:
 * hijacking scroll is exactly the kind of motion `prefers-reduced-motion` is
 * about, and a regression would be invisible -- the page would still scroll,
 * just not the way the reader asked it to.
 */

const gotoLanding = async (page, { motion }) => {
  await page.emulateMedia({ reducedMotion: motion ? "no-preference" : "reduce" });
  await page.goto("./", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  // Lenis measures the document on init; let the webfont settle first.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve())),
  );
};

/*
 * Give one wheel tick and record the scroll position every frame until it comes
 * to rest, then report how many frames the trip took. Damped scroll ramps over
 * dozens of frames; scroll that tracks the input device lands in a handful.
 *
 * Counting frames rather than milliseconds is deliberate: the property is how
 * many paints the reader sees the position move across, which is what makes it
 * look smooth or stepped, and it does not drift with machine speed.
 */
const framesToSettle = async (page, delta = 400) => {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__trace = [];
    const tick = () => {
      window.__trace.push(Math.round(window.scrollY));
      if (window.__trace.length < 120) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(1400);

  return page.evaluate(() => {
    const trace = window.__trace;
    const rest = trace[trace.length - 1];
    const moved = trace.findIndex((v) => v > 0);
    const settled = trace.findIndex((v) => Math.abs(v - rest) <= 2);
    return { moved, settled, frames: settled - moved, rest, head: trace.slice(moved, moved + 12) };
  });
};

const hasFinePointer = (page) =>
  page.evaluate(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches);

test.describe("smooth scroll", () => {
  test("Lenis is wired up on the document", async ({ page }) => {
    await gotoLanding(page, { motion: true });

    // Lenis puts this class on its wrapper itself, so it is evidence the
    // instance constructed and attached, not that the markup mentions it.
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  });

  test("reduced motion gets scroll that tracks the input device", async ({ page }) => {
    await gotoLanding(page, { motion: false });

    if (!(await hasFinePointer(page))) {
      // No wheel on this profile, and `syncTouch` is off, so touch scrolling was
      // never taken over in the first place. Nothing to measure.
      test.skip(true, "no wheel input on this profile");
    }

    const { frames, rest, head } = await framesToSettle(page);

    /*
     * Lenis's own `respectReducedMotion` is what delivers this: inside
     * `scrollTo` it forces `lerp` to 1 for non-programmatic scrolls, so the
     * position goes straight to the target. Asserting the effect rather than the
     * option, because the option defaulting to true is exactly the kind of thing
     * a future config edit turns off without noticing.
     */
    expect(
      frames,
      `scroll took ${frames} frames to settle at ${rest}px under reduced motion, so it is still being smoothed (trace: ${head.join(" ")})`,
    ).toBeLessThanOrEqual(8);
  });

  test("motion gets scroll that is damped rather than stepped", async ({ page }) => {
    await gotoLanding(page, { motion: true });

    if (!(await hasFinePointer(page))) {
      test.skip(true, "no wheel input on this profile");
    }

    const { frames, rest, head } = await framesToSettle(page);

    /*
     * The point of the whole thing: one wheel notch has to arrive over many
     * paints, because a scroll-scrubbed animation shows every step it is handed.
     * At lerp 0.1 each frame closes a tenth of the remaining gap, which is
     * ~35-40 frames to within 2px. The floor is set well below that -- it rules
     * out "not damped at all" without pinning the lerp value, which is a design
     * decision and lives in the component.
     */
    expect(
      frames,
      `scroll settled in ${frames} frames at ${rest}px, which is not damped (trace: ${head.join(" ")})`,
    ).toBeGreaterThanOrEqual(15);

    /*
     * And it has to actually arrive. A lerp that never converges, or a wheel
     * event Lenis swallowed, both leave the reader stuck.
     */
    expect(rest, "one wheel tick did not move the page").toBeGreaterThan(100);
  });
});
