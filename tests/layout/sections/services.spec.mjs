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

  /*
   * Gabriel reported the card jumping height when he switched tabs. Measured
   * before the fix, the card's own height per tab (Estrategia / Design /
   * Trafego):
   *
   *   375px    964  922  892   (72px jump)
   *   640px    849  825  825   (24px)
   *   768px    737  713  713   (24px)
   *   1024px   705  681  657   (48px)
   *   1280px   513  525  489   (36px)
   *
   * Note which tab is tallest changes with width -- Estrategia below 1280px,
   * Design above it -- because the title and the description wrap at different
   * points. That is why the card reserves the tallest copy by stacking every
   * service's copy in one grid cell instead of carrying a min-height: any single
   * number would be a guess at every width but the ones measured here.
   *
   * This is also the assertion that pays for the `[data-tab-copy-stack]` entry
   * in landing-layout's overlappingSiblings: that probe no longer looks inside
   * the stack, so the invariant the stack exists for is measured here.
   */
  for (const width of [375, 390, 640, 768, 1024, 1100, 1280, 1600]) {
    test(`the card keeps its height across tabs at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const card = page.locator("[data-card]");
      await card.scrollIntoViewIfNeeded();

      const tabs = page.locator("[data-tab-button]");
      const count = await tabs.count();
      expect(count, "no service tabs found").toBeGreaterThan(1);

      const heights = [];
      for (let index = 0; index < count; index += 1) {
        const tab = tabs.nth(index);
        await tab.click();
        await page.waitForFunction(
          (expected) =>
            document
              .querySelector('[data-tab-button][aria-selected="true"]')
              ?.textContent?.trim() === expected,
          (await tab.textContent())?.trim(),
        );
        await page.waitForTimeout(400);

        heights.push({
          tab: (await tab.textContent())?.trim(),
          heightPx: Math.round((await card.boundingBox()).height),
        });
      }

      const distinct = [...new Set(heights.map((entry) => entry.heightPx))];
      expect(
        distinct.length,
        `the card changes height between tabs: ${JSON.stringify(heights)}`,
      ).toBe(1);
    });
  }

  /*
   * Gabriel's rule, given after the copy rewrite: no line of copy in this
   * section may hold a single word. It is a rule about the rendered result, so
   * it is measured as one -- the assertion counts the words that actually land
   * on the last line box, not whether the source string contains a `&nbsp;`.
   * A fix that ties the words a different way, or a wrap that never needed
   * tying at this width, both pass.
   *
   * Every service's title and description is measured on one page load, active
   * tab or not: `[data-tab-copy-stack]` lays all three in the same grid cell
   * and hides the inactive ones with `visibility`, which leaves their geometry
   * intact and identical to what the reader gets after clicking the tab.
   *
   * A non-breaking space is ordinary whitespace to `\S+` here, on purpose: a
   * tied pair has to count as the two words the reader sees on that line, or
   * the measurement would be of the mechanism instead of the outcome.
   */
  const WIDOWS = () => {
    const out = [];
    const section = document.querySelector("[data-name='servicos-e-entregas']");
    if (!section) return [{ error: "services section not found" }];

    for (const el of section.querySelectorAll("h2, h3, p")) {
      const text = (el.textContent ?? "").trim();
      if (!text) continue;

      const whole = document.createRange();
      whole.selectNodeContents(el);

      // One rect per rendered line box. Inline children can add slivers, so the
      // last line is found by its offset rather than by taking the last entry.
      const lines = Array.from(whole.getClientRects()).filter(
        (rect) => rect.width > 0.5 && rect.height > 0.5,
      );
      if (lines.length < 2) continue;

      const lastTop = Math.max(...lines.map((rect) => rect.top));

      // A TreeWalker rather than el.childNodes: the section heading splits its
      // last word into a <span> to colour it, so words do not all share a node.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let onLastLine = 0;
      let node;
      while ((node = walker.nextNode())) {
        const value = node.textContent ?? "";
        const words = /\S+/g;
        let match;
        while ((match = words.exec(value))) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          const box = range.getBoundingClientRect();
          if (box.width === 0 && box.height === 0) continue;
          if (Math.abs(box.top - lastTop) < 2) onLastLine += 1;
        }
      }

      if (onLastLine < 2) {
        out.push({
          tag: el.tagName,
          lines: lines.length,
          wordsOnLastLine: onLastLine,
          text: text.slice(0, 70),
        });
      }
    }

    return out;
  };

  for (const width of [375, 390, 430, 640, 767, 768, 900, 1024, 1280, 1600]) {
    test(`no copy in the section ends on a widow at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const section = page.locator("[data-name='servicos-e-entregas']");
      await section.scrollIntoViewIfNeeded();

      const widows = await page.evaluate(WIDOWS);
      expect(widows, "copy ending on a line with one word").toEqual([]);
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

    // Scoped to this section's own requests on purpose. A page-wide assertion
    // here would fail on the media other sections are still missing -- files
    // Gabriel owes -- which would force whoever fixes this section to go fix
    // assets outside it, or to leave the section red for a reason that has
    // nothing to do with it.
    const ourFailures = failed.filter((entry) => /\/images\/services-/.test(entry));
    expect(ourFailures, "requests for the service photos that failed").toEqual([]);
  });
});
