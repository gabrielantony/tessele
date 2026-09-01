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
    hiddenScrollers.push({
      element: describe(el),
      hiddenPx: el.scrollWidth - el.clientWidth,
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
});
