import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

const SECTION = "section:has(#faq-heading)";

test.describe("faq", () => {
  /*
   * Gabriel: the title is too big and the section "looks infinite" on a large
   * screen. Both measured.
   *
   * The title is `text-display-2` -- 56px at these widths -- where every sibling
   * section heading is `text-heading-2` at 40px. `text-display`/`display-2` is the
   * hero's scale step, not a section heading's.
   *
   * And the section's inner grid is the only one on the page with no max-width:
   * 1088px at 1280, 1408px at 1600, 1728px at 1920, growing with the viewport
   * forever, while its siblings cap at max-w-wide (70rem) or max-w-content (68rem).
   */
  for (const width of [1280, 1600, 1920]) {
    test(`the faq heading matches its sibling sections at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const sizes = await page.evaluate((selector) => {
        const faq = document.querySelector(`${selector} #faq-heading`);
        const siblings = Array.from(document.querySelectorAll("main > section h2"))
          .filter((heading) => heading.id !== "faq-heading")
          .map((heading) => parseFloat(getComputedStyle(heading).fontSize));
        return {
          faq: parseFloat(getComputedStyle(faq).fontSize),
          siblings: [...new Set(siblings)].sort((a, b) => a - b),
        };
      }, SECTION);

      expect(sizes.siblings.length, "no sibling headings to compare against").toBeGreaterThan(0);
      expect(
        sizes.faq,
        `the faq heading is ${sizes.faq}px where its siblings are ${sizes.siblings.join("/")}px`,
      ).toBeLessThanOrEqual(Math.max(...sizes.siblings));
    });

  }

  /*
   * Measured inner-grid width: 1088px at 1280, 1408px at 1600, 1728px at 1920 --
   * it tracks the viewport with no ceiling, which is the "looks infinite".
   *
   * The bound comes from the page's own `--container-wide` token rather than a
   * literal, so changing the token moves the assertion with it. Comparing against
   * sibling sections was the first attempt and it was meaningless: several wrap
   * their heading in a full-width `px-page` div, so "the widest sibling" is the
   * viewport and the check passes on anything.
   */
  test("the faq content stops widening on a large screen", async ({ page }) => {
    await gotoLanding(page, 1920);

    const measured = await page.evaluate((selector) => {
      const section = document.querySelector(selector);
      const inner = section.querySelector("#faq-heading").closest("div").parentElement;
      const token = getComputedStyle(document.documentElement)
        .getPropertyValue("--container-wide")
        .trim();
      const probe = document.createElement("div");
      probe.style.width = token;
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      document.body.append(probe);
      const cap = Math.round(probe.getBoundingClientRect().width);
      probe.remove();
      return { inner: Math.round(inner.getBoundingClientRect().width), cap, token };
    }, SECTION);

    expect(measured.cap, "--container-wide did not resolve to a width").toBeGreaterThan(0);
    expect(
      measured.inner,
      `the faq content is ${measured.inner}px wide at 1920px, past the ${measured.token} (${measured.cap}px) its siblings cap at`,
    ).toBeLessThanOrEqual(measured.cap);
  });

  test("the faq content is the same width at 1600px and 1920px", async ({ page }) => {
    const widthAt = async (viewport) => {
      await gotoLanding(page, viewport);
      return page.evaluate((selector) => {
        const inner = document
          .querySelector(selector)
          .querySelector("#faq-heading")
          .closest("div").parentElement;
        return Math.round(inner.getBoundingClientRect().width);
      }, SECTION);
    };

    const at1600 = await widthAt(1600);
    const at1920 = await widthAt(1920);

    expect(
      at1920,
      `the faq content grew from ${at1600}px to ${at1920}px, so nothing is capping it`,
    ).toBe(at1600);
  });

  // The accordion is the section's whole interaction; the panel has to actually
  // open and close, and reduced motion has to reach the same end state.
  test("an faq panel opens and closes", async ({ page }) => {
    await gotoLanding(page, 1280);

    const trigger = page.locator(`${SECTION} button[aria-expanded]`).first();
    await trigger.scrollIntoViewIfNeeded();

    const panelId = await trigger.getAttribute("aria-controls");
    expect(panelId, "the trigger does not reference a panel").toBeTruthy();
    const height = () =>
      page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().height), panelId);

    await expect(trigger, "the first panel does not start closed").toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(await height(), "a closed panel is not collapsed").toBeLessThanOrEqual(1);

    await trigger.click();
    await page.waitForTimeout(700);
    await expect(trigger, "clicking did not expand the panel").toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(await height(), "an expanded panel has no height").toBeGreaterThan(10);

    await trigger.click();
    await page.waitForTimeout(700);
    expect(await height(), "clicking again did not collapse the panel").toBeLessThanOrEqual(1);
  });
});
