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

      // The sentence the curtain hands over to. Sampled here because the seam is
      // where the handover is legible: the panels landing and the first word
      // lighting are one gesture to the reader, and only one walk sees both.
      const words = [...document.querySelectorAll("[data-word]")];

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
            firstWord: words.length
              ? Number(getComputedStyle(words[0]).opacity)
              : null,
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
   * The curtain paints its ground and nothing else -- no seam between the panels,
   * at any point in the fall.
   *
   * This replaces an assertion that measured the seam's colour and required it to
   * have faded to alpha 0 by the handover. That is a proxy, and it passed on the
   * behaviour it was meant to prevent: a fade is not a removal, so the line was
   * painted for the whole fall and then for as long as the shut curtain took to
   * scroll off -- up to a viewport of travel with nothing else moving. Gabriel
   * asked for the seam to go (2026-09-02), so the guarantee changes with it: not
   * "the line is gone in time" but "there is no line".
   *
   * Asserted against every edge a seam could come back as, rather than against
   * `border-left` alone: the next version of this idea would be a box-shadow or
   * an outline, and it would read as a design choice in the diff.
   */
  test("the panels paint no seam between them", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const edges = await page.evaluate(
      async ([panelSelector, runwaySelector]) => {
        const runway = document.querySelector(runwaySelector);
        const panels = [...document.querySelectorAll(panelSelector)].filter(
          (panel) => panel.getBoundingClientRect().width > 0,
        );

        const alpha = (colour) => {
          const parts = colour.match(/rgba?\(([^)]+)\)/);
          if (!parts) return 1;
          const channels = parts[1].split(",");
          return channels.length > 3 ? Number(channels[3]) : 1;
        };

        const painted = (panel) => {
          const style = getComputedStyle(panel);
          const found = [];
          for (const side of ["Left", "Right", "Top", "Bottom"]) {
            if (
              parseFloat(style[`border${side}Width`]) > 0 &&
              alpha(style[`border${side}Color`]) > 0.02
            ) {
              found.push(
                `border-${side.toLowerCase()} ${style[`border${side}Width`]} ${style[`border${side}Color`]}`,
              );
            }
          }
          if (style.boxShadow && style.boxShadow !== "none") {
            found.push(`box-shadow ${style.boxShadow}`);
          }
          /*
           * `outline-style` and not width alone: the page declares a focus ring
           * width globally, so `outline-width` computes to 3px on every element
           * on the page whether or not anything is painted. Width without a
           * style paints nothing.
           */
          if (
            style.outlineStyle !== "none" &&
            parseFloat(style.outlineWidth) > 0 &&
            alpha(style.outlineColor) > 0.02
          ) {
            found.push(
              `outline ${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
            );
          }
          return found;
        };

        // Walked rather than sampled at rest: the seam this replaces was written
        // by a tween, so a single reading at the top of the page would have seen
        // whatever the CSS said and none of what the timeline did.
        const runwayTop = runway.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, Math.max(0, runwayTop - window.innerHeight - 200));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const seen = [];
        await new Promise((done) => {
          const budget = (window.innerHeight * 2 + 600) / 12;
          let frame = 0;
          const step = () => {
            for (const panel of panels) {
              for (const edge of painted(panel)) {
                seen.push({ y: Math.round(window.scrollY), edge });
              }
            }
            if (frame++ > budget) return done();
            window.scrollBy(0, 12);
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });

        return { panelCount: panels.length, seen: seen.slice(0, 8), total: seen.length };
      },
      [PANEL, RUNWAY],
    );

    expect(edges.panelCount, "no panels found").toBeGreaterThan(0);
    expect(
      edges.seen,
      `a panel painted an edge on ${edges.total} readings across the fall, first at y=${edges.seen[0]?.y}: ${edges.seen[0]?.edge}`,
    ).toEqual([]);
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

  /*
   * The panels must cover the width between them, and "touch exactly" is not
   * the way to ask for it. That was the previous assertion and it passed for
   * the whole life of a bug it was written to catch: it rounds, and at 1512px
   * the fifth of a viewport is 302.4px, so a panel ending at 604.8 and the next
   * starting at 604.8 round to a gap of zero while the rendered pixels have a
   * 1px column that neither of them paints.
   *
   * So the layout numbers are asked the one question they can answer -- is
   * there a gap, overlap allowed -- and the pixels are asked the real one,
   * below.
   */
  test("the shut curtain tiles the viewport with no holes", async ({ page }) => {
    for (const width of [1280, 1512]) {
      await gotoLanding(page, width, { motion: true });

      const tiling = await page.evaluate((selector) => {
        const boxes = [...document.querySelectorAll(selector)]
          .map((panel) => panel.getBoundingClientRect())
          .filter((box) => box.width > 0)
          .sort((a, b) => a.left - b.left);

        const gaps = [];
        for (let i = 1; i < boxes.length; i += 1) {
          // Unrounded: rounding is what hid the sub-pixel gap.
          gaps.push(Number((boxes[i].left - boxes[i - 1].right).toFixed(2)));
        }

        return {
          count: boxes.length,
          left: Math.round(boxes[0].left),
          right: Math.round(boxes[boxes.length - 1].right),
          viewport: window.innerWidth,
          gaps,
        };
      }, PANEL);

      expect(tiling.count, `no panels found at ${width}px`).toBeGreaterThan(0);

      /*
       * Overlap is the answer rather than a tolerated accident: the panels are
       * one colour, so a pixel of it cannot be seen, and no viewport width
       * leaves a hole.
       */
      expect(
        tiling.gaps.filter((gap) => gap > 0),
        `at ${width}px the panels leave gaps of ${tiling.gaps.join(", ")}px between them`,
      ).toEqual([]);
      expect(
        tiling.left,
        `at ${width}px the curtain does not reach the left edge`,
      ).toBeLessThanOrEqual(0);
      expect(
        tiling.right,
        `at ${width}px the curtain stops ${tiling.viewport - tiling.right}px short of the right edge`,
      ).toBeGreaterThanOrEqual(tiling.viewport - 1);
    }
  });

  /*
   * And the same question asked of the pixels, which is where this defect
   * actually lived: twice now a line has appeared between the panels that no
   * assertion on colours, borders or layout boxes could see. What showed
   * through was the runway's own `bg-canvas`, at full strength -- a bright
   * cream streak on the accent field, running the height of the curtain.
   *
   * 1512px is the width that provokes it (a fifth is 302.4px, so two of the
   * four seams round outward on both sides); 1280px is the control, where the
   * same layout divides exactly and nothing shows however it is built. Both are
   * measured, so a fix that only works on round numbers still fails here.
   *
   * The screenshot is drawn into a canvas in the page rather than compared to a
   * stored image: this asks whether a light column exists at all, which is the
   * property, and it does not have to be updated every time the type or the
   * blooms change.
   */
  test("no seam shows through between the panels", async ({ page }) => {
    for (const width of [1512, 1280]) {
      await gotoLanding(page, width, { motion: true });
      await waitPastScrollTriggerStartup(page);

      // Shut, and scrolling away: the state the streak was reported in.
      const marks = await page.evaluate((selector) => {
        const runway = document.querySelector(selector);
        return {
          runwayTop: runway.getBoundingClientRect().top + window.scrollY,
          viewport: window.innerHeight,
        };
      }, RUNWAY);

      await page.evaluate(
        (to) =>
          new Promise((done) => {
            const step = () => {
              const remaining = to - window.scrollY;
              if (Math.abs(remaining) <= 2) return done();
              window.scrollBy(0, Math.sign(remaining) * Math.min(28, Math.abs(remaining)));
              requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }),
        Math.round(marks.runwayTop + 300),
      );

      const shot = await page.screenshot();

      const scan = await page.evaluate(
        async ([url, row]) => {
          const img = new Image();
          img.src = url;
          await img.decode();
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const data = ctx.getImageData(0, row, img.width, 1).data;
          const tally = new Map();
          for (let x = 0; x < img.width; x += 1) {
            const key = `${data[x * 4]},${data[x * 4 + 1]},${data[x * 4 + 2]}`;
            tally.set(key, (tally.get(key) ?? 0) + 1);
          }
          const ground = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
          const [gr, gg, gb] = ground.split(",").map(Number);

          /*
           * Lighter than the ground, not merely different: the blooms drifting
           * behind the sentence below are also not the ground, and they are
           * hundreds of pixels wide. A seam is thin and bright.
           */
          const columns = [];
          for (let x = 0; x < img.width; x += 1) {
            const [r, g, b] = [data[x * 4], data[x * 4 + 1], data[x * 4 + 2]];
            if (r - gr > 24 && g - gg > 24 && b - gb > 24) {
              columns.push({ x, colour: `rgb(${r},${g},${b})` });
            }
          }

          return { ground: `rgb(${ground})`, width: img.width, columns };
        },
        [`data:image/png;base64,${shot.toString("base64")}`, 200],
      );

      expect(
        scan.ground,
        `the row sampled at ${width}px is mostly ${scan.ground}, so the curtain was not covering it`,
      ).toBe("rgb(17,33,24)");

      expect(
        scan.columns,
        `at ${width}px a light column shows between the panels at x=${scan.columns.map((column) => column.x).join(", ")} (${scan.columns[0]?.colour} against the ${scan.ground} ground)`,
      ).toEqual([]);
    }
  });

  /*
   * The section after the curtain paints part of itself inside the curtain's own
   * box: QuoteSection holds its sentence with `sticky` and `-translate-y-1/2`,
   * so half the sentence's height sits above its section's top edge -- exactly
   * the strip the shut curtain occupies. Both are `--color-accent`, so a covered
   * sentence does not read as an overlap. It reads as the first words never
   * arriving, and then arriving late once the strip has scrolled clear.
   *
   * This cannot be hit-tested: the curtain is `pointer-events-none`, so
   * `elementFromPoint` walks past it whether or not it paints on top. So the
   * assertion is on the stacking contexts instead -- the panels raise themselves
   * to cover the Hero, and the wrapper has to keep that raise to itself.
   */
  test("the curtain does not paint over the section it hands over to", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });

    const order = await page.evaluate(
      ([runwaySelector, panelSelector]) => {
        const runway = document.querySelector(runwaySelector);
        const wrapper = runway.parentElement;
        const next = wrapper.nextElementSibling;
        const sentence = next.querySelector("h2");
        const docY = (el) => el.getBoundingClientRect().top + window.scrollY;

        // Every z-index the panels sit under, up to but not including the
        // wrapper: this is the raise that has to stay inside it.
        const inside = [];
        for (
          let el = document.querySelector(panelSelector);
          el && el !== wrapper;
          el = el.parentElement
        ) {
          const z = getComputedStyle(el).zIndex;
          if (z !== "auto") inside.push(Number(z));
        }

        const wrapperStyle = getComputedStyle(wrapper);
        const nextZ = getComputedStyle(next).zIndex;

        return {
          // How far the sentence reaches above its own section's top edge.
          overflow: Math.round(docY(next) - docY(sentence)),
          raisedInside: inside.length ? Math.max(...inside) : 0,
          wrapperPosition: wrapperStyle.position,
          wrapperZ: wrapperStyle.zIndex,
          nextZ: nextZ === "auto" ? 0 : Number(nextZ),
        };
      },
      [RUNWAY, PANEL],
    );

    /*
     * The premise. If the sentence stops reaching above its section there is
     * nothing here to cover, and this test would pass while guarding nothing --
     * so it fails loudly instead, to be re-read rather than trusted.
     */
    expect(
      order.overflow,
      "the sentence no longer paints above its own section, so this test guards nothing -- re-read it against whatever replaced the sticky hold",
    ).toBeGreaterThan(0);

    expect(
      order.raisedInside,
      "the panels no longer raise themselves over the Hero, so re-read what covers it now",
    ).toBeGreaterThan(0);

    /*
     * A stacking context is what confines that raise. Without one the panels'
     * z-index competes with every later section instead of with the Hero.
     */
    expect(
      order.wrapperZ,
      `the curtain's wrapper does not establish a stacking context (position ${order.wrapperPosition}, z-index ${order.wrapperZ}), so the panels' z-index ${order.raisedInside} outranks the section below`,
    ).not.toBe("auto");
    expect(
      order.wrapperPosition,
      "a z-index on a static box establishes nothing",
    ).not.toBe("static");

    /*
     * And the wrapper itself may not outrank what follows it. Equal is the
     * answer rather than lower: paint order then falls to document order, and
     * the section that comes after wins by coming after.
     */
    expect(
      Number(order.wrapperZ),
      `the curtain's wrapper sits at z-index ${order.wrapperZ} against the following section's ${order.nextZ}`,
    ).toBeLessThanOrEqual(order.nextZ);
  });

  /*
   * The handover is one gesture: the panels land, and the sentence they deliver
   * starts writing itself. The scroll between the two is the reader watching a
   * flat field, and it used to be half a viewport -- the reveal was tied to the
   * moment the sticky engages, which is 50dvh past the release.
   *
   * The band is wide on purpose. It rules out the failure mode without pinning
   * the pace, which is a design decision and belongs in the component. See
   * docs/failure-archetypes.md, "Contrato rigoroso sobre um valor que não
   * deveria existir".
   */
  test("the sentence starts writing itself soon after the handover", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await waitPastScrollTriggerStartup(page);

    const { frames, viewport } = await walkTheCurtain(page);

    const release = frames.find((frame) => frame.runwayBottom <= viewport + 1);
    expect(release, "the hold never releases inside the walk").toBeTruthy();

    const firstWord = frames.find(
      (frame) => frame.firstWord !== null && frame.firstWord > 0.02,
    );
    expect(
      firstWord,
      "the sentence's first word never lights inside the walk, so it now waits longer than the walk is long",
    ).toBeTruthy();

    const gap = firstWord.y - release.y;
    expect(
      gap,
      `the first word waits ${gap}px of scroll after the curtain lets go (released at y=${release.y}, lit at y=${firstWord.y})`,
    ).toBeLessThanOrEqual(300);

    /*
     * The other direction, and the reason this is a band: a word lighting while
     * the panels are still moving would be read through a curtain that is still
     * closing, over the Hero it has not finished covering.
     */
    expect(
      gap,
      `the first word lights ${-gap}px before the curtain has let go`,
    ).toBeGreaterThanOrEqual(0);
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
