import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * The seam between the Hero and the Quote section: five accent panels hold the
 * viewport and fall, centre column first, while the Hero scrolls out beneath them,
 * until the screen is the Quote's own ground colour and the curtain releases.
 *
 * Every assertion here is a measurement of that behaviour. The easing, the
 * fraction of the runway each phase gets and the panel widths stay in the
 * component -- they are design decisions, and pinning them here would make the
 * contract defend them rather than defend the reader. See
 * docs/failure-archetypes.md, "Contrato rigoroso sobre um valor que não deveria
 * existir".
 *
 * Scroll is driven from inside the page with requestAnimationFrame + scrollBy,
 * for the same reason quote.spec.mjs does it: it gives ScrollTrigger the velocity
 * signal it reads, samples in the frame it scrolls, and behaves identically on the
 * mobile profile, where wheel emulation does not.
 */

const PANEL = "[data-curtain-panel]";
const RUNWAY = "[data-curtain-runway]";
/*
 * The Hero's own box, not anything inside it. The content blocks are what the
 * curtain animates `y` on, so measuring the headline would read the exit tween's
 * 40px of travel as the Hero jumping.
 */
const HERO = "section:has(h1)";

// See quote.spec.mjs: ScrollTrigger disarms part of itself for the first 500ms
// after it initialises, so a probe against a freshly loaded page can pass on code
// that jumps for a real reader.
const waitPastScrollTriggerStartup = (page) =>
  page.evaluate(
    (deadline) =>
      new Promise((resolve) => {
        const remaining = deadline - performance.now();
        if (remaining <= 0) return resolve();
        setTimeout(resolve, remaining);
      }),
    900,
  );

/*
 * One pass over the whole transition, sampling every frame: where the page is,
 * where the Hero's headline sits on screen, how much runway is left, and each
 * visible panel's vertical scale. Everything below reads from this, so the page is
 * only walked once per test.
 */
