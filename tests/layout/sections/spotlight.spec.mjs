import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * The hero carries a faint grid that is only visible inside a soft circle
 * following the pointer. The grid is painted across the whole layer and masked
 * down to that circle, so what moves is the hole -- the lines stay locked to the
 * section.
 *
 * The values that make it look right -- the radius, the grid pitch, the lag --
 * stay in globals.css and SpotlightGrid. They are design decisions, and pinning
 * them here would make the contract defend them. See docs/failure-archetypes.md,
 * "Contrato rigoroso sobre um valor que não deveria existir". What is measured
 * here is the behaviour that has no visible failure mode of its own: a mask that
 * silently fails to parse leaves a full-bleed grid or no grid at all, and a layer
 * at the wrong depth either covers the headline or hides under the background.
 */

const LAYER = "[data-spotlight-grid]";
const HERO = "section:has(h1)";

const hasFinePointer = (page) =>
  page.evaluate(() =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

/*
 * The spotlight trails the pointer, so a single read can land mid-flight. Poll
 * until it settles, then assert on the last value -- the same shape helpers.mjs
 * uses for the CTA, and for the same reason: a fixed sleep passes in isolation
 * and fails on a starved worker, and the config sets `retries: 0` deliberately.
 */
const settledCentre = async (page) => {
  let last = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const now = await page.evaluate((selector) => {
      const layer = document.querySelector(selector);
      const style = getComputedStyle(layer);
      return {
        x: parseFloat(style.getPropertyValue("--spotlight-x")),
        y: parseFloat(style.getPropertyValue("--spotlight-y")),
      };
    }, LAYER);
    if (last && Math.abs(now.x - last.x) < 0.5 && Math.abs(now.y - last.y) < 0.5) {
      return now;
    }
    last = now;
    await page.waitForTimeout(50);
  }
  return last;
};

