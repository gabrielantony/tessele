import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * The institutional sentence after the Hero holds the centre of the screen with
 * CSS `position: sticky` and writes itself word by word as you scroll.
 *
 * Every assertion here is a measurement of that behaviour, taken the same way it
 * was taken off the reference this section was rebuilt against
 * (fathom.framer.media, measured 2026-09-01: 18 words, ~47px of scroll each,
 * exactly one word part-faded at any moment, held by sticky rather than a pin).
 * The easing and distance constants stay in the component -- they are design
 * decisions, and pinning them here would make the contract defend them. See
 * docs/failure-archetypes.md, "Contrato rigoroso sobre um valor que não deveria
 * existir".
 *
 * Scroll is driven from inside the page with requestAnimationFrame + scrollBy
 * rather than page.mouse.wheel: it gives the same velocity signal ScrollTrigger
 * reads, samples in the frame it scrolls, and behaves identically on the mobile
 * profile, where wheel emulation does not.
 */

const HEADING = 'h2[aria-label^="Ajudamos"]';

/*
 * ScrollTrigger disarms `anticipatePin` for the first half second after it
 * initialises -- `gsap.delayedCall(0.5, () => _startup = 0)` in
 * ScrollTrigger.js, guarded at the anticipation branch by `!_startup`. The
 * 80px entry lurch that pinning this section used to produce is therefore
 * invisible for 500ms, so a probe run against a freshly loaded page passes on
 * code that jumps.
 *
 * This is a precondition, not the measurement: it waits until the page has been
 * alive about as long as a reader takes to arrive here, which is the state the
 * defect lives in. The assertions stay measurements.
 */
const waitPastScrollTriggerStartup = (page) =>
  page.evaluate(
    (deadline) =>
      new Promise((resolve) => {
        // performance.now() counts from navigation start and ScrollTrigger
        // initialises within the first of those milliseconds, so this is an
        // absolute deadline: a slow load has already spent part of it.
        const remaining = deadline - performance.now();
        if (remaining <= 0) return resolve();
        setTimeout(resolve, remaining);
      }),
    900,
  );

/*
 * One dense pass over the whole reveal, sampling every frame: where the page is,
 * where the sentence is on screen, and each word's opacity. Everything below
 * reads from this, so the page is only walked once per test.
 */