const walkTheCurtain = (page, pxPerFrame = 12) =>
  page.evaluate(
    async ([panelSelector, runwaySelector, heroSelector, pxPerFrame]) => {
      const runway = document.querySelector(runwaySelector);
      const hero = document.querySelector(heroSelector);

      // Left-to-right, so index 0 is the leftmost panel and the middle index is
      // the centre column the stagger starts from.
      const panels = [...document.querySelectorAll(panelSelector)]
        .filter((panel) => panel.getBoundingClientRect().width > 0)
        .sort(
          (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
        );

      // scaleY reads from `d` in matrix(a, b, c, d, tx, ty).
      const scaleY = (el) => {
        const transform = getComputedStyle(el).transform;
        if (transform === "none") return 1;
        const parts = transform.match(/matrix\(([^)]+)\)/);
        return parts ? Number(parts[1].split(",")[3]) : 1;
      };

      const curtain = panels.length ? panels[0].parentElement : null;

      const runwayTop = runway.getBoundingClientRect().top + window.scrollY;
      const viewport = window.innerHeight;

      // The hold engages when the runway's top reaches the bottom of the
      // viewport. Start a little before that, so the whole thing is in the sample.
      window.scrollTo(0, Math.max(0, runwayTop - viewport - 200));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const frames = [];
      await new Promise((done) => {
        const frameBudget = (viewport + 600) / pxPerFrame;
        let frame = 0;
        const step = () => {
          frames.push({
            y: window.scrollY,
            heroTop: hero.getBoundingClientRect().top,
            // Reaching the bottom of the viewport means the runway is spent and
            // the hold has let go.
            runwayBottom: runway.getBoundingClientRect().bottom,
            curtainTop: curtain ? Math.round(curtain.getBoundingClientRect().top) : null,
            scales: panels.map(scaleY),
            // Alpha of each panel's hairline; 0 means it has been faded out.
            hairlines: panels.map((panel) => {
              const colour = getComputedStyle(panel).borderLeftColor;
              const alpha = colour.match(/rgba?\(([^)]+)\)/);
              if (!alpha) return 1;
              const parts = alpha[1].split(",");
              return parts.length > 3 ? Number(parts[3]) : 1;
            }),
          });
          if (frame++ > frameBudget) return done();
          window.scrollBy(0, pxPerFrame);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      return { panelCount: panels.length, viewport, frames };
    },
    [PANEL, RUNWAY, HERO, pxPerFrame],
  );

const FULL = 0.99;

test.describe("curtain", () => {
  test("the Hero never travels further than the page scrolls", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames } = await walkTheCurtain(page);

    /*
     * The same one-sided invariant QuoteSection is held to, and for the same
     * reason: while free the Hero travels exactly the scroll delta, while held it
     * travels zero, and on the frame the two swap it lands between them. Anything
     * positive is a jump the eye catches -- which is what a GSAP `pin` produces
     * here, since it swaps the element to `position: fixed` inside one frame.
     */
    let worst = { extra: -Infinity };
    for (let i = 1; i < frames.length; i += 1) {
      const scrolled = frames[i].y - frames[i - 1].y;
      const travelled = -(frames[i].heroTop - frames[i - 1].heroTop);
      const extra = travelled - scrolled;
      if (extra > worst.extra) worst = { extra, scrolled, travelled, atY: frames[i].y };
    }

    expect(
      Math.round(worst.extra),
      `the Hero jumped: it travelled ${Math.round(worst.travelled)}px while the page scrolled ${worst.scrolled}px at y=${worst.atY}`,
      // 2px of slack for sub-pixel layout rounding, nothing more.
    ).toBeLessThanOrEqual(2);
  });

  test("the curtain holds the top of the viewport while it falls", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, viewport } = await walkTheCurtain(page);

    /*
     * The mirror of the test above, which on its own would pass on a page where
     * nothing holds anything. Something has to stay put while the reader scrolls,
     * and here it is the curtain rather than the Hero: `sticky top-0` on a box
     * that is exactly one viewport tall, which is the case sticky handles without
     * caveat at every screen size.
     *
     * If it ever came unstuck the panels would fall on a screen that is scrolling
     * away underneath them, and the shut curtain would arrive somewhere other than
     * over the viewport -- which is the seam with the Quote section coming apart.
     */
    const started = frames.findIndex((frame) => frame.scales.some((scale) => scale > 0.02));
    const shut = frames.findIndex((frame) => frame.scales.every((scale) => scale >= FULL));
    expect(started, "the curtain never starts to fall").toBeGreaterThanOrEqual(0);
    expect(shut, "the curtain never shuts").toBeGreaterThan(started);

    const held = frames.slice(started, shut + 1);
    const scrolled = held[held.length - 1].y - held[0].y;
    expect(scrolled, "no scroll was spent on the curtain at all").toBeGreaterThan(
      viewport / 4,
    );

    const adrift = held.filter((frame) => Math.abs(frame.curtainTop) > 1);
    expect(
      adrift.length,
      `the curtain came unstuck on ${adrift.length} of ${held.length} frames, worst at y=${adrift[0]?.y} with its top at ${adrift[0]?.curtainTop}px`,
    ).toBe(0);
  });

  /*
   * The curtain has to be shut before the Hero is let go, because the moment it
   * lets go is the moment the Quote section takes the screen, and the two are only
   * seamless because both are already the same colour edge to edge.
   *
   * This is the assertion that catches the runway and the timeline drifting apart.
   * They are one quantity: the runway is `h-dvh` in CSS, and the ScrollTrigger
   * derives its range from that same element rather than restating the length in
   * JS. Restating it is what would break this.
   */
  test("the curtain is shut before the hold releases", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, viewport, panelCount } = await walkTheCurtain(page);
    expect(panelCount, "no panels found").toBeGreaterThan(0);

    const release = frames.find((frame) => frame.runwayBottom <= viewport + 1);
    expect(release, "the hold never releases inside the walk").toBeTruthy();

    const open = release.scales
      .map((scale, index) => ({ scale, index }))
      .filter(({ scale }) => scale < FULL);

    expect(
      open,
      `panels ${open.map((p) => p.index).join(", ")} were still open at the release (scales ${release.scales.map((s) => s.toFixed(2)).join(", ")})`,
    ).toEqual([]);
  });

  /*
   * The hairlines are structure while the panels are moving -- same-coloured
   * panels touching read as one block, and the lines are what make the stagger
   * legible. Once the curtain is shut they are debris on what is by then just the
   * Quote section's ground, and they take a whole viewport to scroll up and off.
   * That travel is the only thing moving on the screen at that point, so it reads
   * as the transition still running and the sentence feels late for it.
   */
  test("no hairline survives the handover", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, viewport } = await walkTheCurtain(page);

    const shut = frames.find((frame) => frame.scales.every((scale) => scale >= FULL));
    expect(shut, "the curtain never shuts").toBeTruthy();

    // They have to still be there while it is falling, or they are not doing the
    // job they exist for.
    const midFall = frames.find(
      (frame) =>
        frame.scales.some((scale) => scale > 0.2) &&
        frame.scales.some((scale) => scale < 0.8),
    );
    expect(midFall, "the panels never overlap mid-fall").toBeTruthy();
    expect(
      Math.max(...midFall.hairlines),
      "the hairlines are already gone while the panels are still moving, so the stagger has nothing to read against",
    ).toBeGreaterThan(0.1);

    const release = frames.find((frame) => frame.runwayBottom <= viewport + 1);
    expect(release, "the hold never releases inside the walk").toBeTruthy();
    expect(
      Math.max(...release.hairlines),
      `hairlines were still painted at the handover (alphas ${release.hairlines.map((a) => a.toFixed(2)).join(", ")}), so they scroll up over the Quote's ground`,
    ).toBeLessThanOrEqual(0.02);
  });

  test("the panels land centre first and edges last", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, panelCount } = await walkTheCurtain(page);
    expect(panelCount, "fewer than three panels, so there is no centre").toBeGreaterThanOrEqual(3);

    // Scroll position at which each panel first reads as fully down.
    const landedAt = Array.from({ length: panelCount }, (_, index) => {
      const frame = frames.find((f) => f.scales[index] >= FULL);
      return frame ? frame.y : Infinity;
    });

    expect(
      landedAt.every(Number.isFinite),
      `panels ${landedAt.map((y, i) => (Number.isFinite(y) ? null : i)).filter((i) => i !== null).join(", ")} never landed`,
    ).toBe(true);

    const centre = Math.floor(panelCount / 2);
    const edges = [0, panelCount - 1];

    /*
     * The gesture is the stagger. If the centre does not lead, the panels are
     * falling together and the curtain reads as one block dropping -- which is
     * the version this borrowed its choreography from specifically is not.
     */
    for (const edge of edges) {
      expect(
        landedAt[centre],
        `the centre panel landed at y=${landedAt[centre]}, not before the edge panel at y=${landedAt[edge]}`,
      ).toBeLessThan(landedAt[edge]);
    }
  });

  test("the shut curtain tiles the viewport with no holes", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });

    const tiling = await page.evaluate((selector) => {
      const boxes = [...document.querySelectorAll(selector)]
        .map((panel) => panel.getBoundingClientRect())
        .filter((box) => box.width > 0)
        .sort((a, b) => a.left - b.left);

      const gaps = [];
      for (let i = 1; i < boxes.length; i += 1) {
        gaps.push(Math.round(boxes[i].left - boxes[i - 1].right));
      }

      return {
        count: boxes.length,
        left: Math.round(boxes[0].left),
        right: Math.round(boxes[boxes.length - 1].right),
        viewport: window.innerWidth,
        gaps,
      };
    }, PANEL);

    expect(tiling.count, "no panels found").toBeGreaterThan(0);
    expect(
      tiling.gaps.filter((gap) => gap !== 0),
      "the panels do not touch, so the shut curtain has holes in it",
    ).toEqual([]);
    expect(tiling.left, "the curtain does not reach the left edge").toBeLessThanOrEqual(0);
    expect(
      tiling.right,
      `the curtain stops ${tiling.viewport - tiling.right}px short of the right edge`,
    ).toBeGreaterThanOrEqual(tiling.viewport - 1);
  });

  /*
   * The trigger's range is derived from the runway, and the runway's top edge is
   * the Hero's bottom edge -- so `top bottom` resolves to a *negative* scroll
   * position whenever the Hero is shorter than the viewport. The browser clamps
   * the scroll at zero; the scrub does not clamp the progress, so the page loads
   * with the transition already part-way through and the reader never sees its
   * first frames.
   *
   * The Hero's own height is the only thing standing between the two: it has to
   * yield at least one viewport at every width, not just where a breakpoint says
   * so. Measured below `lg` against the helper's 900px height, which is the case
   * that broke -- the Hero stopped at a fixed 780px there, and the content loaded
   * already faded and lifted.
   */
  test("the curtain has not begun before the reader scrolls", async ({ page }) => {
    for (const width of [390, 768, 1280]) {
      await gotoLanding(page, width, { motion: true });

      const atRest = await page.evaluate(
        ([panelSelector, runwaySelector]) => {
          const runway = document.querySelector(runwaySelector);
          const scaleY = (el) => {
            const transform = getComputedStyle(el).transform;
            if (transform === "none") return 0;
            const parts = transform.match(/matrix\(([^)]+)\)/);
            return parts ? Number(parts[1].split(",")[3]) : 0;
          };

          return {
            scrollY: window.scrollY,
            viewport: window.innerHeight,
            runwayTop: runway.getBoundingClientRect().top + window.scrollY,
            scales: [...document.querySelectorAll(panelSelector)]
              .filter((panel) => panel.getBoundingClientRect().width > 0)
              .map(scaleY),
            content: [...document.querySelectorAll("[data-hero-content]")].map(
              (block) => Number(getComputedStyle(block).opacity),
            ),
          };
        },
        [PANEL, RUNWAY],
      );

      expect(atRest.scrollY, "the page did not load at the top").toBe(0);

      /*
       * The invariant behind the symptom, asserted directly: the scroll position
       * where the transition starts is `runwayTop - viewport`, and it may not be
       * negative. Reading the geometry rather than only the rendered state is
       * what makes a failure here say *why* it failed.
       */
      expect(
        Math.round(atRest.runwayTop - atRest.viewport),
        `at ${width}px the curtain's range starts ${Math.round(atRest.viewport - atRest.runwayTop)}px above the top of the page, so it is already running on load`,
      ).toBeGreaterThanOrEqual(0);

      expect(
        Math.max(...atRest.scales),
        `at ${width}px a panel is already up before any scroll (scales ${atRest.scales.map((s) => s.toFixed(2)).join(", ")})`,
      ).toBeLessThanOrEqual(0.001);

      expect(
        Math.min(...atRest.content),
        `at ${width}px the Hero's content is already leaving before any scroll (opacities ${atRest.content.map((o) => o.toFixed(2)).join(", ")})`,
      ).toBe(1);
    }
  });

  /*
   * Five panels at 375px would be 75px each -- too narrow to read as panels, and
   * the centre-out stagger becomes noise. Three is the answer below `md`, and the
   * count has to be odd at both widths or there is no centre column for the
   * stagger to start from.
   */
  test("the panel count drops below md and stays odd", async ({ page }) => {
    const counted = [];
    for (const width of [390, 768, 1280]) {
      await gotoLanding(page, width, { motion: true });
      counted.push({
        width,
        /*
         * Counted by width, not by Playwright's `:visible`, which reads the
         * bounding box -- and a panel waiting at `scaleY(0)` has no height, which
         * is precisely the state the curtain sits in before it falls. Width is
         * what `display: none` actually takes away.
         */
        panels: await page.evaluate(
          (selector) =>
            [...document.querySelectorAll(selector)].filter(
              (panel) => panel.getBoundingClientRect().width > 0,
            ).length,
          PANEL,
        ),
      });
    }

    for (const { width, panels } of counted) {
      expect(panels % 2, `${panels} panels at ${width}px leaves no centre column`).toBe(1);
      expect(panels, `only ${panels} panels at ${width}px`).toBeGreaterThanOrEqual(3);
    }

    const narrow = counted.find((entry) => entry.width === 390).panels;
    const wide = counted.find((entry) => entry.width === 1280).panels;
    expect(
      narrow,
      `${narrow} panels at 390px is not fewer than the ${wide} at 1280px, so each is under 80px wide`,
    ).toBeLessThan(wide);
  });

  /*
   * The Hero scrolls out from under the curtain rather than being held, so for
   * most of the fall what is behind the panels is the runway, not the Hero. The
   * two have to be the same ground or the reader watches a cream field turn into a
   * differently-cream field halfway through -- a seam where the whole point is
   * that there is none.
   */
  test("the runway is the same ground as the Hero", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });

    const grounds = await page.evaluate(
      ([runwaySelector, heroSelector]) => {
        const runway = document.querySelector(runwaySelector);
        const hero = document.querySelector(heroSelector);
        return {
          runway: getComputedStyle(runway).backgroundColor,
          hero: getComputedStyle(hero).backgroundColor,
        };
      },
      [RUNWAY, HERO],
    );

    expect(
      grounds.runway,
      `the runway is ${grounds.runway} where the Hero is ${grounds.hero}`,
    ).toBe(grounds.hero);
  });

  test("reduced motion gets no curtain and pays no scroll for it", async ({ page }) => {
    // gotoLanding defaults to reduced motion.
    await gotoLanding(page, 1280);

    const still = await page.evaluate((panelSelector) => ({
      // Width again, for the reason given in the panel-count test above.
      visiblePanels: [...document.querySelectorAll(panelSelector)].filter(
        (panel) => panel.getBoundingClientRect().width > 0,
      ).length,
      pageHeight: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
    }), PANEL);

    expect(
      still.visiblePanels,
      `${still.visiblePanels} curtain panels are painted under reduced motion`,
    ).toBe(0);

    await gotoLanding(page, 1280, { motion: true });
    const moving = await page.evaluate(() => document.documentElement.scrollHeight);

    /*
     * The runway is exactly one viewport, and `motion-reduce:hidden` removes it
     * rather than shortening it. So a reader who asked for less motion also gets a
     * page one screen shorter, and the whole cost of the effect is accounted for.
     */
    const extra = moving - still.pageHeight;
    expect(
      Math.abs(extra - still.viewport),
      `the effect costs ${extra}px of extra scroll, not the one viewport (${still.viewport}px) it should`,
    ).toBeLessThanOrEqual(4);
  });
});
