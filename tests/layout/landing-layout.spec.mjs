import { expect, test } from "@playwright/test";

// Widths chosen from measured breakage, not from a device list.
const WIDTHS = [390, 430, 768, 900, 1024, 1280, 1600];
const HEIGHT = 900;

// Declared exceptions. An entry here is a design decision that outranks the rule,
// written down so it stays visible -- not a way to quiet a failure. Add one only
// with the reason.
const ALLOWED = {
  overlappingSiblings: [],
  overflowingParent: [],
};

const PROBE = ({ allowOverflow, allowOverlap }) => {
  const describe = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      let piece = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${piece}#${node.id}`);
        break;
      }
      if (typeof node.className === "string" && node.className.trim()) {
        piece += `.${node.className.trim().split(/\s+/).slice(0, 3).join(".")}`;
      }
      parts.unshift(piece);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const all = Array.from(document.querySelectorAll("body *"));

  const parentOverflow = [];
  for (const el of all) {
    const parent = el.parentElement;
    if (!parent) continue;
    if (allowOverflow.some((selector) => el.matches(selector))) continue;

    const style = getComputedStyle(el);
    if (style.position !== "static" && style.position !== "relative") continue;
    if (getComputedStyle(parent).overflowX !== "visible") continue;

    const box = el.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();
    if (box.width === 0 || box.height === 0 || parentBox.width === 0) continue;

    const over = Math.max(box.right - parentBox.right, parentBox.left - box.left);
    if (over > 1) {
      parentOverflow.push({
        element: describe(el),
        parent: describe(parent),
        overflowPx: Math.round(over),
      });
    }
  }

  const siblingOverlap = [];
  for (const container of all) {
    if (allowOverlap.some((selector) => container.matches(selector))) continue;
    const display = getComputedStyle(container).display;
    if (display !== "grid" && display !== "flex") continue;

    const items = Array.from(container.children).filter((child) => {
      const style = getComputedStyle(child);
      if (style.display === "none") return false;
      if (style.position !== "static" && style.position !== "relative") return false;
      const box = child.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i].getBoundingClientRect();
        const b = items[j].getBoundingClientRect();
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 1 && overlapY > 1) {
          siblingOverlap.push({
            container: describe(container),
            a: describe(items[i]),
            b: describe(items[j]),
            overlapPx: Math.round(overlapX),
          });
        }
      }
    }
  }

  const hiddenScrollers = [];
  for (const el of all) {
    if (el.scrollWidth <= el.clientWidth + 1 || el.clientWidth === 0) continue;
    const style = getComputedStyle(el);
    if (style.overflowX !== "auto" && style.overflowX !== "scroll") continue;
    const barHidden =
      style.scrollbarWidth === "none" ||
      getComputedStyle(el, "::-webkit-scrollbar").display === "none";
    if (!barHidden) continue;

    // What this check is really about is whether anything on screen says the
    // content continues -- not whether a native scrollbar specifically is the
    // thing saying it. A hidden bar paired with visible controls that drive this
    // scroller announces the overflow just as well, so the exemption is earned
    // by the affordance existing and being visible, measured here rather than
    // declared in ALLOWED for a particular element.
    const controls = el.id
      ? Array.from(document.querySelectorAll(`[aria-controls="${el.id}"]`)).filter((control) => {
          const box = control.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && getComputedStyle(control).visibility !== "hidden";
        })
      : [];
    if (controls.length >= 2) continue;

    hiddenScrollers.push({
      element: describe(el),
      hiddenPx: el.scrollWidth - el.clientWidth,
      visibleControls: controls.length,
    });
  }

  const doc = document.documentElement;
  return {
    parentOverflow,
    siblingOverlap,
    hiddenScrollers,
    overflowPx: doc.scrollWidth - doc.clientWidth,
  };
};

const gotoLanding = async (page, width, { motion = false } = {}) => {
  await page.setViewportSize({ width, height: HEIGHT });
  await page.emulateMedia({ reducedMotion: motion ? "no-preference" : "reduce" });
  await page.goto("./", { waitUntil: "load" });
  // Boxes that hold text change size when the webfont swaps in, and `load` does
  // not wait for that. Resolved to a boolean because document.fonts.ready settles
  // with a FontFaceSet, which is not serializable across the CDP boundary.
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
};

