import { expect, test } from "@playwright/test";

import { assertCtaMechanics, gotoLanding } from "./helpers.mjs";

const SECTION = "section:has(#formulario-de-contato), section:has(form)";
const GROUPS = ["heading", "fields", "relationship", "message", "cta"];

test.describe("contact", () => {
  /*
   * Same defect as the pricing cards, third instance in the GPT-written sections:
   * every `.fromTo()` in this section's timeline carries `immediateRender: false`,
   * so the groups are never pre-hidden. Measured with the section off-screen, all
   * five sit at `opacity: 1, transform: none` -- already arrived. When the
   * timeline reaches them they snap to the from-state and animate up: visible,
   * blink out, fade in.
   */
  test("the reveal groups do not sit in their final state before revealing", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const arrived = await page.evaluate((groups) =>
      groups
        .map((group) => {
          const el = document.querySelector(`[data-motion="${group}"]`);
          if (!el) return null;
          const style = getComputedStyle(el);
          return Number(style.opacity) > 0.99 && style.transform === "none" ? group : null;
        })
        .filter(Boolean),
    GROUPS);

    expect(
      arrived,
      "these groups are fully visible before their reveal runs, so it plays as a flash",
    ).toEqual([]);
  });

  test("the reveal groups finish visible", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });
    await page.locator(SECTION).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);

    const hidden = await page.evaluate((groups) =>
      groups.filter((group) => {
        const el = document.querySelector(`[data-motion="${group}"]`);
        return el ? Number(getComputedStyle(el).opacity) < 0.99 : false;
      }),
    GROUPS);

    expect(hidden, "these groups never finished arriving").toEqual([]);
  });

  test("the reveal groups are visible under reduced motion", async ({ page }) => {
    await gotoLanding(page, 1280);

    const hidden = await page.evaluate((groups) =>
      groups.filter((group) => {
        const el = document.querySelector(`[data-motion="${group}"]`);
        return el ? Number(getComputedStyle(el).opacity) < 0.99 : false;
      }),
    GROUPS);

    expect(hidden, "these groups are not visible with reduced motion").toEqual([]);
  });

  /*
   * `docs/failure-archetypes.md`, "Spec transplantada de uma ferramenta de
   * autoria cujo viewport não existe no destino": one trigger governing a region
   * taller than the screen animates its lower half out of sight. Measured -- the
   * section is 977px tall against a 900px viewport, and the trigger is
   * `start: "top 75%"`, so it fires with the section top at 675px and everything
   * below 900px animates where nobody is looking.
   *
   * Asserted as geometry at the firing moment rather than as timing, so it is
   * deterministic: scroll to exactly the trigger line and check what is on screen.
   * The fix can be a later start, a trigger per group, or a shorter section --
   * this does not care which.
   */
  test("nothing animates below the fold when the reveal fires", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });

    const offscreen = await page.evaluate((groups) => {
      const section = document.querySelector("section:has(form)");
      // Put the section top exactly on the trigger line: start "top 75%" fires
      // when the section top reaches 75% of the viewport height.
      const target =
        section.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.75;
      window.scrollTo(0, Math.max(0, target));

      return groups
        .map((group) => {
          const el = document.querySelector(`[data-motion="${group}"]`);
          if (!el) return null;
          const box = el.getBoundingClientRect();
          const below = Math.round(box.top - window.innerHeight);
          return below > 0 ? { group, pxBelowTheFold: below } : null;
        })
        .filter(Boolean);
    }, GROUPS);

    expect(
      offscreen,
      "these groups start animating while they are still off the bottom of the screen",
    ).toEqual([]);
  });

  /*
   * Gabriel: "está tudo muito bold". The culprits are specific -- the form's
   * <label> elements are `text-body-bold` (16px/700) paired with `text-muted`, and
   * the question copy is `text-body-bold text-ink`. A 700-weight grey field label
   * is a strange combination, and the scale has lighter steps built for the role
   * (`text-small-medium`, `text-label`, `text-small`).
   *
   * The heading's highlighted word stays bold: it is a heading, not body copy.
   */
  test("form labels are not set at the boldest weight", async ({ page }) => {
    await gotoLanding(page, 1280);

    const heavy = await page.evaluate(() => {
      const section = document.querySelector("section:has(form)");
      const out = [];
      for (const label of section.querySelectorAll("label")) {
        const weight = Number(getComputedStyle(label).fontWeight);
        if (weight >= 700) {
          out.push({ text: (label.textContent ?? "").trim().slice(0, 30), weight });
        }
      }
      return out;
    });

    expect(heavy, "field labels rendered at weight 700").toEqual([]);
  });

  test("the contact CTA uses the shared button and honours its contract", async ({ page }) => {
    await gotoLanding(page, 1280);

    const cta = `${SECTION} [data-cta-button]`;
    await expect(
      page.locator(cta),
      "the contact CTA is not the shared button, so it cannot share its feel",
    ).not.toHaveCount(0);

    await assertCtaMechanics(page, cta);
  });

  // It is the form's submit button; turning it into an anchor would break
  // submission, which is why the shared component grew a button mode.
  test("the contact CTA is still a submit button", async ({ page }) => {
    await gotoLanding(page, 1280);

    const tag = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? { tag: el.tagName.toLowerCase(), type: el.getAttribute("type") } : null;
    }, `${SECTION} [data-cta-button]`);

    expect(tag, "no shared CTA button found in the contact section").not.toBeNull();
    expect(tag.tag, "the contact CTA is no longer a button").toBe("button");
    expect(tag.type, "the contact CTA no longer submits the form").toBe("submit");
  });
});
