import { expect, test } from "@playwright/test";

import { gotoLanding } from "./sections/helpers.mjs";

/*
 * Where every clickable thing on this page goes.
 *
 * This is a destinations suite, not a layout one, and it exists because a wrong
 * destination is the failure mode that shows nothing: the button still lifts on
 * hover, still presses down, still looks finished. Three of these CTAs shipped
 * as `<button>` with no handler at all, and four more pointed at `#contato`, an
 * id that was never in the source -- neither is visible without clicking.
 */

// Must match WHATSAPP_NUMBER in src/lib/whatsapp.ts. Duplicated on purpose: a
// test that imports the value under test would pass on any number at all.
const WHATSAPP_NUMBER = "5547991994214";

const linksOn = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      // The attribute, not the resolved `.href` property -- an in-page "#faq"
      // reads back as a full URL, and this suite is about what was authored.
      href: a.getAttribute("href"),
      target: a.getAttribute("target"),
      rel: a.getAttribute("rel"),
      text: a.textContent.replace(/\s+/g, " ").trim(),
    })),
  );

const whatsappLinks = (links) =>
  links.filter((link) => link.href.includes("wa.me"));

test.describe("cta destinations", () => {
  test("no link still points at the #contato id that never existed", async ({ page }) => {
    await gotoLanding(page, 1280);
    const links = await linksOn(page);

    expect(
      links.filter((link) => link.href === "#contato").map((link) => link.text),
      "these links point at an id no section declares, so clicking them does nothing",
    ).toEqual([]);
  });

  test("every WhatsApp link reaches the studio's number with copy attached", async ({ page }) => {
    await gotoLanding(page, 1280);
    const wa = whatsappLinks(await linksOn(page));

    // Hero, Como trabalhamos, three plan cards, por demanda, footer.
    expect(wa.length, "the page lost a WhatsApp CTA").toBe(7);

    for (const link of wa) {
      const url = new URL(link.href);
      expect(url.pathname, `"${link.text}" points at the wrong number`).toBe(
        `/${WHATSAPP_NUMBER}`,
      );
      // An empty ?text= opens a blank chat, which is the whole thing this
      // feature exists to avoid -- and it is invisible until someone clicks.
      expect(
        url.searchParams.get("text"),
        `"${link.text}" opens WhatsApp with no message`,
      ).toBeTruthy();
      expect(
        link.target,
        `"${link.text}" would replace the page with web.whatsapp.com`,
      ).toBe("_blank");
      expect(link.rel, `"${link.text}" opens a new tab without noopener`).toContain(
        "noopener",
      );
    }
  });

  test("each section words its own message", async ({ page }) => {
    await gotoLanding(page, 1280);
    const texts = whatsappLinks(await linksOn(page)).map((link) =>
      new URL(link.href).searchParams.get("text"),
    );

    /*
     * The point of a per-section CTA is that the conversation opens knowing
     * where the visitor was. Two sections sharing a message means a call site
     * imported the wrong constant -- which type-checks, lints and renders fine.
     */
    const duplicated = texts.filter((text, i) => texts.indexOf(text) !== i);
    expect(duplicated, "these messages appear on more than one CTA").toEqual([]);
  });

  test("the plan cards name the plan and the period on show", async ({ page }) => {
    await gotoLanding(page, 1280);

    const messageFor = async (index) =>
      new URL(
        await page
          .locator("[data-plan-card] a[data-cta-button]")
          .nth(index)
          .getAttribute("href"),
      ).searchParams.get("text");

    // The section loads on `semestral`, so that is the price on screen.
    expect(await messageFor(1)).toContain("plano Aquisição");
    expect(await messageFor(1)).toContain("semestral");
    expect(await messageFor(1)).toContain("R$ 2.300/mês");

    await page.getByRole("button", { name: "Trimestral", exact: true }).click();

    /*
     * The reason this assertion is here: `billing` lives in the section and the
     * price shown is derived from it, so a card that built its message from
     * `plan.semesterPrice` instead would look right on load and quote a price
     * the visitor never saw the moment they flip the toggle.
     */
    expect(await messageFor(1)).toContain("trimestral");
    expect(await messageFor(1)).toContain("R$ 2.590/mês");
  });

  test("the footer's e-mail and Instagram links have real destinations", async ({ page }) => {
    await gotoLanding(page, 1280);
    const links = await linksOn(page);

    const email = links.find((link) => link.href.startsWith("mailto:"));
    expect(email?.href).toBe("mailto:contatotessele@gmail.com");
    // A mailto hands off to the mail client and leaves the page alone; a new tab
    // there is a blank tab the visitor has to close.
    expect(email?.target, "the mailto opens an empty tab").toBeNull();

    const instagram = links.find((link) => link.href.includes("instagram.com"));
    expect(instagram?.href).toBe("https://www.instagram.com/tessele.co");
    expect(instagram?.target).toBe("_blank");
  });
});

