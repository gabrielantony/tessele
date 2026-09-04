import { expect, test } from "@playwright/test";

import { gotoLanding } from "./sections/helpers.mjs";

/*
 * The audience measurement, observed in the browser rather than in the source.
 *
 * `docs/failure-archetypes.md` has two entries that between them forbid the
 * obvious test here -- "Asserção sobre presença em vez de efeito" and its worse
 * recurrence, "Teste que confere presença passa por um valor que nunca é
 * usado". Grepping the export for the tracker script would go green with
 * nothing being measured at all, so every assertion below is about a key the
 * page actually carries, an event the page actually emits, or two files that
 * must agree.
 *
 * The one exception is the configuration group, and it earns it: the tracker
 * being off is a legitimate state of this repo, and what that group asserts is
 * that the privacy policy and the tracker are never live apart. That is a
 * two-way gate, not a presence check -- it fails if the tracker ships without
 * the disclosure, and it fails if the disclosure ships without the tracker.
 */

/*
 * Must match the `data-analytics-section` values in the ten section files and
 * the list in docs/superpowers/plans/2026-09-04-analytics-umami.md.
 *
 * Duplicated rather than imported, for the reason already written down in
 * tests/layout/ctas.spec.mjs:22 -- a test that imports the value under test
 * passes on any value at all.
 */
const SECTIONS = [
  "hero",
  "citacao",
  "problema",
  "como-trabalhamos",
  "servicos",
  "planos",
  "sobre-nos",
  "faq",
  "contato",
  "rodape",
];

const KEY = "[data-analytics-section]";

// Must match UMAMI_SCRIPT_SRC and UMAMI_ALLOWED_DOMAIN in src/lib/analytics.ts.
const UMAMI_HOST = "cloud.umami.is";
const ALLOWED_DOMAIN = "tessele.com.br";

/*
 * The two sentences in the privacy policy that stop being true the moment the
 * tracker is on. The first is the one this work was planned around; the second
 * was found in the plan's self-review, and it is the more dangerous of the two
 * because nothing about the word "analytics" appears in it.
 */
const DENIALS = [
  "Não usamos ferramentas de análise de audiência",
  "não registra o que você faz enquanto navega",
];

const keysOn = (page) =>
  page.evaluate(
    (selector) =>
      Array.from(document.querySelectorAll(selector)).map((element) => ({
        key: element.getAttribute("data-analytics-section"),
        height: Math.round(element.getBoundingClientRect().height),
        nested: Boolean(element.parentElement?.closest(selector)),
      })),
    KEY,
  );

test.describe("section markup", () => {
  test("every delivered section carries its analytics key, exactly once", async ({
    page,
  }) => {
    await gotoLanding(page, 1280);
    const found = await keysOn(page);
    const keys = found.map((entry) => entry.key);

    /*
     * The set, not the order. `src/app/page.tsx` is written so that reordering
     * the page is moving one line, and pinning document order here would turn
     * that designed-for operation into a test failure. Membership and
     * uniqueness are what the dashboard needs; sequence is not.
     */
    expect(
      [...keys].sort(),
      "the set of measured sections drifted from the plan's list",
    ).toEqual([...SECTIONS].sort());

    expect(
      new Set(keys).size,
      `two elements claim the same analytics key: ${keys.join(" ")}`,
    ).toBe(keys.length);
  });

  test("no analytics key sits inside another", async ({ page }) => {
    await gotoLanding(page, 1280);
    const found = await keysOn(page);

    /*
     * Nesting would break both consumers at once: two sections would cross the
     * viewport centre simultaneously, so the timing would double-count, and a
     * CTA click would attribute to whichever ancestor `closest` reached first.
     */
    expect(
      found.filter((entry) => entry.nested).map((entry) => entry.key),
      "these keys are nested inside another measured section",
    ).toEqual([]);
  });

  test("each key is on the section itself, not on an empty wrapper", async ({
    page,
  }) => {
    await gotoLanding(page, 1280);
    const found = await keysOn(page);

    /*
     * The attribute landing on a layout `<div>` instead of the section element
     * is the mistake that produces plausible-looking data: the key is there,
     * the events flow, and the geometry being timed is the wrong box. A
     * measured section is a screenful of page, so a hundred pixels is a floor
     * far below any real one rather than a threshold to tune.
     */
    expect(
      found.filter((entry) => entry.height < 100),
      "these measured elements are too short to be the section they name",
    ).toEqual([]);
  });
});

test.describe("configuration", () => {
  test("the tracker and the privacy policy are never live apart", async ({
    page,
    request,
  }) => {
    await gotoLanding(page, 1280);

    const landing = await (await request.get("./")).text();
    const policy = await (await request.get("./privacidade/")).text();

    const trackers = await page.evaluate(
      (host) =>
        Array.from(document.querySelectorAll("script[src]"))
          .filter((script) => script.src.includes(host))
          .map((script) => ({
            websiteId: script.getAttribute("data-website-id"),
            domains: script.getAttribute("data-domains"),
            doNotTrack: script.getAttribute("data-do-not-track"),
          })),
      UMAMI_HOST,
    );

    const denials = DENIALS.filter((sentence) => policy.includes(sentence));

    if (trackers.length === 0) {
      /*
       * Measurement is off. The assertion in this direction is that the export
       * agrees: nothing may reference the vendor anywhere, and the policy must
       * still carry its denials. A policy rewritten ahead of the tracker would
       * be a page claiming to measure what it does not, which is its own kind
       * of false statement.
       */
      expect(
        landing.includes(UMAMI_HOST),
        "the export references the vendor while no tracker script is mounted",
      ).toBe(false);

      expect(
        denials,
        "the privacy policy dropped its denials while measurement is still off",
      ).toEqual(DENIALS);
      return;
    }

    expect(trackers.length, "more than one tracker script is mounted").toBe(1);

    const [tracker] = trackers;

    expect(
      tracker.websiteId,
      "the tracker is mounted without a website id, so it measures into nothing",
    ).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    expect(
      tracker.domains,
      "without the domain lock, localhost and every preview land in the data",
    ).toBe(ALLOWED_DOMAIN);

    expect(
      tracker.doNotTrack,
      "the tracker ignores the browser's do-not-track preference",
    ).toBe("true");

    /*
     * And the disclosure. This is the assertion the whole group exists for: the
     * moment the tracker is live, both denials have to be gone from the policy
     * and the vendor has to be named in it.
     */
    expect(
      denials,
      "the tracker is live and the privacy policy still denies measuring",
    ).toEqual([]);

    expect(
      policy.includes("Umami"),
      "the tracker is live and the privacy policy never names the vendor",
    ).toBe(true);
  });
});
