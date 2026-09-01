import { expect, test } from "@playwright/test";

import { assertCtaMechanics, gotoLanding } from "./helpers.mjs";

test.describe("foundations", () => {
  // Raleway ships old-style figures by default: digits with ascenders and
  // descenders, like lowercase letters. Every number on the page sits visually
  // misaligned against its uppercase/caps context because of it. The fix is one
  // token-level declaration, so the assertion samples real digit-bearing
  // elements and checks the computed value the browser actually applies --
  // not whether some class name appears in the source.
  test("digits render as lining figures, not old-style", async ({ page }) => {
    await gotoLanding(page, 1280);

    const sampled = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("p, span, h2, h3")) {
        if (el.children.length) continue;
        if (!/\d/.test(el.textContent ?? "")) continue;
        const v = getComputedStyle(el).fontVariantNumeric;
        out.push({ text: (el.textContent ?? "").trim().slice(0, 24), variant: v });
        if (out.length >= 8) break;
      }
      return out;
    });

    expect(sampled.length, "no digit-bearing elements found to sample").toBeGreaterThan(2);
    for (const s of sampled) {
      expect(
        s.variant.includes("lining-nums"),
        `"${s.text}" renders with font-variant-numeric "${s.variant}" -- old-style figures`,
      ).toBe(true);
    }
  });

  // Pins the Hero CTA mechanics before they are extracted into the shared
  // component: green today, and must stay green through the refactor. The same
  // contract is what each section's CTA will be held to as it adopts the
  // component.
  // Scoped to the hero rather than selecting [data-cta] globally: that attribute
  // is also hand-written on an anchor in OurProcessSection, so a bare selector
  // matches two elements and .first() would only find the hero by page order --
  // silently changing subject if the page is ever reordered.
  // [data-cta-button] is owned by the shared component; the hero is identified by
  // being the section that carries the page's h1, and asserting that is what makes
  // the scoping visible instead of accidental.
  //
  // This read `main > section:first-of-type` until CurtainTransition began
  // wrapping the Hero, at which point the Hero stopped being a direct child of
  // `main` and the selector silently retargeted the Quote section. Identifying the
  // Hero by what it contains rather than by where it sits survives that -- and
  // there is exactly one h1 on the page, which the count assertion below still
  // proves.
  test("the hero CTA honours the interaction contract", async ({ page }) => {
    await gotoLanding(page, 1280);

    const hero = "main section:has(h1)";
    await expect(
      page.locator(`${hero} [data-cta-button]`),
      "the hero does not render exactly one shared CTA button",
    ).toHaveCount(1);

    await assertCtaMechanics(page, `${hero} [data-cta-button]`);
  });

  // Every CTA the sweep migrates has to be reachable through the component's own
  // attribute. This starts at 1 (the hero) and each adopting phase raises it, so
  // a phase that reimplements a button instead of adopting shows up here.
  test("every shared CTA button carries the component's own attribute", async ({ page }) => {
    await gotoLanding(page, 1280);

    const count = await page.locator("[data-cta-button]").count();
    expect(count, "no element carries [data-cta-button]").toBeGreaterThanOrEqual(1);
  });
});
