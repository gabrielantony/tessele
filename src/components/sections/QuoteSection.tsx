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
 * the same 20 words should not cost 1.9x the wheel on a tall screen, which is
 * what `innerHeight * 1.3` used to do. 620px over 20 words is ~33px each.
 *
 * This was 890px, ~47px per word, taken off the reference
 * (fathom.framer.media, 18 words at that pace). The reference's pace is right
 * for the reference: there the sentence is the arrival. Here the curtain has
 * already spent a viewport delivering the ground it sits on, so the reader
 * reaches the first word having been in this colour for a while -- and 890px is
 * then most of two screens of wheel spent on twenty words that were already
 * legible in outline.
 *
 * ~33px per word changes the pace and nothing else: the stagger is normalised to
 * the timeline, so one word is still in transit at a time. It also stays well
 * clear of the ~20px floor below which the sentence dumps itself faster than it
 * can be read.
 *
 * The viewport term takes over below 620px tall, where a full screen of scroll
 * is already as much as that display can spare for one sentence.
 */
const revealDistance = () => Math.round(Math.min(620, window.innerHeight));

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
           * The words start the moment the sentence reaches the position it will
           * be held in -- `top center` is exactly when the section's top hits the
           * middle of the screen, which is where `top-[50dvh]` engages the sticky.
           *
           * This read `top top` while the Hero scrolled straight into this
           * section, and the half viewport between the two was a breath: the
           * sentence sat centred and blank while the dark ground was still
           * arriving behind it. CurtainTransition now delivers that ground a
           * viewport earlier, and the breath stopped being a breath. Measured on a
           * 900px-tall window: the curtain finished at y=852 and the first word
           * did not appear until y=1812 -- 960px, better than a full screen, of a
           * flat field with nothing happening in it. Nothing was arriving any
           * more; it had already arrived.
           *
           * So this is not the reveal being rushed. It is the same breath it
           * always was, taken back to the point where something is actually still
           * in motion behind the sentence.
           */
          start: "top center",

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
           * Wired straight to scroll, because the smoothing already happened
           * upstream: SmoothScroll damps the scroll position itself with Lenis
           * at lerp 0.1, so what this reads is already continuous. Measured, one
           * wheel tick ramps the scroll over 38 frames and Lenis hands this
           * ~29px per frame at its fastest, which is 0.6 of a word -- nothing
           * here can snap.
           *
           * This carried `scrub: 0.6` while the page still scrolled natively and
           * the damping had nowhere else to live. Keeping both stacked two lags:
           * measured, the reveal then settled 150ms after the scroll had already
           * stopped, for no gain in smoothness. The reference wires its reveal
           * directly for the same reason.
           */
          scrub: true,

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
     *   620px   of reading (revealDistance's cap),
     *   ~180px  of beat holding the finished sentence,
     *   ~120px  for the sentence's own half-height, worst case at 3 lines,
     *
     * so 50dvh + 920px. The beat was ~300px, the reference's; it is shorter here
     * for the same reason the reading is (see revealDistance), and because the
     * two stack: everything the beat holds is scroll spent after the last word
     * has landed and there is nothing left to watch.
     *
     * A flat multiple of the viewport gets this wrong at both
     * ends: 180dvh left only 24px of beat on a 900px-tall screen, because the
     * reading distance is a constant and does not shrink with the runway.
     *
     * Both terms scaling with dvh is what lands the release at the same scroll
     * offset on every height: the runway grows by exactly what the sticky offset
     * takes.
     *
     * No `overflow-hidden` here: it would make this section its own scrollport,
     * and the sticky child would have nothing to stick against.
     */
    <section
      ref={root}
      className="relative h-[calc(50dvh+920px)] w-full bg-accent"
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
