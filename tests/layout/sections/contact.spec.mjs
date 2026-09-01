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
   * section is 977px tall against a 900px viewport with `start: "top 75%"`, so it
   * fires with the section top at 675px and everything below 900px animates where
   * nobody is looking.
   *
   * The first version of this assertion was wrong, and Codex was right to refuse
   * it: it scrolled to the OLD trigger line and demanded all five groups be on
   * screen there, which a 977px section in a 900px viewport can never satisfy no
   * matter how the reveal is fixed. It asserted the old mechanism instead of the
   * guarantee, so it defended the defect -- passing it would have required
   * shortening the section or keeping the single trigger.
   *
   * The guarantee is that the reader gets to see each entrance. So: park each
   * group at the moment it first comes into view, and require it has not already
   * finished arriving. Per-group triggers satisfy that; one early trigger over a
   * tall section does not. Nothing here knows how the triggers are configured.
   */
  test("each group still has its entrance left when it comes into view", async ({ page }) => {
    await gotoLanding(page, 1280, { motion: true });

    const alreadyDone = [];
    for (const group of GROUPS) {
      const parked = await page.evaluate((name) => {
        const el = document.querySelector(`[data-motion="${name}"]`);
        if (!el) return null;
        // Put the group's top just inside the bottom edge -- the instant it
        // becomes visible to someone scrolling down.
        const target =
          el.getBoundingClientRect().top + window.scrollY - (window.innerHeight - 8);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (target > max) return { skipped: true };
        window.scrollTo(0, Math.max(0, target));
        return { skipped: false };
      }, group);

      if (!parked || parked.skipped) continue;

      await page.waitForTimeout(250);
      const opacity = await page.evaluate(
        (name) => Number(getComputedStyle(document.querySelector(`[data-motion="${name}"]`)).opacity),
        group,
      );
      if (opacity > 0.99) alreadyDone.push({ group, opacity });
    }

    expect(
      alreadyDone,
      "these groups had already finished animating before they came into view, so their entrance is never seen",
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
