import { expect, test } from "@playwright/test";

import { gotoLanding, HEIGHT } from "./sections/helpers.mjs";

/*
 * No section heading may end on a single word.
 *
 * A lone last word is not an edge case on this page -- before the ties that this
 * suite guards, four of the ten headings had one, and two of them had it at
 * essentially every desktop width: "diferente." was the whole second line of the
 * services heading from 768px up, and "trabalhar." the whole third line of the
 * about heading from 835px (Chromium) / 847px (WebKit) up.
 *
 * What actually prevents it is a non-breaking space tying the last word to the
 * one before it, in the section's own copy. `text-wrap: balance` is not a
 * substitute and is not what this suite verifies: it is a heuristic, engines
 * disagree on the result, and Chromium stops balancing past a line-count cap.
 * The tie is a property of the text, so it holds in every engine at every width.
 *
 * The sweep is every integer width, not a handful of samples, because the widths
 * that break are found nowhere near round numbers -- the faq heading's lone word
 * lives in a 1024-1119px band on Chromium and 1024-1141px on WebKit, and a
 * 100px-step sample of that range sees it once or not at all.
 */

const FROM = 768;
// Above this width every container on the page has hit its max-width and the
// page padding its 6rem cap, so no heading can rewrap. The second test is what
// makes that a measurement instead of an assumption.
const TO = 1400;
const FROZEN_ABOVE = [1400, 1920, 2560];

/*
 * The lines of every h1/h2, as arrays of words.
 *
 * Runs in the page. Two details it would be wrong without:
 *
 * - The words come from one flat string over all the descendant text nodes, so a
 *   word split across an inline element counts once. Several headings put their
 *   final period outside the highlight span ("<span>diferente</span>."), and
 *   measuring per text node reads that as two words -- which is exactly a lone
 *   last word reported as a passing two-word line.
 * - Lines are grouped with a tolerance rather than an exact top. WebKit reports
 *   the text inside a nested span a hundredth of a pixel above its neighbours,
 *   and an exact comparison turns that word into a line of its own.
 */
const measureHeadings = () => {
  const linesOf = (element) => {
    const segments = [];
    let text = "";
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      segments.push({ node, from: text.length });
      text += node.textContent;
    }

    const locate = (index) => {
      let found = segments[0];
      for (const segment of segments) if (segment.from <= index) found = segment;
      return { node: found.node, offset: index - found.from };
    };

    const words = [];
    // Split on both kinds of space: a tie makes two words share a line, it does
    // not make them one word, so the count has to see through it.
    const pattern = /[^\s ]+/g;
    let match;
    while ((match = pattern.exec(text))) {
      const start = locate(match.index);
      const end = locate(match.index + match[0].length - 1);
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      words.push({ word: match[0], top: rect.top, height: rect.height });
    }
    if (!words.length) return null;

    const tolerance = Math.max(4, words[0].height * 0.4);
    const lines = [[words[0]]];
    for (const word of words.slice(1)) {
      const line = lines[lines.length - 1];
      if (Math.abs(word.top - line[0].top) <= tolerance) line.push(word);
      else lines.push([word]);
    }
    return lines.map((line) => line.map((word) => word.word));
  };

  return Array.from(document.querySelectorAll("h1, h2"))
    .map((element) => ({
      id: element.id || (element.textContent || "").trim().slice(0, 32),
      lines: linesOf(element),
    }))
    .filter((heading) => heading.lines);
};

/*
 * The iPhone profile cannot present a width in this range at all, and it runs the
 * same WebKit that the `webkit` project sweeps. Resizing it to 1400px would
 * measure a viewport no iPhone has, on top of that profile's own text
 * autosizing -- a second reading of nothing.
 */
test.describe("headings", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "widths >= 768px need a desktop profile");

  test(`no heading ends on a single word from ${FROM}px to ${TO}px`, async ({ page }) => {
    // ~630 widths, each a reflow and a measurement. Long by design, and the
    // length is the coverage: see the faq band above.
    test.slow();
    await gotoLanding(page, FROM);

    const offenders = [];
    for (let width = FROM; width <= TO; width += 1) {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

      for (const heading of await page.evaluate(measureHeadings)) {
        if (heading.lines.length < 2) continue;
        const last = heading.lines[heading.lines.length - 1];
        if (last.length === 1) {
          offenders.push(
            `${width}px: "${heading.id}" ends on "${last[0]}" alone (line ${heading.lines.length} of ${heading.lines.length})`,
          );
        }
      }
    }

    expect(offenders.slice(0, 12).join("\n"), `${offenders.length} lone last words`).toBe("");
  });

  test("no heading rewraps above the swept range", async ({ page }) => {
    await gotoLanding(page, FROZEN_ABOVE[0]);

    const readings = [];
    for (const width of FROZEN_ABOVE) {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      readings.push(await page.evaluate(measureHeadings));
    }

    const asText = (reading) =>
      reading.map((heading) => `${heading.id}: ${heading.lines.map((l) => l.join(" ")).join(" / ")}`).join("\n");

    for (const [index, reading] of readings.slice(1).entries()) {
      expect(
        asText(reading),
        `headings wrap differently at ${FROZEN_ABOVE[index + 1]}px than at ${FROZEN_ABOVE[0]}px, so the sweep's upper bound is wrong`,
      ).toBe(asText(readings[0]));
    }
  });
});
