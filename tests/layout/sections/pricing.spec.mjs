import { expect, test } from "@playwright/test";

import { assertCtaMechanics, gotoLanding } from "./helpers.mjs";

const SECTION = '[data-name="planos-e-precos"]';

test.describe("pricing", () => {
  /*
   * Measured with the section far off-screen, before its ScrollTrigger fires:
   * the plan cards sit at `opacity: 1, transform: none` -- already in their final
   * state. `immediateRender: false` on a `.from()` inside the timeline is why: it
   * skips the pre-hide, so the cards stay visible until the timeline reaches them,
   * then snap to the from-state and animate up. The reader sees a flash, not a
   * reveal.
   *
   * The assertion is the effect at the moment that matters -- before the trigger,
   * the cards must not already be at their end state.
   */
  test("the plan cards do not sit in their final state before revealing", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const before = await page.evaluate((selector) =>
      Array.from(document.querySelectorAll(`${selector} [data-plan-card]`)).map((card) => ({
        opacity: Number(getComputedStyle(card).opacity),
        transform: getComputedStyle(card).transform,
      })),
    SECTION);

    expect(before.length, "no plan cards found").toBeGreaterThan(0);

    const alreadyArrived = before.filter(
      (card) => card.opacity > 0.99 && card.transform === "none",
    );
    expect(
      alreadyArrived,
      "plan cards are fully visible before their reveal runs, so it plays as a flash",
    ).toEqual([]);
  });

  test("the plan cards finish visible once revealed", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await page.locator(SECTION).scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const opacities = await page.evaluate((selector) =>
      Array.from(document.querySelectorAll(`${selector} [data-plan-card]`)).map((card) =>
        Number(getComputedStyle(card).opacity),
      ),
    SECTION);

    for (const [index, opacity] of opacities.entries()) {
      expect(opacity, `plan card ${index} never finished arriving`).toBeGreaterThan(0.99);
    }
  });

  // Reduced motion has to land the cards at their end state without travel --
  // never leave them mid-reveal, and never depend on a trigger firing.
  test("the plan cards are visible under reduced motion", async ({ page }) => {
    await gotoLanding(page, 1280);

    const opacities = await page.evaluate((selector) =>
      Array.from(document.querySelectorAll(`${selector} [data-plan-card]`)).map((card) =>
        Number(getComputedStyle(card).opacity),
      ),
    SECTION);

    expect(opacities.length).toBeGreaterThan(0);
    for (const [index, opacity] of opacities.entries()) {
      expect(opacity, `plan card ${index} is not visible with reduced motion`).toBeGreaterThan(0.99);
    }
  });

  /*
   * This assertion replaced an earlier one, and the correction is worth recording
   * because the first version made the page worse.
   *
   * I measured that `grid-cols-1 lg:grid-cols-3` stacks three plans in one
   * ~500px column from 768 to 1023px, and asked for more than one column there.
   * `md:grid-cols-2` satisfied that and produced three cards in two columns:
   * the most expensive plan alone on the second row with half the row empty
   * beside it. Confirmed by eye at 768px and 900px. That reads as broken, where a
   * single tall column reads as a deliberate stack -- so the "fix" cost more than
   * the whitespace it recovered.
   *
   * The right constraint is the one the about stats needed: no incomplete row.
   * With three cards that permits one column or three and forbids exactly the
   * two-column orphan, which leaves the choice of breakpoint to the design
   * instead of to me.
   */
  for (const width of [390, 768, 900, 1023, 1024, 1280, 1600]) {
    test(`no plan card is left alone on a row at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const layout = await page.evaluate((selector) => {
        const cards = Array.from(document.querySelectorAll(`${selector} [data-plan-card]`));
        return {
          count: cards.length,
          columns: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size,
          rows: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size,
        };
      }, SECTION);

      expect(layout.count, "no plan cards found").toBeGreaterThan(1);
      expect(
        layout.count % layout.columns,
        `${layout.count} plans in ${layout.columns} columns leaves ${layout.count % layout.columns} alone on the last row`,
      ).toBe(0);
    });
  }

  // The section's CTAs have to feel like the hero's. The shared component is the
  // only way that stays true, and the count assertion in foundations.spec.mjs is
  // what notices a section reimplementing one instead of adopting it.
  test("the plan CTAs use the shared button", async ({ page }) => {
    await gotoLanding(page, 1280);

    const shared = page.locator(`${SECTION} [data-cta-button]`);
    await expect(
      shared,
      "the pricing CTAs are not the shared button, so they cannot share its feel",
    ).not.toHaveCount(0);
  });

  test("a plan CTA honours the interaction contract", async ({ page }) => {
    await gotoLanding(page, 1280);

    // Fail on the missing button rather than on a 60s hover timeout waiting for
    // one -- the useful message is the previous test's, not "the click expired".
    await expect(
      page.locator(`${SECTION} [data-cta-button]`),
      "no shared CTA button here to exercise -- see the previous test",
    ).not.toHaveCount(0);

    await assertCtaMechanics(page, `${SECTION} [data-cta-button]`);
  });
});
