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
 * What goes between two words: a normal space everywhere except before the last
 * word, which is tied to the one before it with a non-breaking space.
 *
 * Without the tie, "avançar." was the whole fifth line across the 851-897px band
 * -- and here that reads worse than in a static heading, because the sentence
 * writes itself word by word and the last word arrives alone on a line of its
 * own. The tie is invisible to assistive tech: `aria-label` reads QUOTE, which
 * keeps its plain spaces.
 */
const separatorAfter = (index: number) => {
  if (index === WORDS.length - 1) return null;
  return index === WORDS.length - 2 ? "\u00a0" : " ";
};

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

/*
 * How much of the bottom edge the sentence's last line keeps clear of at the
 * moment the first word lights, in pixels. Small on purpose: it exists so the
 * sentence is whole when it starts writing itself, not to stage it.
 */
const BOTTOM_CLEARANCE = 40;

export default function QuoteSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!root.current) return;

      const words = gsap.utils.toArray<HTMLElement>("[data-word]", root.current);
      const [sentence] = gsap.utils.toArray<HTMLElement>("h2", root.current);

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
           * The words start as soon as the whole sentence is on screen, which is
           * half the sentence plus BOTTOM_CLEARANCE past the section's entry: the
           * sticky child's static top is the section's top edge and it carries
           * `-translate-y-1/2`, so the sentence is painted centred on that edge
           * and its last line clears the bottom of the screen by exactly the
           * clearance at the moment the first word lights.
           *
           * Derived from the sentence rather than written as a fraction of the
           * viewport because the same sentence is two lines wide and four narrow.
           * Any fixed fraction is therefore late on a desktop or starts a mobile
           * sentence with its last line still off the bottom edge. A function
           * start is re-read on every refresh, so a resize that reflows the
           * sentence carries the start with it.
           *
           * This read `top center` -- the moment the sentence reaches the
           * position the sticky holds it in. Tying the two together is what cost
           * the reader half a viewport: the curtain lets go when the section's
           * top enters the bottom of the screen, and `center` is 50dvh further
           * on. Measured on a 900px-tall window, the curtain released at y=900
           * and the first word did not light until y=1350. From the entry it is
           * y=1036, and the sentence now writes its opening words while it rises
           * the last stretch into the hold instead of after arriving there.
           *
           * Which is the same correction the `top top` version needed and got
           * wrong: the fault there was never that the reveal started early, it
           * was that nothing was moving behind it. Here something is -- the
           * sentence itself.
           */
          start: () =>
            `top bottom-=${Math.round(sentence.offsetHeight / 2 + BOTTOM_CLEARANCE)}`,

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
     *   ~136px  of lead-in before the first word -- half the sentence plus the
     *           clearance the trigger's start is derived from,
     *   620px   of reading (revealDistance's cap),
     *   ~180px  of beat holding the finished sentence,
     *   ~120px  for the sentence's own half-height, worst case at 3 lines,
     *
     * so 66rem. The beat was ~300px, the reference's; it is shorter here for the
     * same reason the reading is (see revealDistance), and because the two
     * stack: everything the beat holds is scroll spent after the last word has
     * landed and there is nothing left to watch.
     *
     * This carried a `50dvh` term while the reveal started at `top center`. That
     * term paid for the half viewport between the section's entry and the sticky
     * engaging -- scroll the reader spent on a field with nothing in it, since
     * the sentence was blank until the end of it. The start now begins at the
     * entry, so there is nothing left for the term to pay for, and dropping it
     * is what turns those 314px (on a 900px-tall window) into scroll the page no
     * longer asks for rather than scroll moved behind the finished sentence: the
     * start moved earlier by exactly what the height lost, at every height.
     *
     * What the height buys is not what the tail measures, and the difference is
     * worth knowing before tuning this: the hold engages half a viewport before
     * the section's top reaches the top of the screen, so on a 900px window the
     * finished sentence is actually held for ~558px, not the ~180px this list
     * reads like. That figure is untouched by this change and is the thing to
     * cut if the tail still feels long.
     *
     * No `overflow-hidden` here: it would make this section its own scrollport,
     * and the sticky child would have nothing to stick against.
     */
    <section ref={root} className="relative h-[66rem] w-full bg-accent">
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

                {separatorAfter(wordIndex)}
              </Fragment>
            ))}
          </span>
        </h2>
      </div>
    </section>
  );
}
