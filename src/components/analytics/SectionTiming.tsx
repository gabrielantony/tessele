"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SECTION_ATTRIBUTE, track } from "@/lib/analytics";

gsap.registerPlugin(ScrollTrigger);

/*
 * How long each section held the reader, measured by sampling.
 *
 * This measures rather than animates, so there is no animation for useGSAP to
 * revert and no reduced-motion end state to restore. `prefers-reduced-motion`
 * must not gate it: the timing tests run under reduced motion precisely to pin
 * that a reader who asks for less motion is still counted.
 *
 * The cleanup is explicit for the same reason. This is one of the global,
 * null-rendering components, like FocusRings and SmoothScroll, so useEffect
 * with a hand-written teardown is the lifecycle that fits rather than useGSAP
 * with a scope the component does not have.
 *
 * A section is *active* while it crosses the viewport centre -- start "top
 * center", end "bottom center" -- and not while it is merely on screen. The
 * difference decides whether the number means anything: with "on screen", two
 * sections accrue at every boundary and the totals exceed the visit, which
 * makes the ranking meaningless. At the centre, exactly one section is active
 * at any instant.
 *
 * The section's name is the EVENT name rather than a property, and the vendor
 * forces that: Umami renders event data as a value-and-count breakdown and does
 * not average numeric properties -- the request to add it was closed as not
 * planned. A `seconds` property would arrive as a long tail of near-unique
 * floats, each with a count of one, and the question this component exists to
 * answer would need an API export to read. Counting events by name is the one
 * aggregation Umami does natively, so this uses it.
 *
 * One event every SAMPLE_MS while a section holds the centre, so the
 * dashboard's count times SAMPLE_MS is a floor on the time spent there. The
 * interval restarts on every handover, so a section held briefly contributes
 * nothing rather than inheriting a tick from its neighbour.
 *
 * That floor has a cost: someone oscillating across a boundary never completes
 * a cycle and can accrue nothing, even while genuinely comparing the adjacent
 * sections. Restarting is still the honest trade-off here, because inheriting
 * the previous section's phase would turn that missed attention into an
 * overcount.
 *
 * The last section on the page is only measurable while it is taller than half
 * the viewport, and the footer is 692px whatever the window: at maximum scroll
 * its top sits at viewport height minus 692, so it stops reaching the centre at
 * around 1400px of viewport height and `secao-rodape` is then always zero.
 * Measured, and accepted rather than fixed -- the footer is a link list, never
 * the answer to which section held a reader, and every alternative was worse:
 * dropping its key costs the attribution of its CTA click, excluding it from
 * timing alone is a special case, and moving the ownership line would credit
 * attention to something that genuinely is not at the centre of the view.
 * `docs/superpowers/specs/2026-09-04-analytics-umami-design.md` has the table.
 *
 * Geometry is measured when the triggers are created, before webfonts may have
 * settled, and this component relies on ScrollTrigger's own refresh on load and
 * resize rather than calling refresh itself. A boundary off by tens of pixels
 * costs at most one five-second sample, tolerable for this coarse metric but
 * not for an animation that has to land on an exact scroll position.
 *
 * Nothing is accumulated, which is the point: there is no running total to lose
 * on the way out, so this needs no `pagehide` flush and no state carried across
 * `visibilitychange`. The interval keeps its phase while a tab is hidden and
 * its callback returns early, so the first tick after a return can land almost
 * immediately and credit a full sample for under a second. That error is
 * bounded to one sample per return, which is why the visibility check stays in
 * the tick instead of adding a visibilitychange listener.
 */

// Fine enough to rank ten sections, coarse enough that a two-minute visit costs
// about two dozen events against the plan's quota.
const SAMPLE_MS = 5_000;

const EVENT_PREFIX = "secao-";

export default function SectionTiming() {
  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>(`[${SECTION_ATTRIBUTE}]`);
    if (sections.length === 0) return;

    let active: string | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };

    const start = (name: string) => {
      stop();
      timer = setInterval(() => {
        /*
         * A backgrounded tab is not being read. Browsers already throttle
         * timers there, and throttled is not stopped, so this check is what
         * keeps time away from the desk out of the numbers.
         */
        if (document.visibilityState !== "visible") return;
        track(`${EVENT_PREFIX}${name}`);
      }, SAMPLE_MS);
    };

    /*
     * Adjacent sections hand off at the same scroll position, so onEnter of the
     * new one and onLeave of the old one fire in an order this component does
     * not control. Keying the leave by name makes both orderings correct: enter
     * takes ownership, and a late leave for a section that is no longer active
     * is a no-op. Without the key, that late leave would stop the interval that
     * had just started, and the section being read would measure nothing.
     */
    const enter = (name: string) => {
      if (active === name) return;
      active = name;
      start(name);
    };

    const leave = (name: string) => {
      if (active !== name) return;
      active = null;
      stop();
    };

    const nameOf = (element: Element) => {
      // Safe: every element reaches here through the keyed sections selector.
      return element.getAttribute(SECTION_ATTRIBUTE)!;
    };

    const triggers = sections.map((section) => {
      const name = nameOf(section);
      return ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter: () => enter(name),
        onEnterBack: () => enter(name),
        onLeave: () => leave(name),
        onLeaveBack: () => leave(name),
      });
    });

    /*
     * The section already crossing the centre at mount never receives an
     * onEnter -- its trigger is created past its own start. On a fresh load
     * that is the Hero, and on a reload mid-page it is wherever the reader left
     * off, so without this the section most likely to be read is the one that
     * goes unmeasured.
     */
    const atMount = triggers.find((trigger) => trigger.isActive);
    if (atMount?.trigger) enter(nameOf(atMount.trigger));

    return () => {
      stop();
      for (const trigger of triggers) trigger.kill();
    };
  }, []);

  return null;
}
