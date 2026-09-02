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

  /*
   * The paragraph under a section heading is 18px copy at every width.
   *
   * Gabriel's rule: wherever the page pairs a heading with a subtitle, the
   * subtitle is 18px -- not the 16px those two intros carried after the section
   * review (c4e9e01), and not `text-lead`, whose 20px step above 48rem is what
   * made them read as a second heading in the first place. The role that says so
   * is `text-subtitle`, and it is flat by design, which is why the assertion runs
   * on both sides of the 48rem step.
   *
   * The four pairs are named rather than discovered: a test that only walked the
   * DOM would pass just as happily on zero pairs, and would go quiet the day an
   * intro drops back to text-body -- the regression this exists for. A new
   * section with a subtitle fails here until it is added, which is the intended
   * cost.
   *
   * The hero is deliberately absent. Its subheading stays `text-lead` (20px/500
   * above 48rem) by Gabriel's call: the type above it is 56px, where 18px does
   * not hold. That is a second role, not this rule with an exception -- and the
   * list above is what keeps the two from drifting into each other.
   */
  const SUBTITLES = [
    "Você testa, muda, publica",
    "Cada problema pede uma entrega",
    "Onde sua empresa está hoje",
    "O que você pode querer saber",
  ];

  for (const width of [375, 768, 1280, 2560]) {
    test(`every section subtitle is 18px copy at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);

      const measured = await page.evaluate((expected) => {
        const out = [];
        for (const heading of document.querySelectorAll("main section h1, main section h2")) {
          const text = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
          const key = expected.find((prefix) => text.startsWith(prefix));
          if (!key) continue;
          const subtitle = heading.nextElementSibling;
          if (!subtitle || subtitle.tagName !== "P") {
            out.push({ key, missing: true });
            continue;
          }
          const style = getComputedStyle(subtitle);
          out.push({
            key,
            size: parseFloat(style.fontSize),
            weight: Number(style.fontWeight),
            leading: parseFloat(style.lineHeight),
          });
        }
        return out;
      }, SUBTITLES);

      expect(
        measured.map((m) => m.key).sort(),
        "a named heading/subtitle pair is no longer on the page, so this rule is measuring less than it claims",
      ).toEqual([...SUBTITLES].sort());

      for (const pair of measured) {
        expect(pair.missing, `"${pair.key}" is no longer followed by a paragraph`).toBeFalsy();
        expect(pair.size, `"${pair.key}" subtitle is ${pair.size}px, not 18px`).toBe(18);
        expect(pair.weight, `"${pair.key}" subtitle is weight ${pair.weight}, not 400`).toBe(400);
        // The leading has to follow the size, which is the whole reason the token
        // states a ratio: 16px copy's 24px leading under 18px text is too tight.
        const ratio = pair.leading / pair.size;
        expect(
          Math.abs(ratio - 1.55) < 0.02,
          `"${pair.key}" subtitle leads at ${pair.leading}px on ${pair.size}px -- ratio ${ratio.toFixed(3)}, not the token's 1.55`,
        ).toBe(true);
      }
    });
  }

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
