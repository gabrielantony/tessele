import { expect, test } from "@playwright/test";

import { gotoLanding } from "./sections/helpers.mjs";

/*
 * Focus indicators: on Tab, and on nothing else.
 *
 * Two defects live here. The first is a colour: seven controls styled no focus
 * state and fell through to Chrome's own ring, which is `outline: auto` -- it
 * ignores outline-color and paints its blue, a colour from outside the palette.
 * The second is a trigger: the cases rail is a scroll container with tabIndex,
 * so clicking anywhere in that section focuses it silently, and the next arrow
 * key -- pressed to scroll the PAGE -- turns `:focus-visible` on and outlines
 * the whole rail. It reads as the page glitching, not as focus.
 *
 * Reads here poll rather than sample once. A computed style read in the same
 * tick as the keypress returns pre-recalc values -- which is how an earlier
 * version of this file "measured" rings that were painting correctly all along
 * -- and a fixed frame count only moves where that race sits. This is the same
 * reasoning, and the same shape, as expectScale in sections/helpers.mjs.
 */

const HIGHLIGHT = "rgb(133, 208, 45)";

const settle = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));

/*
 * Walks focus with real Tab presses until it lands on the target.
 *
 * `el.focus()` will not do: Chrome does not match `:focus-visible` on
 * programmatic focus, so every utility under test stays inert and the assertion
 * measures the browser's fallback instead of the rule. Tab is also the exact
 * input the feature is scoped to, so this is the honest gesture anyway.
 */
const tabTo = async (page, selector) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let press = 0; press < 40; press += 1) {
    await page.keyboard.press("Tab");
    const arrived = await page.evaluate(
      (sel) => document.activeElement === document.querySelector(sel),
      selector,
    );
    if (arrived) return;
  }
  throw new Error(`Tab never reached ${selector} in 40 presses`);
};

const focusState = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return {
      what: `${el.tagName}${el.id ? "#" + el.id : ""} "${(el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`,
      modality: document.documentElement.getAttribute("data-focus"),
      outlineStyle: s.outlineStyle,
      outlineColor: s.outlineColor,
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
    };
  });

/*
 * Poll until the indicator matches, then assert on the last value read. A
 * genuinely wrong indicator still fails, and the message carries what it saw.
 */
const expectIndicator = async (page, { holds, expected, describe }) => {
  let last = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    last = await focusState(page);
    if (holds(last)) return last;
    await settle(page);
  }
  expect(last, `${expected} (settled at ${describe(last)})`).toBe("unreachable");
  return last;
};

/*
 * The mirror, for the assertions that require something NOT to happen. Polling
 * until a condition holds is useless there: "nothing painted yet" is true on the
 * first read, before any style could have applied, so it would pass on the very
 * bug it exists to catch. So sample across a window and fail if any sample
 * breaks the expectation.
 */
const expectIndicatorStays = async (page, { holds, expected, describe }) => {
  for (let sample = 0; sample < 8; sample += 1) {
    const state = await focusState(page);
    expect(holds(state), `${expected} (saw ${describe(state)})`).toBe(true);
    await settle(page);
  }
};

const asOutline = (state) =>
  `outline: ${state.outlineStyle} ${state.outlineWidth} ${state.outlineColor}`;

// The controls that used to borrow the browser's ring, each with the selector
// that reaches it and the section it belongs to.
const PREVIOUSLY_UNSTYLED = [
  { name: "service tab", selector: '[role="tab"]', tabbable: "explicit-tabindex-only" },
  { name: "cases rail", selector: "#cases-rail" },
  {
    name: "billing label",
    selector: "[data-motion-toggle] button:first-child",
    tabbable: "explicit-tabindex-only",
  },
  {
    name: "billing switch",
    selector: 'button[aria-label="Alternar período de contratação"]',
    tabbable: "explicit-tabindex-only",
  },
  { name: "faq trigger", selector: "#faq-trigger-0", tabbable: "explicit-tabindex-only" },
];

/*
 * Safari moves Tab focus only to text fields and lists unless the user turns on
 * full keyboard access, so a <button> or an <a> is simply not reachable by Tab
 * in WebKit -- `tabTo` cannot produce the gesture, and forcing focus another way
 * would measure nothing, because `:focus-visible` does not match programmatic
 * focus.
 *
 * So these are skipped there rather than weakened: the gesture does not exist on
 * that platform. The cases rail is the exception and keeps running everywhere,
 * because its explicit tabIndex={0} makes it a tab stop in WebKit too -- and it
 * is the element the reported defect was actually on.
 */
const isWebKit = (browserName) => browserName === "webkit";

/*
 * The cases rail is the element the reported defect was on, and it is also the
 * only focusable scroll container on the page -- so the click-then-arrow path
 * cannot be reproduced without it.
 *
 * Its section is commented out of src/app/page.tsx until the real cases exist.
 * These assertions therefore stand down while it is away rather than being
 * rewritten around it, and come back with the section. The modality mechanism
 * they cover stays under test below, on a control that is always on the page.
 */
