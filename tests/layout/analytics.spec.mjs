import { expect, test } from "@playwright/test";

import { HEIGHT, gotoLanding } from "./sections/helpers.mjs";

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

// Must match WHATSAPP_URL_PREFIX in src/lib/whatsapp.ts. Duplicated for the
// reason already written at tests/layout/ctas.spec.mjs:22.
const WA_PREFIX = "https://wa.me/";

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

/*
 * Installs the collector in place of the vendor, before any application script
 * runs. Necessary rather than convenient: `data-domains` pins the real tracker
 * to tessele.com.br, so it never loads against localhost and there would be
 * nothing to observe without this.
 */
const installSpy = (page) =>
  page.addInitScript(() => {
    window.__events = [];
    window.umami = {
      track: (name, data) => window.__events.push({ name, data }),
    };
  });

const gotoWithSpy = async (page, width) => {
  await installSpy(page);
  await gotoLanding(page, width);
};

/*
 * The privacy policy is a route, not a section, so it needs its own navigation.
 * Mirrors gotoLanding: same viewport, same reduced motion, same wait for the
 * webfont, because a box that resizes under the pointer moves the link.
 */
const gotoPolicyWithSpy = async (page, width) => {
  await installSpy(page);
  await page.setViewportSize({ width, height: HEIGHT });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./privacidade/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready.then(() => true));
};

const eventsOn = (page) => page.evaluate(() => window.__events);

const ctaIn = (page, section) =>
  page.locator(`[data-analytics-section="${section}"] a[href^="${WA_PREFIX}"]`).first();

/*
 * Clicks a CTA without leaving for WhatsApp, and reports whether the browser
 * actually tried to go there.
 *
 * The CTAs open in a new tab -- a guarantee tests/layout/ctas.spec.mjs already
 * holds for every wa.me link, so it is relied on here rather than re-asserted.
 * Aborting at the context level keeps the run off the network while still
 * letting the navigation be attempted, which is the thing worth measuring:
 * recording the event and swallowing the click look identical in the event log.
 */
const clickCtaWithoutLeaving = async (page, cta) => {
  await cta.scrollIntoViewIfNeeded();

  let attempted = 0;
  await page.context().route(`${WA_PREFIX}**`, (route) => {
    attempted += 1;
    return route.abort();
  });

  const popup = page.waitForEvent("popup", { timeout: 3_000 }).catch(() => null);
  await cta.click();
  const opened = await popup;
  if (opened) await opened.close();

  return () => attempted;
};

test.describe("whatsapp click", () => {
  /*
   * Two sections rather than one, and specifically the first and the last: the
   * section key is read by walking up from the clicked link, so a bug that
   * resolves to the nearest keyed ancestor incorrectly would still look right
   * on whichever section happens to be tested alone.
   */
  for (const [section, label] of [
    ["hero", "the hero"],
    ["rodape", "the footer"],
  ]) {
    test(`a CTA click in ${label} reports its own section`, async ({ page }) => {
      await gotoWithSpy(page, 1280);

      const attempts = await clickCtaWithoutLeaving(page, ctaIn(page, section));

      expect(
        await eventsOn(page),
        `clicking ${label}'s CTA reported the wrong thing`,
      ).toEqual([{ name: "whatsapp-click", data: { section } }]);

      /*
       * And the click still navigates. A tracker that took the event -- a
       * preventDefault, a stopPropagation, an await before the default action --
       * would leave the visitor on the page with nothing happening, and the
       * event above would still be recorded. This is the assertion that tells
       * those two apart.
       */
      expect(attempts(), "the click was recorded but never reached WhatsApp").toBe(1);
    });
  }

  test("a CTA outside every section reports the fallback key", async ({ page }) => {
    /*
     * The privacy policy's WhatsApp link is the real case the fallback exists
     * for, and it is the only branch of the tracker no other test reaches. It
     * matters more than its size suggests: that page is where a visitor goes to
     * exercise an LGPD right, so a handler that threw there would break the
     * contact link on exactly the page that must not be broken.
     */
    await gotoPolicyWithSpy(page, 1280);

    const cta = page.locator(`a[href^="${WA_PREFIX}"]`).first();
    const attempts = await clickCtaWithoutLeaving(page, cta);

    expect(
      await eventsOn(page),
      "a CTA with no keyed ancestor did not fall back to the documented key",
    ).toEqual([{ name: "whatsapp-click", data: { section: "fora-de-secao" } }]);

    expect(attempts(), "the policy's contact link no longer navigates").toBe(1);
  });

  test("a click that is not a WhatsApp CTA reports nothing", async ({ page }) => {
    await gotoWithSpy(page, 1280);

    // Top-left corner: inside the document, outside every CTA on the page.
    await page.mouse.click(5, 5);

    expect(
      await eventsOn(page),
      "a click on empty page area was reported as a CTA click",
    ).toEqual([]);
  });

  test("the page survives a blocked vendor", async ({ page }) => {
    /*
     * Deliberately no spy: `window.umami` is absent, which is what an ad
     * blocker produces and what src/lib/analytics.ts documents as returning
     * silently. Every other test in this file installs the collector, so this
     * is the only place that sentence is checked -- and a throw here would come
     * from inside a click handler, breaking the CTA rather than the metric.
     */
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await gotoLanding(page, 1280);
    await clickCtaWithoutLeaving(page, ctaIn(page, "hero"));

    expect(errors, "the page threw with no measurement vendor present").toEqual([]);
  });
});

