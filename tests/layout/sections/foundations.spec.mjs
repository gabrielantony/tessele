import { expect, test } from "@playwright/test";

import { HEIGHT, assertCtaMechanics, gotoLanding } from "./helpers.mjs";

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
   * No type role renders on a fractional pixel, at any width.
   *
   * Gabriel's rule: nothing broken, always the nearest even number. The scale
   * states its leadings as ratios, and a ratio is where the fractions come from
   * -- 1.2 x 32px is 38.4px, 1.28 x 24px is 30.72px -- so every size and leading
   * in globals.css is wrapped in round(nearest, ..., 2px). This measures what the
   * browser actually computes, which is the only place the rule can be checked:
   * round() resolves em against the element's own font-size and vw against the
   * viewport, so the value does not exist until it is rendered.
   *
   * The sweep is every integer width from 320 to 1120 because that is the band
   * where the display roles size fluidly. Arithmetic says a value snapped to a
   * 2px grid cannot leave it, but arithmetic is not what would break here -- a
   * role added later without the wrapper would, and only at the widths where its
   * own clamp sits between its ends.
   *
   * Roles are listed rather than scraped from the stylesheet: Tailwind ships its
   * own --text-* defaults in the same cascade, and scraping would hold a stock
   * role this page never uses to a rule that is about our scale. The list is
   * also what makes this fail on a new role instead of ignoring it.
   */
  const TYPE_ROLES = [
    "display", "display-2", "heading-2", "heading-3", "heading-4", "lead",
    "subtitle", "body", "body-medium", "body-bold", "small", "small-bold",
    "small-medium", "label", "action", "metric",
  ];

  test("every type role lands on the even-pixel grid", async ({ page }) => {
    test.slow();
    await gotoLanding(page, 320);

    /*
     * Read each role off a probe element rather than off :root -- an em-based
     * leading only resolves against the font-size of the element carrying it.
     *
     * A FRESH element per role, which is not fussiness. Mutating one probe and
     * re-reading it returns stale values in both engines: the font-size stays on
     * the first role measured and the leading lags a role behind, so the whole
     * sweep reads 36px and reports even. The first version of this test did
     * exactly that and passed while measuring nothing.
     */
    const measure = (roles) =>
      roles.map((role) => {
        const probe = document.createElement("div");
        probe.textContent = "x";
        probe.style.fontSize = `var(--text-${role})`;
        probe.style.lineHeight = `var(--text-${role}--line-height)`;
        document.body.appendChild(probe);
        const style = getComputedStyle(probe);
        const measured = {
          role,
          size: parseFloat(style.fontSize),
          leading: parseFloat(style.lineHeight),
          declared: getComputedStyle(document.documentElement)
            .getPropertyValue(`--text-${role}`)
            .trim(),
        };
        probe.remove();
        return measured;
      });

    // A role that does not exist leaves the probe at the inherited 16px/24px --
    // both even, so the sweep below would pass on a token nobody declared.
    for (const role of await page.evaluate(measure, TYPE_ROLES)) {
      expect(role.declared, `--text-${role.role} is not declared`).not.toBe("");
    }

    const isEven = (value) => Number.isInteger(value) && value % 2 === 0;
    const widths = [...Array(801).keys()].map((i) => i + 320).concat([1280, 1601, 1920, 2560]);
    const offenders = [];

    for (const width of widths) {
      await page.setViewportSize({ width, height: HEIGHT });
      for (const role of await page.evaluate(measure, TYPE_ROLES)) {
        if (!isEven(role.size)) offenders.push(`${width}px: text-${role.role} is ${role.size}px`);
        if (!isEven(role.leading)) offenders.push(`${width}px: text-${role.role} leads at ${role.leading}px`);
      }
    }

    expect(offenders.slice(0, 12).join("\n"), `${offenders.length} values off the even-pixel grid`).toBe("");
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
        // 28px is that ratio (1.55em) on the even-pixel grid the test above pins.
        expect(
          pair.leading,
          `"${pair.key}" subtitle leads at ${pair.leading}px on ${pair.size}px, not 28px`,
        ).toBe(28);
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
