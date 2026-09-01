import { expect, test } from "@playwright/test";

import { gotoLanding } from "./helpers.mjs";

const SECTION = "section:has([data-info-card])";

/*
 * Gabriel reported the section as broken, the photo as too big, the text
 * container as wanting a bit more room, and "Projetos internacionais" wrapping.
 * Measured at 1280px, with the missing photo files stood in for so the layout is
 * the one that ships rather than what a broken <img> collapses to:
 *
 *   photo column   416px, photo 416x416   (2 of 5 grid columns)
 *   content column 640px                  (3 of 5)
 *
 * A 416px square headshot is the "too big"; the ratio is where both come from.
 *
 * Wrapped stat labels: all six at 390px (83px each), all six at 1024px (121px),
 * and "Projetos internacionais" at 1280 and 1600 (165px). None at 768px, where
 * the compact card gives them more room.
 */
test.describe("about", () => {
  // The files themselves are Gabriel's to provide -- asserting they LOAD would
  // park this section red on someone else's todo. What is in this section's gift
  // is the path form, and it is wrong today: `/images/...` is absolute, so it
  // resolves to the domain root and skips the export's `basePath: "/tessele"`.
  // That is why the photos render 0x0 rather than merely 404-ing.
  test("photo paths resolve under the export's basePath", async ({ page }) => {
    await gotoLanding(page, 1280);

    const srcs = await page.evaluate(
      (selector) =>
        Array.from(document.querySelector(selector).querySelectorAll("img")).map((img) =>
          img.getAttribute("src"),
        ),
      SECTION,
    );

    expect(srcs.length, "no images found in the about section").toBeGreaterThan(0);

    const absolute = srcs.filter((src) => src?.startsWith("/"));
    expect(
      absolute,
      "these bypass the basePath and resolve at the domain root, where nothing is served",
    ).toEqual([]);

    const external = srcs.filter((src) => /^https?:\/\//.test(src ?? ""));
    expect(external, "about photos point at a third-party origin").toEqual([]);
  });

  for (const width of [390, 768, 1024, 1280, 1600]) {
    test(`no stat label wraps at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const wrapped = await page.evaluate((selector) => {
        const out = [];
        for (const el of document.querySelector(selector).querySelectorAll("[data-info-card] span")) {
          if (el.children.length) continue;
          const text = (el.textContent ?? "").trim();
          if (!text) continue;
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
          if (!lineHeight) continue;
          const box = el.getBoundingClientRect();
          if (box.height === 0) continue;
          const lines = Math.round(box.height / lineHeight);
          if (lines > 1) out.push({ text, lines, widthPx: Math.round(box.width) });
        }
        return out;
      }, SECTION);

      expect(wrapped, "stat labels broken across lines").toEqual([]);
    });
  }

  // Bounds, not a ratio: the photo has to stop dominating its row and the copy
  // has to gain room, but which grid split delivers that is an implementation
  // choice. Today's numbers (416 / 640) fail both ends.
  test("the photo yields room to the copy on desktop", async ({ page }) => {
    await gotoLanding(page, 1280);

    const row = await page.evaluate((selector) => {
      const section = document.querySelector(selector);
      const profile = section.querySelector("[data-row-profile]");
      const content = section.querySelector("[data-row-content]");
      const photo = section.querySelector("[data-photo]");
      const width = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null);
      return {
        profile: width(profile),
        content: width(content),
        photo: width(photo),
        photoHeight: photo ? Math.round(photo.getBoundingClientRect().height) : null,
      };
    }, SECTION);

    expect(row.photo, "the desktop photo was not found").toBeTruthy();
    expect(
      row.photo,
      `the photo is still ${row.photo}px wide -- it reads as a hero image, not a portrait`,
    ).toBeLessThanOrEqual(320);
    expect(
      row.content,
      `the copy column is still only ${row.content}px wide`,
    ).toBeGreaterThanOrEqual(700);
    expect(
      row.content,
      "the copy column should be the wider of the two",
    ).toBeGreaterThan(row.profile);
  });
});