const showOrbit = async (page) => {
  await page.evaluate(() =>
    document.querySelector("[data-orbit-rotor]")?.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(400);
};

test.describe("landing layout", () => {
  for (const width of WIDTHS) {
    test(`layout holds at ${width}px`, async ({ page }) => {
      await gotoLanding(page, width);
      const m = await page.evaluate(PROBE, {
        allowOverflow: ALLOWED.overflowingParent,
        allowOverlap: ALLOWED.overlappingSiblings,
      });

      expect
        .soft(m.parentOverflow, "elements wider than the box that is supposed to hold them")
        .toEqual([]);
      expect.soft(m.siblingOverlap, "siblings drawn on top of each other").toEqual([]);
      expect
        .soft(
          m.hiddenScrollers,
          "content is reachable only by a horizontal gesture with nothing on screen saying so",
        )
        .toEqual([]);
      expect
        .soft(m.overflowPx, `the document is ${m.overflowPx}px wider than the viewport`)
        .toBeLessThanOrEqual(1);
    });
  }

  // The headline defect is not a static overflow: the problem section spins an
  // orbit of cards on a 21s loop, and the cards swing past the page edge as they
  // travel. The document gets wider and narrower on its own, so a single snapshot
  // reports whatever angle it happened to catch -- measured between 4px and 148px
  // at 390px for the same page. Sample across the cycle and keep the worst.
  for (const width of [390, 900]) {
    test(`the page never scrolls horizontally while motion runs at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width, { motion: true });
      await page.evaluate(() =>
        document.querySelector("[data-orbit-rotor]")?.scrollIntoView({ block: "center" }),
      );
      await page.waitForTimeout(400);

      let worst = 0;
      let worstAt = 0;
      for (let sample = 0; sample < 14; sample += 1) {
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (over > worst) {
          worst = over;
          worstAt = sample;
        }
        await page.waitForTimeout(400);
      }

      expect(
        worst,
        `the document swelled to ${worst}px wider than the viewport during the orbit (sample ${worstAt} of 14)`,
      ).toBeLessThanOrEqual(1);
    });
  }

  // The orbit's inward offset is derived from the card's rendered width, and the
  // cards are sized responsively (w-space-24 / sm:w-space-32 / lg:w-space-40). A
  // value computed once at init is stale the moment the viewport crosses one of
  // those breakpoints without a reload -- which is what rotating a phone does.
  // Every other test here loads fresh at a fixed width and is blind to it.
  test("the orbit survives a resize across breakpoints without reloading", async ({ page }) => {
    await gotoLanding(page, 390, { motion: true });
    await page.evaluate(() =>
      document.querySelector("[data-orbit-rotor]")?.scrollIntoView({ block: "center" }),
    );
    await page.waitForTimeout(400);

    const worstEscape = async () => {
      let worst = 0;
      for (let sample = 0; sample < 10; sample += 1) {
        worst = Math.max(
          worst,
          await page.evaluate(() => {
            const square = document.querySelector("[data-orbit-rotor]")?.parentElement;
            if (!square) return 0;
            const box = square.getBoundingClientRect();
            let escape = 0;
            for (const card of document.querySelectorAll("[data-orbit-card]")) {
              const cardBox = card.getBoundingClientRect();
              escape = Math.max(escape, box.left - cardBox.left, cardBox.right - box.right);
            }
            return Math.round(escape);
          }),
        );
        await page.waitForTimeout(350);
      }
      return worst;
    };

    expect(await worstEscape(), "a card leaves the orbit square at the width it loaded at").toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1280, height: HEIGHT });
    await page.waitForTimeout(800);

    const afterResize = await worstEscape();
    expect(
      afterResize,
      `after resizing past the card's breakpoints a card sits ${afterResize}px outside the square, where the clip cuts it mid-sentence`,
    ).toBeLessThanOrEqual(1);
  });

  // The escape test above measures only the left and right edges -- the two the
  // offset formula at ProblemSection.tsx:88-93 already balances, because it is
  // derived from the card's WIDTH. Below 1024px the cards are taller than they
  // are wide, so the escape is vertical and by exactly (height - width) / 2. It
  // was there the whole time, on the two edges nothing looked at.
  const ORBIT_ESCAPE = () => {
    const square = document.querySelector("[data-orbit-rotor]")?.parentElement;
    if (!square) return null;
    const sq = square.getBoundingClientRect();
    const worst = { left: 0, right: 0, top: 0, bottom: 0 };
    for (const card of document.querySelectorAll("[data-orbit-card]")) {
      const c = card.getBoundingClientRect();
      worst.left = Math.max(worst.left, Math.round(sq.left - c.left));
      worst.right = Math.max(worst.right, Math.round(c.right - sq.right));
      worst.top = Math.max(worst.top, Math.round(sq.top - c.top));
      worst.bottom = Math.max(worst.bottom, Math.round(c.bottom - sq.bottom));
    }
    return worst;
  };

  for (const width of [320, 390, 768, 1024, 1280, 1600]) {
    // The orbit's period is 21s. The motion test above samples 14 x 400ms = 5.6s
    // of it, so 73% of the rotation was never measured. Cover the whole cycle.
    test(`the orbit keeps its cards inside the square through a full rotation at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width, { motion: true });
      await showOrbit(page);

      const worst = { left: 0, right: 0, top: 0, bottom: 0 };
      for (let sample = 0; sample < 110; sample += 1) {
        const now = await page.evaluate(ORBIT_ESCAPE);
        for (const edge of Object.keys(worst)) worst[edge] = Math.max(worst[edge], now[edge]);
        await page.waitForTimeout(200);
      }

      expect(
        worst,
        `a card leaves the orbit square by up to ${Math.max(...Object.values(worst))}px somewhere in the 21s rotation`,
      ).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    });

    // Reduced motion returns early after positioning the slots, so whatever the
    // static geometry gets wrong is not a moment of the rotation -- it is what
    // the visitor sees for as long as the page is open. No test looked here.
    test(`the orbit keeps its cards inside the square with reduced motion at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width);
      await showOrbit(page);

      const worst = await page.evaluate(ORBIT_ESCAPE);
      expect(
        worst,
        `at rest, a card sits up to ${Math.max(...Object.values(worst))}px outside the orbit square`,
      ).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    });
  }
});

