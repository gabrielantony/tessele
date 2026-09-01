"use client";

import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const QUOTE =
  "Ajudamos negócios a crescer resolvendo os problemas de comunicação, design e presença digital que estão impedindo sua empresa de avançar.";

const WORDS = QUOTE.split(" ");

/*
 * How much scroll the sentence takes to write itself, in pixels.
 *
 * A reading distance, so it is capped rather than a multiple of the viewport:
 * the same 20 words should not cost 1.9x the wheel on a tall screen. The
 * viewport term only takes over below ~740px tall, where a flat 810px would
 * outlast the runway the section has to give.
 */
const revealDistance = () => Math.round(Math.min(810, window.innerHeight * 1.1));

export default function QuoteSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!root.current) return;

      const words = gsap.utils.toArray<HTMLElement>("[data-word]", root.current);

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set(words, { opacity: 1 });

        return;
      }

      gsap.set(words, { opacity: 0, willChange: "opacity" });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,

          /*
           * The words start once the dark ground fills the screen. The sticky
           * child has already centred itself half a viewport earlier, so the
           * sentence is in position and blank while the section is still
           * arriving -- which is the breath before it starts, not a dead zone.
           */
          start: "top top",

          end: () => `+=${revealDistance()}`,

          /*
           * No `pin`. The hold is CSS `position: sticky` on the child, which is
           * what the reference does and what removes the entry flick as a class
           * of bug rather than tuning it: a GSAP pin swaps the element to
           * `position: fixed` and inserts a spacer, and that swap is the
           * discontinuity. Sticky has no engage step for the eye to catch, and
           * the browser composites it.
           *
           * It also means this trigger only reveals words. It owns no geometry,
           * so there is nothing for a resize to recompute wrongly.
           */

          /*
           * A number, not `true`. The reference gets its smoothness from Lenis
           * damping the scroll position itself (lerp 0.1), so its reveal can
           * afford to be wired straight to scroll. With native wheel input the
           * scroll arrives in 40-100px steps, so the damping has to live here
           * instead: 0.6s of catch-up is the same damped follow, applied to the
           * animation rather than to the page.
           */
          scrub: 0.6,

          invalidateOnRefresh: true,
        },
      });

      /*
       * One word in transit at a time.
       *
       * This is the measurement that separated the reference from the previous
       * version here: sampling its reveal at 12px of scroll found exactly one
       * word part-faded at any moment, at ~47px of scroll each. The old build
       * had ~70 letters simultaneously mid-fade, which never reads as words
       * appearing -- it reads as fog lifting, and every one of those 70 carried
       * the scroll's unevenness at once.
       *
       * A word's fade spanning 1.2 stagger slots is what buys that: enough
       * overlap that no word snaps, not enough for a crowd.
       */
      const each = 1 / (WORDS.length - 1);

      timeline.to(words, {
        opacity: 1,
        duration: each * 1.2,
        ease: "none",
        stagger: { each, from: "start" },
      });

      return () => {
        gsap.set(words, { clearProps: "willChange" });
      };
    },
    { scope: root },
  );

  return (
    /*
     * The runway, and it is composed rather than picked: the section has to be
     * tall enough for everything that happens inside it, which is
     *
     *   50dvh   to carry the sentence to the middle of the screen and stick it,
     *   810px   of reading (revealDistance's cap),
     *   ~220px  of the scrub's catch-up past the trigger's end at 0.6s,
     *   ~300px  of beat holding the finished sentence, as the reference does,
     *   ~120px  for the sentence's own half-height, worst case at 3 lines,
     *
     * so 50dvh + 1450px. A flat multiple of the viewport gets this wrong at both
     * ends: 180dvh left only 24px of beat on a 900px-tall screen, because the
     * reading distance is a constant and does not shrink with the runway.
     *
     * No `overflow-hidden` here: it would make this section its own scrollport,
     * and the sticky child would have nothing to stick against.
     */
    <section
      ref={root}
      className="relative h-[calc(50dvh+1450px)] w-full bg-accent"
    >
      <div className="sticky top-[50dvh] -translate-y-1/2 px-page">
        <h2
          aria-label={QUOTE}
          className="
            mx-auto
            w-full
            max-w-narrow
            text-center
            text-heading-2
            text-on-accent
          "
        >
          <span aria-hidden="true">
            {WORDS.map((word, wordIndex) => (
              <Fragment key={`${word}-${wordIndex}`}>
                <span data-word>{word}</span>

                {wordIndex < WORDS.length - 1 ? " " : null}
              </Fragment>
            ))}
          </span>
        </h2>
      </div>
    </section>
  );
}