const railIsOnThePage = (page) =>
  page.evaluate(() => Boolean(document.querySelector("#cases-rail")));

test.describe("focus indicators", () => {
  for (const control of PREVIOUSLY_UNSTYLED) {
    test(`the ${control.name} draws the palette's ring on keyboard focus`, async ({
      page,
      browserName,
    }) => {
      test.skip(
        control.tabbable === "explicit-tabindex-only" && isWebKit(browserName),
        "WebKit does not put buttons or links in the tab order without full keyboard access",
      );

      await gotoLanding(page, 1280);

      test.skip(
        !(await railIsOnThePage(page)) && control.selector === "#cases-rail",
        "the testimonials section is hidden until its real content lands",
      );

      await tabTo(page, control.selector);

      const state = await expectIndicator(page, {
        holds: (s) => s.outlineColor === HIGHLIGHT && s.outlineWidth === "2px",
        expected: `the ${control.name} never drew the palette's 2px highlight outline`,
        describe: asOutline,
      });

      // `auto` is the browser's own ring, and it ignores outline-color -- so a
      // green outline-color with style `auto` still paints Chrome's blue.
      expect(
        state.outlineStyle,
        `the ${control.name} is back on the browser's own ring`,
      ).not.toBe("auto");
    });
  }

  test("the CTAs keep their ring rather than an outline", async ({ page, browserName }) => {
    test.skip(
      isWebKit(browserName),
      "WebKit does not put links in the tab order without full keyboard access",
    );

    await gotoLanding(page, 1280);
    await tabTo(page, "[data-hero-content] a[data-cta-button]");

    const state = await expectIndicator(page, {
      holds: (s) => s.boxShadow.includes("133, 208, 45"),
      expected: "the hero CTA lost the green ring it draws instead of an outline",
      describe: (s) => `box-shadow: ${s.boxShadow}`,
    });

    expect(state.outlineStyle).toBe("none");
  });
});

test.describe("focus rings only on Tab", () => {
  test("clicking the cases rail and scrolling with an arrow paints nothing", async ({ page }) => {
    await gotoLanding(page, 1280);
    test.skip(
      !(await railIsOnThePage(page)),
      "the testimonials section is hidden until its real content lands",
    );

    const rail = page.locator("#cases-rail");
    await rail.scrollIntoViewIfNeeded();
    await rail.click({ position: { x: 40, y: 40 } });

    // The click itself focuses the rail -- it is a scroll container. That part
    // is fine and invisible; what matters is that it STAYS invisible.
    const clicked = await focusState(page);
    expect(clicked.what).toContain("cases-rail");
    expect(clicked.modality).toBe("pointer");

    await expectIndicatorStays(page, {
      holds: (s) => s.outlineStyle === "none",
      expected: "clicking the rail painted an outline on it",
      describe: asOutline,
    });

    await page.keyboard.press("ArrowRight");

    /*
     * The reported bug, exactly: the arrow key makes `:focus-visible` true even
     * though focus arrived from a click, so before FocusRings this found Chrome's
     * blue ring drawn around the full width of the rail.
     */
    expect(
      (await focusState(page)).modality,
      "an arrow key was treated as the focus source",
    ).toBe("pointer");

    await expectIndicatorStays(page, {
      holds: (s) => s.outlineStyle === "none" && !s.boxShadow.includes("133, 208, 45"),
      expected: "scrolling with an arrow after a click lit the rail up",
      describe: asOutline,
    });
  });

  test("an arrow key after a click is not treated as the focus source", async ({ page }) => {
    await gotoLanding(page, 1280);

    /*
     * The FAQ trigger stands in for the rail here: it is always on the page, and
     * what this measures is the mechanism rather than the element -- a keyboard
     * event that is not Tab must not flip the modality, which is the whole
     * reason `:focus-visible` alone was not enough.
     */
    const trigger = page.locator("#faq-trigger-0");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    expect((await focusState(page)).modality).toBe("pointer");

    await page.keyboard.press("ArrowDown");

    await expectIndicatorStays(page, {
      holds: (s) => s.modality === "pointer" && s.outlineStyle === "none",
      expected: "an arrow key after a click lit the focused control up",
      describe: (s) => `data-focus="${s.modality}", ${asOutline(s)}`,
    });
  });

  test("Tab brings the indicator back after a click", async ({ page }) => {
    await gotoLanding(page, 1280);

    const trigger = page.locator("#faq-trigger-0");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.keyboard.press("Tab");

    await expectIndicator(page, {
      holds: (s) => s.modality === "keyboard",
      expected: "Tab did not restore the keyboard modality, so keyboard users get no indicator",
      describe: (s) => `data-focus="${s.modality}"`,
    });
  });
});
