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

    // The second affordance that earns the exemption: a child straddling one of
    // the scroller's edges. A card half off the edge says "this row continues"
    // as plainly as a pair of dots does -- it is the standard carousel peek, and
    // it is the one the testimonials design uses instead of controls.
    //
    // Measured, not declared, and both halves are required: enough of the child
    // showing to be noticed, and enough of it hidden to read as cut off rather
    // than as the row simply ending there. A child merely flush with the edge
    // announces nothing, so it does not count.
    const PEEK_MIN = 16;
    const view = {
      left: el.getBoundingClientRect().left + el.clientLeft,
      get right() {
        return this.left + el.clientWidth;
      },
    };
    const peeking = Array.from(el.children).filter((child) => {
      const box = child.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      const overRight = box.left < view.right - PEEK_MIN && box.right > view.right + PEEK_MIN;
      const overLeft = box.right > view.left + PEEK_MIN && box.left < view.left - PEEK_MIN;
      return overRight || overLeft;
    });
    if (peeking.length > 0) continue;

    hiddenScrollers.push({
      element: describe(el),
      hiddenPx: el.scrollWidth - el.clientWidth,
      visibleControls: controls.length,
      peekingChildren: peeking.length,
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

const showDiagram = async (page) => {
  await page.evaluate(() =>
    document.querySelector("[data-diagram]")?.scrollIntoView({ block: "center" }),
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

  // The headline defect this suite was written for was not a static overflow: the
  // problem section used to spin an orbit of cards on a 21s loop, and the cards
  // swung past the page edge as they travelled. A single snapshot reported
  // whatever angle it happened to catch -- measured between 4px and 148px at
  // 390px for the same page.
  //
  // That orbit is gone (the section now lights three fixed cards in sequence), and
  // this test stays because the property is page-wide and cheap: no animation
  // anywhere on the page may widen the document at any point in its loop. Sampling
  // across time is the only way to hold that, whatever is moving.
  for (const width of [390, 900]) {
    test(`the page never scrolls horizontally while motion runs at ${width}px`, async ({
      page,
    }) => {
      await gotoLanding(page, width, { motion: true });
      await showDiagram(page);

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
        `the document swelled to ${worst}px wider than the viewport while motion ran (sample ${worstAt} of 14)`,
      ).toBeLessThanOrEqual(1);
    });
  }

  /*
   * The three tests that lived here measured the orbit's own geometry: an inward
   * offset derived from the cards' rendered width at init, which went stale on
   * resize and overshot vertically on every viewport where a card was taller than
   * wide. There is no orbit any more -- the problem section places three fixed
   * cards by percentage -- so the same guarantees are measured against the
   * section's own markup, at more widths and for a fraction of the runtime, in
   * tests/layout/sections/problem.spec.mjs:
   *
   *   - `the diagram holds its cards and hub inside the square at <w>px` (8 widths)
   *   - `the diagram holds its bounds while the sequence runs at <w>px`
   *   - `the diagram survives a resize across the layout switch`
   *
   * What stays here is the page-wide half: the document must not widen while
   * anything on the page is animating, asserted above.
   */
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
  // any box whose `textContent` happens to include a descendant's. A wrapper's
  // box can sit outside a clipper by design while every box inside it that holds
  // text is entirely visible -- the orbit's rotated slots were the case that
  // forced this, and positioning wrappers still are one. Asserting on them would
  // demand a fix for something that is not broken.
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
      // is the same reason a scroll container is skipped above. No clipper on
      // this page is collapsed on the axis it clips, so the defect this probe was
      // written for does not hide behind this, and `an escaping box is still
      // reported` below is what keeps that true.
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
      await showDiagram(page);

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
