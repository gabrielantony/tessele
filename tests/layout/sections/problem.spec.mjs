import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * Phase 2 of docs/plans/2026-09-01-problem-section-and-gpt-sections.md, still
 * open after phase 1 fixed the orbit geometry.
 *
 * Below 640px the orbit card is `w-space-24` (96px) with `px-space-3`, so 72px of
 * content box, and the labels rendered at 14px/700 uppercase need more:
 *
 *   PERCEPÇÃO    84px  (+12)
 *   CONFIANÇA    84px  (+12)
 *   EXPERIÊNCIA  92px  (+20)
 *
 * The card steps absolutely (w-space-24 / sm:w-space-32 / lg:w-space-40) against
 * a square that is fluid -- the same mismatch phase 1 fixed one level up.
 *
 * The suite's `parentOverflow` probe cannot see this: it compares element boxes,
 * and a text run is not an element. The <p> box is 72px wide while its glyphs
 * paint outside it, so the measurement has to come from Range.getClientRects().
 */
const TEXT_OUTSIDE_ITS_BOX = () => {
  const findings = [];
  for (const card of document.querySelectorAll("[data-orbit-card]")) {
    for (const el of card.querySelectorAll("p")) {
      if (el.children.length) continue;
      const text = (el.textContent ?? "").trim();
      if (!text) continue;

      const style = getComputedStyle(el);
      const content =
        el.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);

      // The painted width of the widest line, which is what actually escapes --
      // el.scrollWidth rounds and misses sub-pixel overflow.
      const range = document.createRange();
      range.selectNodeContents(el);
      const widest = Math.max(
        0,
        ...Array.from(range.getClientRects()).map((rect) => rect.width),
      );

      const over = Math.round(widest - content);
      if (over > 1) {
        findings.push({
          text: text.slice(0, 28),
          paintedPx: Math.round(widest),
          contentBoxPx: Math.round(content),
          overflowPx: over,
        });
      }
    }
  }
  return findings;
};

test.describe("problem", () => {
  for (const width of [320, 390, 430, 640, 768, 1024, 1280, 1600]) {
    test(`no orbit card label paints outside its card at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const cards = await page.locator("[data-orbit-card]").count();
      expect(cards, "no orbit cards found").toBeGreaterThan(0);

      const findings = await page.evaluate(TEXT_OUTSIDE_ITS_BOX);
      expect(findings, "label glyphs painting outside the card holding them").toEqual([]);
    });
  }
});
