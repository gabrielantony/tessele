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

const scaleOf = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const transform = getComputedStyle(el).transform;
    if (transform === "none") return 1;
    // matrix(a, b, c, d, tx, ty) -- uniform scale reads from `a`.
    return Number(transform.match(/matrix\(([-\d.]+)/)?.[1] ?? 1);
  }, selector);

/*
 * Poll until the scale satisfies the expectation, then assert on the last read.
 *
 * The first version slept a fixed 150ms and read once. Under reduced motion the
 * tweens have duration 0, so 150ms is normally ample -- but a full run across
 * three engines on four workers starved a worker past it, and this assertion
 * failed once in a whole-suite run while passing every time in isolation. The
 * config sets `retries: 0` deliberately, so the fix belongs in the measurement.
 *
 * Waiting for the value to merely "stop changing" was the other candidate and it
 * is wrong: the previous state is also stable, so it would happily return the
 * pre-interaction value. Waiting for the expectation itself cannot do that -- and
 * a genuinely wrong value still fails, with the last value it saw in the message.
 */
const expectScale = async (page, selector, { holds, expected }) => {
  let last = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    last = await scaleOf(page, selector);
    if (last !== null && holds(last)) return last;
    await page.waitForTimeout(50);
  }
  expect(last, `${selector} ${expected} (settled at ${last})`).toBe("unreachable");
  return last;
};

/*
 * The mirror of the above, for the assertions that require something NOT to
 * happen -- hover must not raise the button on a touch profile.
 *
 * Polling until a condition holds is useless there: "still at rest" is true on the
 * first read, before any tween could have applied, so it would pass on the very
 * bug it exists to catch. So sample across a window and fail if any sample breaks
 * the expectation.
 *
 * This direction is still load-sensitive, and worth being straight about: a worker
 * starved for the whole window would let a real raise through. That failure mode
 * makes the test miss a bug rather than invent one, which is the right way round
 * for a negative assertion, and the window is generous enough that it would take
 * a serious stall.
 */
const expectScaleStays = async (page, selector, { holds, expected }) => {
  for (let sample = 0; sample < 8; sample += 1) {
    const scale = await scaleOf(page, selector);
    expect(holds(scale), `${selector} ${expected} (reached ${scale})`).toBe(true);
    await page.waitForTimeout(50);
  }
};

const RAISED = { holds: (scale) => scale > 1.005, expected: "did not raise" };
const PRESSED = { holds: (scale) => scale < 0.995, expected: "did not press down" };
const AT_REST = {
  holds: (scale) => Math.abs(scale - 1) < 0.005,
  expected: "did not come to rest",
};

/*
 * The CTA interaction contract, extracted from the Hero and owed by every CTA on
 * the page once they share the component: raise on hover (scale 1.012), press
 * down on pointerdown (0.985), return to raised on release where a cursor
 * exists, settle to rest on leave.
 *
 * Runs under reduced motion on purpose: the mechanics keep every state change and
 * drop only the travel (`seconds()` returns 0), so this doubles as the guarantee
 * that reduced-motion users still get pressed and hover states.
 *
 * On projects without hover capability (the iPhone profile), hover must do
 * nothing -- a tap fires pointerenter without a matching pointerleave, and a
 * raise there would stick. Press feedback still applies.
 */
export const assertCtaMechanics = async (page, selector) => {
  const cta = page.locator(selector).first();
  await cta.scrollIntoViewIfNeeded();

  const canHover = await page.evaluate(
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

  await expectScale(page, selector, {
    ...AT_REST,
    expected: "does not start at rest",
  });

  await cta.hover();
  if (canHover) {
    await expectScale(page, selector, { ...RAISED, expected: "does not raise on hover" });
  } else {
    await expectScaleStays(page, selector, {
      ...AT_REST,
      expected: "raised on hover on a touch profile, where the state would stick",
    });
  }

  await page.mouse.down();
  await expectScale(page, selector, {
    ...PRESSED,
    expected: "does not press down on pointerdown",
  });

  await page.mouse.up();
  await expectScale(
    page,
    selector,
    canHover
      ? { ...RAISED, expected: "does not return to raised after release under a cursor" }
      : { ...AT_REST, expected: "does not settle to rest after a tap" },
  );

  // Leave via a corner far from any CTA so the settle path always runs.
  await page.mouse.move(1, 1);
  await expectScale(page, selector, {
    ...AT_REST,
    expected: "does not settle back to rest",
  });
};