test.describe("spotlight", () => {
  /*
   * The one that has no visible failure mode worth the name. `mask` is built from
   * two custom properties and a clamp, and every browser that cannot parse some
   * part of it drops the whole declaration -- which does not throw, does not warn,
   * and leaves the grid painted edge to edge across the hero with no spotlight at
   * all. On a canvas ground at 12.5% that is quiet enough to ship by accident.
   */
  test("the mask resolves, so the grid is a circle and not a full bleed", async ({
    page,
  }) => {
    await gotoLanding(page, 1280);
    if (!(await hasFinePointer(page))) test.skip();

    const painted = await page.evaluate((selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return {
        mask: style.maskImage,
        grid: style.backgroundImage,
        size: style.backgroundSize,
      };
    }, LAYER);

    expect(painted.mask, "the mask declaration was dropped").not.toBe("none");
    expect(
      painted.mask,
      `the mask resolved to something other than a radial gradient: ${painted.mask}`,
    ).toContain("radial-gradient");
    expect(painted.grid, "no grid is painted on the layer").toContain(
      "linear-gradient",
    );
    // Two axes of lines, or it is stripes rather than a grid.
    expect(
      painted.grid.match(/linear-gradient/g).length,
      `only ${painted.grid.match(/linear-gradient/g)?.length} gradient on the layer, so the grid has one axis`,
    ).toBe(2);
    expect(painted.size, "the grid has no pitch").not.toBe("auto");
  });

  /*
   * Run against both motion preferences, because they are two different code
   * paths and only one of them ships to most readers.
   *
   * The reduced path writes the position straight out; the default one hands it
   * to a `quickTo` that eases. The first build used `quickTo` for both, with
   * `duration: 0` standing in for "no travel" -- and re-aiming a zero-duration
   * tween leaves its progress maths without a span, so from the second pointer
   * move onward it wrote `--spotlight-x: NaNpx`. An invalid length drops the whole
   * `mask` declaration, which floods the hero with an unmasked grid: no error, no
   * warning, and only for readers who asked for less motion.
   */
  for (const motion of [false, true]) {
    test(`the light goes where the pointer goes, motion ${motion ? "on" : "reduced"}`, async ({
      page,
    }) => {
      await gotoLanding(page, 1280, { motion });
      if (!(await hasFinePointer(page))) test.skip();

      const box = await page.locator(HERO).boundingBox();

      const targets = [
        { x: box.x + 300, y: box.y + 200 },
        { x: box.x + 900, y: box.y + 500 },
      ];

      for (const target of targets) {
        await page.mouse.move(target.x, target.y);
        const centre = await settledCentre(page);

        expect(
          Number.isFinite(centre.x) && Number.isFinite(centre.y),
          `the spotlight centre is not a number: ${JSON.stringify(centre)}`,
        ).toBe(true);

        /*
         * The centre is stated in the layer's own coordinates, so it has to equal
         * the pointer minus the hero's origin. Getting this wrong by the scroll
         * offset or by the section's padding is the ordinary way this breaks, and
         * it shows as a light that trails at a fixed offset from the cursor.
         */
        expect(
          Math.abs(centre.x - (target.x - box.x)),
          `the light settled ${Math.round(centre.x)}px across where the pointer was at ${Math.round(target.x - box.x)}px`,
        ).toBeLessThanOrEqual(2);
        expect(
          Math.abs(centre.y - (target.y - box.y)),
          `the light settled ${Math.round(centre.y)}px down where the pointer was at ${Math.round(target.y - box.y)}px`,
        ).toBeLessThanOrEqual(2);
      }
    });
  }

  /*
   * The layer covers the whole hero, so if it were ever hit-testable or painted
   * over the copy it would take the headline and the CTA with it. `-z-10` puts it
   * under them and `isolate` on the hero keeps that negative index from dropping
   * it behind the section's own background, where it would be invisible instead.
   * Both halves fail silently, in opposite directions.
   */
  test("it sits under the copy and takes no clicks", async ({ page }) => {
    await gotoLanding(page, 1280);
    if (!(await hasFinePointer(page))) test.skip();

    const onTop = await page.evaluate(
      ([heroSelector, layerSelector]) => {
        const hero = document.querySelector(heroSelector);
        const layer = document.querySelector(layerSelector);
        const cta = hero.querySelector("[data-cta-button]");

        const at = (element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          return hit === layer || layer.contains(hit);
        };

        return {
          overHeadline: at(hero.querySelector("h1")),
          overCta: at(cta),
          isolation: getComputedStyle(hero).isolation,
          zIndex: getComputedStyle(layer).zIndex,
        };
      },
      [HERO, LAYER],
    );

    expect(onTop.overHeadline, "the layer is hit-tested over the headline").toBe(false);
    expect(onTop.overCta, "the layer is hit-tested over the CTA").toBe(false);
    expect(
      onTop.isolation,
      "the hero does not isolate, so a negative z-index drops the grid behind bg-canvas and it never shows",
    ).toBe("isolate");
    expect(Number(onTop.zIndex), "the layer is not behind the copy").toBeLessThan(0);
  });

  test("nothing shows until a pointer has been over the hero", async ({ page }) => {
    await gotoLanding(page, 1280);
    if (!(await hasFinePointer(page))) test.skip();

    /*
     * The resting state is the hero exactly as it was. It matters for more than
     * taste: a reader whose JS never runs gets this state permanently, and a
     * spotlight frozen at 50% 50% would be a grey smudge in the middle of the
     * headline with no way to explain itself.
     */
    const resting = await page.evaluate(
      (selector) => Number(getComputedStyle(document.querySelector(selector)).opacity),
      LAYER,
    );
    expect(resting, "the grid is painted before any pointer has arrived").toBe(0);
  });

  test("a touch profile never rasterises the mask", async ({ page }) => {
    await gotoLanding(page, 390);
    if (await hasFinePointer(page)) test.skip();

    /*
     * `display: none`, not opacity 0. There is no cursor to follow, so the layer
     * has no job -- and a full-viewport masked layer is real rasterising work to
     * leave on the device least able to afford it.
     */
    const display = await page.evaluate(
      (selector) => getComputedStyle(document.querySelector(selector)).display,
      LAYER,
    );
    expect(display, "the spotlight layer is still laid out on a touch profile").toBe(
      "none",
    );
  });
});