/*
 * Must match SAMPLE_MS in src/components/analytics/SectionTiming.tsx, and the
 * prefix its event names carry. Duplicated for the reason at
 * tests/layout/ctas.spec.mjs:22 -- importing the value under test would make
 * these assertions pass at any cadence at all.
 */
const SAMPLE_MS = 5_000;
const SECTION_EVENT_PREFIX = "secao-";

/*
 * Puts a section's midpoint on the viewport centre, which is the line the
 * timing component treats as ownership. Waits two frames rather than a
 * timeout: ScrollTrigger reads the new position from the GSAP ticker that
 * Lenis drives, so a frame boundary is the real signal and a sleep would just
 * be a guess at it.
 */
const parkOn = async (page, section) => {
  await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    const box = element.getBoundingClientRect();
    window.scrollTo(
      0,
      window.scrollY + box.top + box.height / 2 - window.innerHeight / 2,
    );
  }, `[data-analytics-section="${section}"]`);

  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
};

/*
 * Drops whatever was collected before the window under test opened. Without
 * this, every timing assertion would also depend on how long the run took to
 * get from load to the first park -- a slow worker would leak a hero tick into
 * a window about another section, and the failure would read as a bug in the
 * component.
 */
const clearEvents = (page) =>
  page.evaluate(() => {
    window.__events.length = 0;
  });

const namesOn = async (page) => (await eventsOn(page)).map((event) => event.name);

const sectionNamesOn = async (page) =>
  (await namesOn(page)).filter((name) => name.startsWith(SECTION_EVENT_PREFIX));

test.describe("section timing", () => {
  test("holding a section samples that section, and only that one", async ({
    page,
  }) => {
    await gotoWithSpy(page, 1280);
    await parkOn(page, "planos");
    await clearEvents(page);

    // Two sample intervals plus margin for a loaded worker.
    await page.waitForTimeout(SAMPLE_MS * 2 + 2_000);

    const sampled = await sectionNamesOn(page);

    expect(
      sampled.length,
      `12 seconds on one section produced ${sampled.length} samples, so the cadence is wrong`,
    ).toBeGreaterThanOrEqual(2);

    /*
     * The assertion the whole design turns on. The component owns the section
     * crossing the viewport CENTRE, not every section on screen -- and with
     * "on screen" the neighbour above or below would appear in this window,
     * two sections would accrue at once, and the dashboard's ranking would be
     * meaningless. A single distinct name here is what rules that out.
     */
    expect(
      [...new Set(sampled)],
      "more than one section accrued time at the same moment",
    ).toEqual([`${SECTION_EVENT_PREFIX}planos`]);
  });

  test("a section crossed in under one sample is never counted", async ({
    page,
  }) => {
    await gotoWithSpy(page, 1280);
    await parkOn(page, "citacao");
    await clearEvents(page);

    // Comfortably inside one interval, then move on.
    await page.waitForTimeout(SAMPLE_MS - 2_000);
    await parkOn(page, "rodape");

    /*
     * And then hold long enough for the new section to be sampled. That second
     * half is what makes this test mean anything: asserting only the absence of
     * `secao-citacao` would pass just as happily against a component that had
     * died, or never started, and emitted nothing for anything. Requiring the
     * footer to appear in the same window proves the sampler was alive while
     * the short dwell was being discarded.
     */
    await page.waitForTimeout(SAMPLE_MS + 2_000);

    const sampled = await sectionNamesOn(page);

    expect(
      sampled,
      "the sampler was not running during this window, so the absence below proves nothing",
    ).toContain(`${SECTION_EVENT_PREFIX}rodape`);

    expect(
      sampled.filter((name) => name === `${SECTION_EVENT_PREFIX}citacao`),
      "a section passed through in 3 seconds was counted as time spent",
    ).toEqual([]);
  });

  test("the section already at the centre on load is counted", async ({
    page,
  }) => {
    /*
     * No scrolling at all. The trigger for the section under the centre at
     * mount is created past its own start, so it never receives an onEnter --
     * `docs/failure-archetypes.md` calls this class "Independent scroll
     * controllers initialize against transient layout". Without an explicit
     * scan at creation, the section most likely to be read on a fresh load is
     * the one that measures nothing, and no error says so.
     */
    await gotoWithSpy(page, 1280);
    await clearEvents(page);

    await page.waitForTimeout(SAMPLE_MS + 2_000);

    expect(
      await sectionNamesOn(page),
      "the hero held the centre from load and was never sampled",
    ).toContain(`${SECTION_EVENT_PREFIX}hero`);
  });

  test("the last section on the page is sampled too", async ({ page }) => {
    /*
     * The footer rather than another middle section: it is the one whose
     * `bottom center` end line the page may never reach, so a component that
     * only counted sections it had seen leave would measure everything except
     * the end of the page.
     */
    await gotoWithSpy(page, 1280);
    await parkOn(page, "rodape");
    await clearEvents(page);

    await page.waitForTimeout(SAMPLE_MS + 2_000);

    expect(
      await sectionNamesOn(page),
      "the footer was never sampled",
    ).toContain(`${SECTION_EVENT_PREFIX}rodape`);
  });
});