// An element that hides its overflow passes every overflow check by definition --
// that is what hiding means. So the check has to be the other way round: for each
// box that carries content, is it inside the nearest ancestor that would cut it?
//
// A scroll container is not such an ancestor: the reader can still reach what
// hangs outside it. Walking outward and stopping at the first scroller is what
// separates "clipped away" from "scrolled out of view".
const CLIPPED_AWAY = () => {
  const describe = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 4) {
      let piece = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${piece}#${node.id}`);
        break;
      }
      if (typeof node.className === "string" && node.className.trim()) {
        piece += `.${node.className.trim().split(/\s+/).slice(0, 3).join(".")}`;
      }
      parts.unshift(piece);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const hides = (value) => value === "hidden" || value === "clip";
  const scrolls = (value) => value === "auto" || value === "scroll";

  // The subject has to be a box that actually carries a text run of its own, not
  // any box whose `textContent` happens to include a descendant's. The orbit puts
  // its cards inside empty wrappers that are rotated 120 degrees; a rotated square
  // has a bigger bounding box than the square, so those wrappers hang outside the
  // orbit by design while the card inside them is entirely visible. Asserting on
  // them would demand a fix for something that is not broken.
  const carriesOwnText = (el) =>
    Array.from(el.childNodes).some(
      (node) => node.nodeType === 3 && (node.nodeValue || "").trim(),
    );

  const findings = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!carriesOwnText(el)) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (scrolls(style.overflowX) || scrolls(style.overflowY)) break;
      if (!hides(style.overflowX) && !hides(style.overflowY)) continue;

      const clip = node.getBoundingClientRect();

      // A clipper collapsed to nothing on the clipped axis is a closed
      // disclosure, not a cut: an accordion panel at height 0, a tab panel not
      // selected yet. That content is reachable -- the reader opens it -- which
      // is the same reason a scroll container is skipped above. The orbit's
      // square is 332px tall at 390px, so the defect this probe was written for
      // does not hide behind this, and `an escaping box is still reported` below
      // is what keeps that true.
      const collapsedX = clip.width <= 1;
      const collapsedY = clip.height <= 1;

      const cut = Math.round(
        Math.max(
          hides(style.overflowX) && !collapsedX ? clip.left - box.left : 0,
          hides(style.overflowX) && !collapsedX ? box.right - clip.right : 0,
          hides(style.overflowY) && !collapsedY ? clip.top - box.top : 0,
          hides(style.overflowY) && !collapsedY ? box.bottom - clip.bottom : 0,
        ),
      );
      if (cut > 1) {
        findings.push({ element: describe(el), clippedBy: describe(node), cutPx: cut });
      }
      break;
    }
  }
  return findings;
};

test.describe("nothing is clipped away", () => {
  for (const width of [320, 390, 768, 1024, 1280, 1600]) {
    test(`no content is cut off by an ancestor that hides its overflow at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width);
      await showOrbit(page);

      const findings = await page.evaluate(CLIPPED_AWAY);
      expect(findings, "content the reader has no way to reach").toEqual([]);
    });
  }

  // The probe above skips two things: a scroll container, and a clipper collapsed
  // to nothing. Both are reachable content, and both are also an easy way for the
  // probe to stop probing without anyone noticing -- the suite would stay green
  // by finding nothing anywhere. So pin both halves against a synthetic DOM: the
  // exemption must hold, and a real cut must still be reported.
  test("the clipping probe reports a cut and exempts a collapsed panel", async ({ page }) => {
    await gotoLanding(page, 1280);

    // Built in the live page so the assertion runs the same CLIPPED_AWAY the real
    // tests run, rather than a copy of it that could drift.
    await page.evaluate(() => {
      const host = document.createElement("div");
      host.innerHTML = `
        <div id="probe-cut" style="overflow:hidden;width:40px;height:40px">
          <p style="width:400px">a paragraph far wider than the box holding it</p>
        </div>
        <div id="probe-collapsed" style="overflow:hidden;height:0">
          <p style="height:100px">a paragraph in a panel that is closed</p>
        </div>
        <div id="probe-scroller" style="overflow-x:auto;width:40px">
          <p style="width:400px">a paragraph the reader can scroll to</p>
        </div>
      `;
      document.body.append(host);
    });

    const findings = await page.evaluate(CLIPPED_AWAY);

    const hit = (id) => findings.filter((f) => f.clippedBy.includes(id));

    expect(hit("probe-cut"), "a genuinely cut paragraph is no longer reported").not.toEqual([]);
    expect(hit("probe-collapsed"), "a closed panel is reported as if it were cut").toEqual([]);
    expect(hit("probe-scroller"), "scrollable content is reported as if it were cut").toEqual([]);
  });
});
