import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

const RAIL = '[aria-label="Cases de clientes"]';

/*
 * The "dark bar" Gabriel wanted gone is the rail's native scrollbar. The rail
 * holds two case cards that are `w-full max-w-wide shrink-0`, so it overflows at
 * every width -- measured hidden content: 304px at 320px, 685px at 768px,
 * 1120px at 1280px, still 768px at 1696px. It is the only thing on the page that
 * scrolls sideways.
 *
 * Hiding the bar alone would leave content reachable only by a gesture with
 * nothing on screen saying so, which is the defect `hiddenScrollers` in
 * landing-layout.spec.mjs exists to catch. So the bar goes and a visible control
 * takes over the job of announcing the overflow -- that check now earns its
 * exemption by finding such a control, rather than by an ALLOWED entry.
 */
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

    const railId = await page.locator(RAIL).getAttribute("id");
    expect(railId, "the rail needs an id so its controls can reference it").toBeTruthy();

    const controls = page.locator(`[aria-controls="${railId}"]`);
    await expect(
      controls,
      "no visible control drives the rail, so the hidden scrollbar leaves the second case unannounced",
    ).toHaveCount(2);

    for (let index = 0; index < 2; index += 1) {
      await expect(controls.nth(index), `control ${index} is not visible`).toBeVisible();
    }
  });

  // A control that looks like pagination and does nothing is worse than no
  // control: it reads as "you have seen everything". Assert the effect.
  test("a rail control scrolls the rail and reflects the position", async ({ page }) => {
    await gotoLanding(page, 1280);

    const railId = await page.locator(RAIL).getAttribute("id");
    const controls = page.locator(`[aria-controls="${railId}"]`);
    const scrollLeft = () => page.evaluate((s) => document.querySelector(s).scrollLeft, RAIL);

    // Fail on the missing control rather than on a 60s click timeout waiting for
    // one: the useful message is "there is no control", not "the click expired".
    await expect(
      controls,
      "the rail has no controls to exercise -- see the previous test",
    ).toHaveCount(2);

    await page.locator(RAIL).scrollIntoViewIfNeeded();
    expect(await scrollLeft(), "the rail does not start at its first case").toBe(0);

    await controls.nth(1).click();
    await page.waitForTimeout(700);
    const afterForward = await scrollLeft();
    expect(afterForward, "clicking the second control did not move the rail").toBeGreaterThan(0);

    // Whichever control is current has to be distinguishable from the other, or
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
      `both rail controls render identically after moving, so nothing shows the current case: ${JSON.stringify(marks)}`,
    ).toBe(true);

    await controls.nth(0).click();
    await page.waitForTimeout(700);
    expect(
      await scrollLeft(),
      "clicking the first control did not bring the rail back",
    ).toBeLessThan(afterForward);
  });
});
