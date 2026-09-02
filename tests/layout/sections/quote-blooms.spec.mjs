import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * The blooms drifting behind the Quote's sentence.
 *
 * They exist because a sentence resolving on an empty field reads as arriving
 * by itself: there is nothing for the scroll to be measured against, so the
 * reader's own input appears to have nothing to do with it. Three layers at
 * three rates give it something.
 *
 * Every assertion here is a property the layer must not break -- how strong the
 * blooms are, where they sit and how fast each drifts are design decisions and
 * stay in the component. See docs/failure-archetypes.md, "Contrato rigoroso
 * sobre um valor que não deveria existir".
 */

const BLOOM = "[data-quote-bloom]";
const HEADING = 'h2[aria-label^="Ajudamos"]';

const rollTo = (page, target) =>
  page.evaluate(
    (to) =>
      new Promise((done) => {
        const step = () => {
          const remaining = to - window.scrollY;
          if (Math.abs(remaining) <= 2) return done(window.scrollY);
          window.scrollBy(0, Math.sign(remaining) * Math.min(28, Math.abs(remaining)));
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    target,
  );

const quoteTop = (page) =>
  page.evaluate(
    (selector) => {
      const section = document.querySelector(selector).closest("section");
      return {
        top: section.getBoundingClientRect().top + window.scrollY,
        height: section.offsetHeight,
        viewport: window.innerHeight,
      };
    },
    HEADING,
  );

test.describe("quote blooms", () => {
  /*
   * The reason the layer has its own clipping box instead of `overflow-hidden`
   * on the section: an ancestor with a non-visible overflow becomes the sticky
   * child's scrollport, and the hold is CSS sticky. So the section may not clip,
   * the blooms hang off both of its sides by design, and something else has to
   * catch them -- or the page grows a horizontal scrollbar, which is the defect
   * this whole suite was written for.
   */
  test("the blooms never widen the page", async ({ page }) => {
    for (const width of [390, 768, 1280, 1920]) {
      await gotoLanding(page, width, { motion: true });

      const marks = await quoteTop(page);
      await rollTo(page, Math.round(marks.top - marks.viewport / 2));

      const overflow = await page.evaluate(
        (selector) => {
          const blooms = [...document.querySelectorAll(selector)];
          const widest = blooms.reduce((worst, bloom) => {
            const box = bloom.getBoundingClientRect();
            return Math.max(worst, Math.round(box.right - window.innerWidth));
          }, 0);

          return {
            documentWidth: document.documentElement.scrollWidth,
            viewport: window.innerWidth,
            bloomsPastRightEdge: widest,
            bloomCount: blooms.length,
          };
        },
        BLOOM,
      );

      expect(overflow.bloomCount, `no blooms found at ${width}px`).toBeGreaterThan(0);

      /*
       * The blooms are expected to reach past the edge -- that is what makes
       * them read as cropped rather than as circles in a field. The assertion is
       * that the page does not grow to fit them.
       */
      expect(
        overflow.documentWidth,
        `the page is ${overflow.documentWidth}px wide in a ${overflow.viewport}px viewport, and a bloom reaches ${overflow.bloomsPastRightEdge}px past the right edge`,
      ).toBeLessThanOrEqual(overflow.viewport);
    }
  });

  /*
   * Behind the sentence and out of the way of the pointer. Both halves fail
   * silently in opposite directions: a layer painted over the sentence dims the
   * one thing on the screen that has to be read, and a layer that takes clicks
   * would swallow them across the whole section.
   */
  test("the blooms sit behind the sentence and take no clicks", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });

    const marks = await quoteTop(page);
    await rollTo(page, Math.round(marks.top - marks.viewport / 2));

    const stacking = await page.evaluate(
      ([bloomSelector, headingSelector]) => {
        const bloom = document.querySelector(bloomSelector);
        const layer = bloom.parentElement;
        const heading = document.querySelector(headingSelector);
        const hold = heading.closest("div");
        const box = heading.getBoundingClientRect();

        return {
          // Document order decides here, and both are positioned: the layer has
          // to come first, or it paints over the hold.
          layerComesFirst: Boolean(
            layer.compareDocumentPosition(hold) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          layerPosition: getComputedStyle(layer).position,
          holdPosition: getComputedStyle(hold).position,
          pointerEvents: getComputedStyle(bloom).pointerEvents,
          hitAtSentence: (() => {
            const hit = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            return hit ? hit.tagName : null;
          })(),
          bloomOverSentence: (() => {
            const hit = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            return Boolean(hit && hit.closest("[data-quote-bloom]"));
          })(),
        };
      },
      [BLOOM, HEADING],
    );

    expect(
      stacking.layerComesFirst,
      "the bloom layer comes after the sentence in document order, so with both positioned it paints over it",
    ).toBe(true);
    expect(stacking.layerPosition, "the layer is in flow").not.toBe("static");
    expect(stacking.holdPosition, "the hold is no longer sticky").toBe("sticky");
    expect(stacking.pointerEvents, "the blooms are hit-testable").toBe("none");
    expect(
      stacking.bloomOverSentence,
      `a bloom is hit-tested over the sentence (${stacking.hitAtSentence})`,
    ).toBe(false);
  });

  /*
   * Three rates, and their ORDER is the property: near beats the page, far falls
   * behind it, and that difference is the only thing that reads as distance. All
   * three drifting the same way is one sheet sliding at three speeds, which is
   * what the first version of this was.
   *
   * Measured as travel relative to the section, so the page's own scroll is out
   * of the comparison and what is left is each layer's departure from it.
   */
  test("the blooms drift at three different rates, near leading and far lagging", async ({
    page,
  }) => {
    await gotoLanding(page, 1280, { motion: true });

    const marks = await quoteTop(page);

    const sample = async (y) => {
      await rollTo(page, Math.round(y));
      await page.waitForTimeout(250);
      return page.evaluate(
        (selector) => {
          const section = document.querySelector("[data-quote-bloom]").closest("section");
          const sectionTop = section.getBoundingClientRect().top;
          return Object.fromEntries(
            [...document.querySelectorAll(selector)].map((bloom) => [
              bloom.dataset.quoteBloom,
              // Relative to the section, so the scroll the page gave both of
              // them cancels and only the drift is left.
              Math.round(bloom.getBoundingClientRect().top - sectionTop),
            ]),
          );
        },
        BLOOM,
      );
    };

    const early = await sample(marks.top - marks.viewport + 200);
    const late = await sample(marks.top + marks.height - marks.viewport);

    const travel = Object.fromEntries(
      Object.keys(early).map((key) => [key, late[key] - early[key]]),
    );

    /*
     * Negative travel is upward against the section, which is a layer leading
     * the page. The near bloom must lead, and lead by more than the mid one.
     */
    expect(
      travel.near,
      `the near bloom travelled ${travel.near}px against the section, so it does not lead the page`,
    ).toBeLessThan(0);
    expect(
      travel.near,
      `the near bloom (${travel.near}px) does not lead the mid one (${travel.mid}px)`,
    ).toBeLessThan(travel.mid);
    expect(
      travel.far,
      `the far bloom travelled ${travel.far}px, so it does not fall behind the page`,
    ).toBeGreaterThan(0);
  });

  /*
   * The blooms are not motion, they are what the section looks like -- so a
   * reader who asked for less movement keeps them and loses only the drift. The
   * failure this guards is the easy one to write: putting them inside the branch
   * that returns early under reduced motion, which leaves that reader the empty
   * field the layer exists to fill.
   */
  test("reduced motion keeps the blooms and drops only the drift", async ({ page }) => {
    // gotoLanding defaults to reduced motion.
    await gotoLanding(page, 1280);

    const marks = await quoteTop(page);

    const at = async (y) => {
      await rollTo(page, Math.round(y));
      await page.waitForTimeout(200);
      return page.evaluate(
        (selector) => {
          const section = document.querySelector(selector).closest("section");
          const sectionTop = section.getBoundingClientRect().top;
          return [...document.querySelectorAll(selector)].map((bloom) => ({
            key: bloom.dataset.quoteBloom,
            offset: Math.round(bloom.getBoundingClientRect().top - sectionTop),
            painted:
              getComputedStyle(bloom).backgroundImage !== "none" &&
              Number(getComputedStyle(bloom).opacity) > 0 &&
              bloom.getBoundingClientRect().width > 0,
          }));
        },
        BLOOM,
      );
    };

    const early = await at(marks.top - marks.viewport + 200);
    const late = await at(marks.top + marks.height - marks.viewport);

    expect(early.length, "no blooms found").toBeGreaterThan(0);
    expect(
      early.filter((bloom) => !bloom.painted).map((bloom) => bloom.key),
      "blooms are missing under reduced motion, so that reader gets the empty field",
    ).toEqual([]);

    for (const [index, bloom] of early.entries()) {
      expect(
        Math.abs(late[index].offset - bloom.offset),
        `the ${bloom.key} bloom moved ${late[index].offset - bloom.offset}px against its section under reduced motion`,
      ).toBeLessThanOrEqual(2);
    }
  });
});