const walkTheReveal = (page, pxPerFrame = 12) =>
  page.evaluate(
    async ([selector, pxPerFrame]) => {
      const heading = document.querySelector(selector);
      const section = heading.closest("section");
      const words = [...document.querySelectorAll("[data-word]")];
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;

      // Begin a little above the section so the arrival is inside the sample.
      window.scrollTo(0, Math.max(0, sectionTop - 200));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const frames = [];
      await new Promise((done) => {
        // Far enough to carry the sentence to complete and the sticky to release.
        const frameBudget = (section.offsetHeight + 400) / pxPerFrame;
        let frame = 0;
        const step = () => {
          frames.push({
            y: window.scrollY,
            headingTop: heading.getBoundingClientRect().top,
            opacities: words.map((w) => Number(getComputedStyle(w).opacity)),
          });
          if (frame++ > frameBudget) return done();
          window.scrollBy(0, pxPerFrame);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      return { sectionTop, sectionHeight: section.offsetHeight, wordCount: words.length, frames };
    },
    [HEADING, pxPerFrame],
  );

const FULL = 0.98;
const STARTED = 0.02;

test.describe("quote", () => {
  test("the held sentence never travels further than the page scrolls", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames } = await walkTheReveal(page);

    /*
     * A correct hold can never move the sentence FURTHER than the page scrolled:
     * while free it travels exactly the scroll delta, while held it travels
     * zero, and on the frame the two swap it lands between them. So the
     * invariant is one-sided, and a positive result is a jump the eye catches.
     * This is the guard that a `pin` is not reintroduced -- pinning swapped the
     * section to `position: fixed` and yanked it 80px up inside one frame.
     */
    let worst = { extra: -Infinity };
    for (let i = 1; i < frames.length; i += 1) {
      const scrolled = frames[i].y - frames[i - 1].y;
      const travelled = -(frames[i].headingTop - frames[i - 1].headingTop);
      const extra = travelled - scrolled;
      if (extra > worst.extra) worst = { extra, scrolled, travelled, atY: frames[i].y };
    }

    expect(
      Math.round(worst.extra),
      `the sentence jumped: it travelled ${Math.round(worst.travelled)}px while the page scrolled ${worst.scrolled}px at y=${worst.atY}`,
      // 2px of slack for sub-pixel layout rounding, nothing more.
    ).toBeLessThanOrEqual(2);
  });

  test("one word is in transit at a time", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, wordCount } = await walkTheReveal(page);
    expect(wordCount, "no words found").toBeGreaterThan(0);

    /*
     * The property that separated the reference from the first build of this
     * section. With ~70 letters part-faded at once the sentence reads as fog
     * lifting rather than words arriving, and all 70 carry the scroll's
     * unevenness simultaneously. The reference holds exactly one; two is the
     * allowance for landing on a boundary between adjacent words.
     */
    let worst = { count: 0 };
    for (const frame of frames) {
      const inTransit = frame.opacities.filter((o) => o > STARTED && o < FULL);
      if (inTransit.length > worst.count) worst = { count: inTransit.length, atY: frame.y };
    }

    expect(
      worst.count,
      `${worst.count} of ${wordCount} words were part-faded at once at y=${worst.atY}`,
    ).toBeLessThanOrEqual(2);
  });

  test("the sentence resolves at a steady pace, with no dead start", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, wordCount } = await walkTheReveal(page);

    const firstStart = frames.find((f) => f.opacities.some((o) => o > STARTED));
    const complete = frames.find((f) => f.opacities.every((o) => o >= FULL));
    expect(firstStart, "no word ever starts to appear").toBeTruthy();
    expect(complete, "the sentence never fully resolves").toBeTruthy();

    // Reading pace: scroll spent per word, between the first word starting and
    // the last one landing.
    const span = complete.y - firstStart.y;
    const perWord = span / (wordCount - 1);

    /*
     * The reference spends ~47px of scroll per word. Below ~20px the sentence
     * dumps itself faster than it can be read; above ~90px it is a chore. The
     * band is deliberately wide -- it rules out the two failure modes without
     * fixing the pace itself.
     */
    expect(
      Math.round(perWord),
      `the sentence spends ${Math.round(perWord)}px of scroll per word (${span}px for ${wordCount} words)`,
    ).toBeGreaterThanOrEqual(20);
    expect(
      Math.round(perWord),
      `the sentence spends ${Math.round(perWord)}px of scroll per word (${span}px for ${wordCount} words)`,
    ).toBeLessThanOrEqual(90);

    /*
     * No dead start. The previous build finished nothing at all until a fifth of
     * the hold had been spent, because the per-letter duration was 34 stagger
     * slots wide.
     */
    const startOffset = firstStart.y - frames[0].y;
    expect(
      startOffset,
      `nothing begins to appear until ${startOffset}px past the top of the section`,
    ).toBeLessThanOrEqual(400);

    /*
     * And the words arrive in order, monotonically -- no word un-reveals as you
     * keep scrolling forward.
     */
    const counts = frames.map((f) => f.opacities.filter((o) => o >= FULL).length);
    const firstIndex = frames.indexOf(firstStart);
    const completeIndex = frames.indexOf(complete);
    const regressions = [];
    for (let i = firstIndex + 1; i <= completeIndex; i += 1) {
      if (counts[i] < counts[i - 1]) regressions.push({ atY: frames[i].y, from: counts[i - 1], to: counts[i] });
    }
    expect(regressions, "words un-revealed while still scrolling forward").toEqual([]);
  });

  /*
   * The reveal used to be `window.innerHeight * 1.3` of scroll, so reading the
   * same 20 words cost 806px on a 620px-tall window against 1534px on a 1180px
   * one -- 1.9x the wheel for the same sentence. Reading distance is a property
   * of the sentence, not of the display. The section's runway stays proportional
   * to the viewport, as the reference's does; only the reading does not.
   */
  test("reading the sentence costs about the same scroll at any viewport height", async ({
    page,
  }) => {
    const measured = [];
    for (const height of [620, 900, 1180]) {
      await page.setViewportSize({ width: 1280, height });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("./", { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready.then(() => true));
      await waitPastScrollTriggerStartup(page);

      const { frames, wordCount } = await walkTheReveal(page);
      const firstStart = frames.find((f) => f.opacities.some((o) => o > STARTED));
      const complete = frames.find((f) => f.opacities.every((o) => o >= FULL));
      expect(firstStart && complete, `the sentence does not resolve at ${height}px tall`).toBeTruthy();

      measured.push({ height, span: complete.y - firstStart.y, wordCount });
    }

    const spans = measured.map((m) => m.span);
    const spread = Math.max(...spans) / Math.min(...spans);
    expect(
      spread,
      `reading costs ${spread.toFixed(2)}x more scroll on the tallest viewport than the shortest: ${measured
        .map((m) => `${m.height}px tall -> ${m.span}px of scroll`)
        .join(", ")}`,
    ).toBeLessThanOrEqual(1.35);
  });

  test("reduced motion gets the whole sentence, legible and unheld", async ({ page }) => {
    // gotoLanding defaults to reduced motion.
    await gotoLanding(page, 1280);

    const state = await page.evaluate((selector) => {
      const section = document.querySelector(selector).closest("section");
      const words = [...document.querySelectorAll("[data-word]")];
      return {
        // A GSAP pin would wrap the section in a spacer. Sticky never does.
        pinned: section.parentElement.classList.contains("pin-spacer"),
        faded: words.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
        blurred: words.filter((el) => /blur\((?!0px)/.test(getComputedStyle(el).filter)).length,
        total: words.length,
      };
    }, HEADING);

    expect(state.total, "no words found").toBeGreaterThan(0);
    expect(state.pinned, "the section hijacks scroll with a pin under reduced motion").toBe(false);
    expect(state.faded, "words left faded under reduced motion").toBe(0);
    expect(state.blurred, "words left blurred under reduced motion").toBe(0);
  });
});
