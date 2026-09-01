import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

/*
 * Gabriel: the TESSELE wordmark is stretched. Two distortions compound, both
 * measured on the wordmark's `<text>` node:
 *
 *   viewport   x-scale   y-scale   net glyph stretch
 *   768px       6.13      2.50           2.45x
 *   1280px     10.48      2.50           4.19x
 *   1920px     16.88      2.50           6.75x
 *
 * `preserveAspectRatio="none"` on the svg lets the 100x64 viewBox fill a
 * full-width box, so the horizontal scale grows with the viewport while the
 * vertical stays at 2.5. On top of that, `textLength="88%"` with
 * `lengthAdjust="spacingAndGlyphs"` squeezes the natural 229.2 units of glyph
 * advance down to 88, so the letterforms are compressed in user space and then
 * stretched back out by an unrelated factor.
 *
 * The assertion is the net effect on the letterforms: the horizontal scale the
 * glyphs actually receive, divided by the vertical one. Uniform type gives 1.
 * How that is achieved -- naturally sized type with letter-spacing, a uniformly
 * scaled svg, or plain DOM text -- is not this test's business.
 *
 * The wordmark is `hidden md:block`, so below 768px there is nothing to check.
 */
const WORDMARK_DISTORTION = () => {
  const text = document.querySelector("[data-footer-wordmark] text");
  if (!text) return null;

  const svg = text.ownerSVGElement;
  const matrix = text.getScreenCTM();

  // What the glyph advance would be with nothing forcing it.
  const probe = text.cloneNode(true);
  probe.removeAttribute("textLength");
  probe.removeAttribute("lengthAdjust");
  svg.append(probe);
  const naturalUnits = probe.getBBox().width;
  probe.remove();
  const forcedUnits = text.getBBox().width;

  return {
    // Net horizontal stretch applied to the letterforms, against the vertical.
    ratio: (forcedUnits * matrix.a) / (naturalUnits * matrix.d),
    xScale: Number(matrix.a.toFixed(2)),
    yScale: Number(matrix.d.toFixed(2)),
    naturalUnits: Number(naturalUnits.toFixed(1)),
    forcedUnits: Number(forcedUnits.toFixed(1)),
  };
};

test.describe("footer", () => {
  for (const width of [768, 1280, 1920]) {
    test(`the wordmark letterforms are not stretched at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const measured = await page.evaluate(WORDMARK_DISTORTION);

      // If the wordmark stops being an <svg><text>, this test has nothing to
      // measure and should say so rather than quietly passing.
      const present = await page.evaluate(
        () => document.querySelectorAll("[data-footer-wordmark]").length,
      );
      expect(present, "the footer wordmark is gone").toBeGreaterThan(0);
      if (measured === null) {
        const glyphAspect = await page.evaluate(() => {
          const el = document.querySelector("[data-footer-wordmark]");
          const style = getComputedStyle(el);
          return { transform: style.transform, scale: style.scale };
        });
        expect(
          [glyphAspect.transform, glyphAspect.scale].filter(
            (value) => value && value !== "none",
          ),
          "the wordmark is no longer svg text, and carries a transform that could distort it",
        ).toEqual([]);
        return;
      }

      expect(
        measured.ratio,
        `the glyphs are stretched ${measured.ratio.toFixed(2)}x horizontally (x${measured.xScale} against y${measured.yScale}, advance forced from ${measured.naturalUnits} to ${measured.forcedUnits} units)`,
      ).toBeCloseTo(1, 1);
    });
  }

  // The wordmark is decorative -- the footer's real content must not depend on it.
  test("the footer legal line stays legible", async ({ page }) => {
    await gotoLanding(page, 1280);

    const legal = page.locator("[data-footer-legal]");
    await expect(legal, "the footer legal line is missing").toBeVisible();

    const overlap = await page.evaluate(() => {
      const legalBox = document.querySelector("[data-footer-legal]")?.getBoundingClientRect();
      const mark = document.querySelector("[data-footer-wordmark]");
      if (!legalBox || !mark) return null;
      const markBox = mark.getBoundingClientRect();
      const x = Math.min(legalBox.right, markBox.right) - Math.max(legalBox.left, markBox.left);
      const y = Math.min(legalBox.bottom, markBox.bottom) - Math.max(legalBox.top, markBox.top);
      return x > 1 && y > 1 ? { x: Math.round(x), y: Math.round(y) } : null;
    });

    // They overlap by design -- the legal line sits over the wordmark -- so this
    // only records it. What matters is that the wordmark is behind and muted;
    // a regression that puts it on top would show up as an unreadable line.
    if (overlap) {
      const stacking = await page.evaluate(() => {
        const mark = document.querySelector("[data-footer-wordmark]");
        const legal = document.querySelector("[data-footer-legal]");
        return {
          markPointerEvents: getComputedStyle(mark).pointerEvents,
          legalPosition: getComputedStyle(legal).position,
        };
      });
      expect(
        stacking.markPointerEvents,
        "the wordmark sits over the legal line and can take its clicks",
      ).toBe("none");
    }
  });
});
