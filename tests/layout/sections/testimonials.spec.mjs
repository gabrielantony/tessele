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
