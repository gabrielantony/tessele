import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * Gabriel reported one wrapped item -- "Desenvolvimento e otimização" on the
 * Design tab. Measuring every tab at every width found the class it belongs to:
 *
 *   viewport  columns  label width  wrapped labels
 *   320px     1        162px        12
 *   390px     1        222px         1  (4px short)
 *   430-767   1        256-542px     0
 *   768px     2         95px        16  (some at THREE lines)
 *   900px     2        129px        14
 *   1024px    2        161px        12
 *   1280px    2        226px         1  (under a pixel short)
 *
 * `md:grid-cols-2` forces two columns from 768px up regardless of whether the
 * labels fit, so the worst band is the one nobody looked at. The longest label
 * needs ~226px of text width; the assertion is the effect (one line), not a
 * width, so any mechanism that delivers it passes.
 *
 * 320px is excluded deliberately: 226px of text cannot fit a 162px column at
 * this type size, so demanding one line there would be demanding a type change
 * nobody asked for. It is a question for Gabriel, recorded in the plan, not a
 * silenced assertion -- every other width is held.
 */
const WIDTHS = [390, 430, 640, 767, 768, 900, 1024, 1280, 1600];

const WRAPPED_LABELS = () => {
  const out = [];
  for (const label of document.querySelectorAll("[data-tab-item-label]")) {
    const style = getComputedStyle(label);
    const lineHeight = parseFloat(style.lineHeight);
    if (!lineHeight) continue;
    const box = label.getBoundingClientRect();
    if (box.height === 0) continue;
    const lines = Math.round(box.height / lineHeight);
    if (lines > 1) {
      out.push({
        text: (label.textContent ?? "").trim(),
        lines,
        labelWidthPx: Math.round(box.width),
      });
    }
  }
  return out;
};

test.describe("services", () => {
  for (const width of WIDTHS) {
    test(`no service item label wraps at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const tabs = page.locator("[data-tab-button]");
      const count = await tabs.count();
      expect(count, "no service tabs found").toBeGreaterThan(1);

      // Every tab, not just the one that was reported: each renders a different
      // item list into the same grid, and the longest label decides the layout.
      const wrappedByTab = [];
      for (let index = 0; index < count; index += 1) {
        const tab = tabs.nth(index);
        await tab.scrollIntoViewIfNeeded();
        await tab.click();
        // The card cross-fades its content on tab change; wait for the swap to
        // settle so the measurement is of the incoming list, not the outgoing.
        await page.waitForFunction(
          (expected) =>
            document.querySelectorAll("[data-tab-item-label]").length > 0 &&
            document.querySelector('[data-tab-button][aria-selected="true"]')?.textContent?.trim() ===
              expected,
          (await tab.textContent())?.trim(),
        );
        await page.waitForTimeout(400);

        const wrapped = await page.evaluate(WRAPPED_LABELS);
        if (wrapped.length) {
          wrappedByTab.push({ tab: (await tab.textContent())?.trim(), wrapped });
        }
      }

      expect(wrappedByTab, "service item labels broken across lines").toEqual([]);
    });
  }

  // The photos were hotlinked from images.unsplash.com. A static export that
  // reaches a third party on every load is a dependency nobody declared, so they
  // are served from public/images now -- and this is what keeps them there.
  test("service photos are served from this origin and actually load", async ({ page }) => {
    const failed = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });

    await gotoLanding(page, 1280);

    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-name='servicos-e-entregas'] img")).map((img) => ({
        src: img.getAttribute("src") ?? "",
        loaded: img.complete && img.naturalWidth > 0,
      })),
    );

    expect(images.length, "no images found in the services section").toBeGreaterThan(0);

    const external = images.filter((img) => /^https?:\/\//.test(img.src));
    expect(external, "service photos still point at a third-party origin").toEqual([]);

    const broken = images.filter((img) => !img.loaded);
    expect(broken, "service photos did not load").toEqual([]);
    expect(failed, "requests that failed while loading the page").toEqual([]);
  });
});
