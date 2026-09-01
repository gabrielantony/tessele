import { expect } from "@playwright/test";

export const HEIGHT = 900;

export const gotoLanding = async (page, width, { motion = false } = {}) => {
  await page.setViewportSize({ width, height: HEIGHT });
  await page.emulateMedia({ reducedMotion: motion ? "no-preference" : "reduce" });
  await page.goto("./", { waitUntil: "load" });
  // Boxes holding text change size when the webfont swaps in; `load` does not
  // wait for that.
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
};

const scaleOf = async (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const t = getComputedStyle(el).transform;
    if (t === "none") return 1;
    // matrix(a, b, c, d, tx, ty) -- uniform scale reads from `a`.
    return Number(t.match(/matrix\(([-\d.]+)/)?.[1] ?? 1);
  }, selector);

/*
 * The CTA interaction contract, extracted from the Hero and owed by every CTA
 * on the page once they share the component: raise on hover (scale 1.012),
 * press down on pointerdown (0.985), return to raised on release where a
 * cursor exists, settle to rest on leave.
 *
 * Runs under reduced motion on purpose: the mechanics keep every state change
 * and drop only the travel (`seconds()` returns 0), so each state lands
 * synchronously and the assertion needs no animation-timed waits. This doubles
 * as the guarantee that reduced-motion users still get pressed/hover states.
 *
 * On projects without hover capability (the iPhone profile), hover must do
 * nothing -- a tap fires pointerenter without a matching pointerleave, and a
 * raise there would stick. Press feedback still applies.
 */
export const assertCtaMechanics = async (page, selector) => {
  const cta = page.locator(selector).first();
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);

  const canHover = await page.evaluate(
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

  expect(await scaleOf(page, selector), `${selector} does not start at rest`).toBeCloseTo(1, 2);

  await cta.hover();
  await page.waitForTimeout(150);
  if (canHover) {
    expect(
      await scaleOf(page, selector),
      `${selector} does not raise on hover`,
    ).toBeGreaterThan(1.005);
  } else {
    expect(
      await scaleOf(page, selector),
      `${selector} raised on hover on a touch profile, where the state would stick`,
    ).toBeCloseTo(1, 2);
  }

  await page.mouse.down();
  await page.waitForTimeout(150);
  expect(
    await scaleOf(page, selector),
    `${selector} does not press down on pointerdown`,
  ).toBeLessThan(0.995);

  await page.mouse.up();
  await page.waitForTimeout(150);
  if (canHover) {
    expect(
      await scaleOf(page, selector),
      `${selector} does not return to raised after release under a cursor`,
    ).toBeGreaterThan(1.005);
  } else {
    expect(
      await scaleOf(page, selector),
      `${selector} does not settle to rest after a tap`,
    ).toBeCloseTo(1, 2);
  }

  // Leave via a corner far from any CTA so the settle path always runs.
  await page.mouse.move(1, 1);
  await page.waitForTimeout(150);
  expect(
    await scaleOf(page, selector),
    `${selector} does not settle back to rest`,
  ).toBeCloseTo(1, 2);
};