test.describe("footer navigation", () => {
  test("every navigation anchor resolves to a section", async ({ page }) => {
    await gotoLanding(page, 1280);

    const broken = await page.evaluate(() =>
      ["#como-trabalhamos", "#servicos", "#planos", "#faq"].filter(
        (hash) => !document.querySelector(hash),
      ),
    );

    expect(broken, "the footer links to sections that declare no id").toEqual([]);
  });

});

test.describe("contact form", () => {
  test("submitting sends what was typed to WhatsApp, as prose", async ({ page }) => {
    // Recorded rather than opened: the real call would hand the run off to
    // web.whatsapp.com, and the URL is the whole thing under test anyway.
    await page.addInitScript(() => {
      window.__openedUrls = [];
      window.open = (url) => {
        window.__openedUrls.push(url);
        return null;
      };
    });

    await gotoLanding(page, 1280);

    const form = page.locator("form").first();
    await form.scrollIntoViewIfNeeded();

    await form.locator('input[name="name"]').fill("Gabriel");
    await form.locator('input[name="company"]').fill("Idiomus");
    await form.locator('input[name="contact"]').fill("47991994214");
    await form
      .getByRole("button", { name: "Acompanhamento mensal", exact: true })
      .click();
    await form
      .locator('textarea[name="message"]')
      .fill("Estamos com dificuldade de organizar a comunicação.");

    await form.locator('button[type="submit"]').click();

    const opened = await page.evaluate(() => window.__openedUrls);
    expect(opened.length, "submitting opened no WhatsApp conversation").toBe(1);

    const text = new URL(opened[0]).searchParams.get("text");

    expect(text).toContain("Meu nome é Gabriel e sou da Idiomus.");
    expect(text).toContain("O que tenho em mente é um acompanhamento mensal.");
    expect(text).toContain("Estamos com dificuldade de organizar a comunicação.");

    /*
     * A phone number is already at the top of the WhatsApp chat they are sending
     * from, so echoing it back is the one line in this message that would read
     * as generated. The field is dual-purpose, so this is the branch that has to
     * hold; an e-mail does get its own line.
     */
    expect(text, "the message echoes back the number they are writing from").not.toContain(
      "99199-4214",
    );
  });

  test("an empty submit is blocked instead of sending an empty message", async ({ page }) => {
    await page.addInitScript(() => {
      window.__openedUrls = [];
      window.open = (url) => {
        window.__openedUrls.push(url);
        return null;
      };
    });

    await gotoLanding(page, 1280);

    const form = page.locator("form").first();
    await form.scrollIntoViewIfNeeded();
    await form.locator('button[type="submit"]').click();

    /*
     * Without `required` the handler runs on an empty form and sends "Oi! Acabei
     * de preencher o formulário no site." and nothing else -- a message that
     * costs the visitor a reply to say who they are, which is worse than the
     * submit not going through.
     */
    expect(
      await page.evaluate(() => window.__openedUrls),
      "an empty form sent a message with nothing in it",
    ).toEqual([]);
  });
});
