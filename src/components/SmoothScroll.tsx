"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/*
 * Page-wide damped scroll.
 *
 * Mounted once from the root layout, renders nothing. Every scroll-linked
 * section on the page reads the same scroll position, so the smoothing belongs
 * here rather than in any one of them.
 *
 * Why at all: native wheel input arrives in discrete 40-100px steps, and a
 * scroll-scrubbed animation transmits each step straight to whatever it drives.
 * Lenis interpolates the scroll position toward the input's target instead, so
 * the value every section reads moves continuously. This is what the reference
 * this page's quote section was rebuilt against does (fathom.framer.media,
 * measured 2026-09-01: smoothWheel on, lerp 0.1, syncTouch off), and it is the
 * larger half of why that site's scroll reads as well as it does -- the other
 * half being CSS sticky instead of a JS pin, which QuoteSection now uses.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      smoothWheel: true,

      /*
       * Each frame the animated scroll closes 10% of the gap to where the input
       * asked for. An exponential follow, which is the same shape as a critically
       * damped spring and has no overshoot -- the reference's value, and it lands
       * where scroll stops feeling attached to the wheel notches without feeling
       * detached from the hand.
       */
      lerp: 0.1,

      /*
       * Touch stays native, as the reference has it. `syncTouch` is where Lenis
       * most often makes things worse: it takes over the platform's own inertia,
       * and phone scrolling is the one place that inertia is already excellent
       * and deeply tuned. This is the default, stated because it is a decision.
       */
      syncTouch: false,

      /*
       * Anchor links have to route through Lenis. A native jump moves the real
       * scroll position while Lenis's internal target stays where it was, so the
       * next wheel event snaps back to the old place.
       *
       * Note that the page's three anchors -- #contato from the Hero and the
       * process CTA, #privacidade from the footer -- currently point at ids that
       * do not exist anywhere in the source, so Lenis will warn that the target
       * was not found. That is the missing id, not this option.
       */
      anchors: true,

      /*
       * GSAP's ticker drives the loop instead of Lenis's own, so the scroll
       * position is interpolated and every ScrollTrigger reads it inside the
       * same frame. With two independent loops the animations trail the scroll
       * by a frame, which is exactly the unevenness this is here to remove.
       */
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    // gsap.ticker measures in seconds, lenis.raf in milliseconds.
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);

    /*
     * Off, and this one has a real trade-off. GSAP's lag smoothing freezes the
     * ticker's clock when a frame takes longer than 500ms, so time-based
     * animations do not leap after a stall. But the clock is what advances Lenis
     * here, so freezing it freezes scrolling itself until the next healthy
     * frame. Nearly everything on this page is scroll-scrubbed rather than
     * time-based, so a stalled scroll is the worse of the two.
     */
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      // GSAP's documented defaults, restored so unmounting leaves no trace.
      gsap.ticker.lagSmoothing(500, 33);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, []);

  return null;
}
