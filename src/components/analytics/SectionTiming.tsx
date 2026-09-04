"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SECTION_ATTRIBUTE, track } from "@/lib/analytics";

gsap.registerPlugin(ScrollTrigger);

/*
 * How long each section held the reader, measured by sampling.
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
 * Nothing is accumulated, which is the point: there is no running total to lose
 * on the way out, so this needs no `pagehide` flush and no state carried across
 * `visibilitychange`.
 */

// Fine enough to rank ten sections, coarse enough that a two-minute visit costs
// about two dozen events against the plan's quota.
const SAMPLE_MS = 5_000;

const EVENT_PREFIX = "secao-";

const FALLBACK_NAME = "sem-nome";

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

    const nameOf = (element: Element) =>
      element.getAttribute(SECTION_ATTRIBUTE) ?? FALLBACK_NAME;

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
