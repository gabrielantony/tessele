"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * The seam between the Hero and the Quote section.
 *
 * Five accent panels rise from the bottom of the viewport, centre column first and
 * the edges last, while the Hero scrolls out behind them, until the whole screen is
 * `--color-accent` -- which is also the Quote section's ground, so the two meet on
 * the same colour and there is no edge to see.
 *
 * It wraps the Hero rather than living inside it, or inside the Quote section's
 * lead-in, because it belongs to neither: a curtain that lived in the Hero would
 * make the Hero know the Quote's colour, and one that lived in the Quote would
 * make the Quote know a Hero sits above it.
 *
 * Choreography borrowed from smart-site-282803.framer.app (measured 2026-09-01:
 * five 20%-wide panels, 1px hairline between them, collapsing centre-out). It
 * departs from the reference in two places, both deliberately.
 *
 * The panels grow from the bottom edge rather than retracting off the top. That
 * gesture is on a timer and owes the scroll nothing; this one is the scroll, and
 * the section it hands over to arrives from below -- so dark rising from the
 * bottom travels the way the reader's own input is already pointing. Growing
 * down from the top fights it.
 *
 * And there is no hairline between the panels. The reference is a preloader: it
 * is gone in a second and its seams go with it. Here the shut curtain is on
 * screen for as long as it takes to scroll a viewport, and a line that has
 * finished doing its job is just a line (Gabriel, 2026-09-02).
 */

const PANELS = [0, 1, 2, 3, 4];

/*
 * At 375px, five panels are 75px each -- too narrow to read as panels, and the
 * centre-out stagger becomes noise. These two drop out below `md`, leaving three
 * at a third of the width each. They are the second and fourth, so what survives
 * is still symmetrical around a centre column and the choreography is unchanged.
 */
const WIDE_ONLY = new Set([1, 3]);

/*
 * The timeline is normalised to the runway: 0 is the moment the Hero locks, 1 is
 * the moment it lets go. Everything below is a fraction of that.
 *
 * The Hero's content leaves over the first third rather than across the whole
 * runway. It overlaps the curtain's opening, which is what was asked for, but
 * the curtain runs alone for the final 55% -- and that is where the centre-out
 * stagger has to be read. Two movements running end to end in parallel is how
 * neither of them gets seen whole.
 *
 * The `y` it travels is on top of the scroll the page is already giving it, so
 * the content leaves faster than the page moves. That difference is what makes it
 * read as the content departing rather than as the page merely scrolling.
 */
const CONTENT_EXIT = 0.35;
const CURTAIN_START = 0.15;
const CURTAIN_END = 0.9;

/*
 * How long one panel takes to fall, as a fraction of the runway. Long relative to
 * the 0.75 the whole fall gets, so the panels overlap heavily and it reads as one
 * gesture with a leading centre rather than five separate drops.
 */
const PANEL_FALL = 0.53;

export default function CurtainTransition({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const runway = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const scope = root.current;
      const trigger = runway.current;
      if (!scope || !trigger) return;

      const media = gsap.matchMedia(scope);

      media.add(
        {
          wide: "(min-width: 768px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { wide, motion } = context.conditions as {
            wide: boolean;
            motion: boolean;
          };

          /*
           * The CSS already hides the curtain and the runway under reduced
           * motion, so this only has to decline to build the timeline. Both are
           * live conditions, so a reader who changes the OS setting mid-session
           * gets the same answer from both halves.
           */
          if (!motion) return;

          /*
           * Selecting the array matters rather than handing GSAP all five and
           * letting the hidden ones animate invisibly: a `display: none` panel
           * still occupies a slot in a `from: "center"` stagger, which would put
           * a dead beat in the middle of the fall.
           */
          const panels = gsap.utils.toArray<HTMLElement>(
            wide
              ? "[data-curtain-panel]"
              : "[data-curtain-panel]:not([data-curtain-wide])",
            scope,
          );

          const content = gsap.utils.toArray<HTMLElement>(
            "[data-hero-content]",
            scope,
          );

          gsap.set(panels, { scaleY: 0, willChange: "transform" });

          const timeline = gsap.timeline({
            scrollTrigger: {
              /*
               * The runway itself is the trigger, and that is the whole point:
               * its top edge is the Hero's bottom edge, so `top bottom` fires on
               * exactly the scroll position where `position: sticky` engages, and
               * `bottom bottom` on exactly the one where it lets go.
               *
               * Writing the distance as `+=window.innerHeight` instead would
               * state the runway's length a second time, in a second language,
               * and the two could drift: a timeline shorter than the runway sits
               * closed doing nothing before the release, a longer one gets cut
               * off mid-stagger. This way the length lives only in the CSS below
               * and there is nothing for a resize to recompute wrongly -- the
               * same reason QuoteSection holds with sticky instead of a pin.
               *
               * The runway's top edge is also the moment the curtain's own
               * `sticky top-0` has the viewport to itself, so the fall and the
               * hold start and end together without either being told about the
               * other.
               */
              trigger,
              start: "top bottom",
              end: "bottom bottom",

              // Wired straight to scroll, as QuoteSection is: SmoothScroll
              // already damps the scroll position itself with Lenis, so what
              // this reads is continuous before it gets here.
              scrub: true,

              invalidateOnRefresh: true,
            },
          });

          /*
           * A tween over nothing, purely to give the timeline its full length.
           * Without it the timeline would end when the last panel lands at 0.9,
           * and `scrub` stretches the timeline over the trigger's range -- so the
           * fall would slow down to fill the runway instead of finishing early
           * and holding. The hold is the beat before the release.
           */
          timeline.to({}, { duration: 1 }, 0);

          /*
           * `autoAlpha` rather than `opacity`: it drops `visibility: hidden` in at
           * zero, which takes the invisible Hero out of hit-testing and out of the
           * tab order while the curtain covers it. Reverses cleanly when the
           * reader scrolls back up.
           */
          timeline.to(
            content,
            {
              y: -40,
              autoAlpha: 0,
              ease: "power1.in",
              duration: CONTENT_EXIT,
            },
            0,
          );

          /*
           * `scaleY` rather than `height`, which is what the reference animates:
           * height is a layout property and forces reflow every frame, scaleY runs
           * on the compositor. On a solid fill the two are identical to look at.
           * The panels carry `origin-bottom`, so this grows each one upward from
           * the bottom edge of the screen.
           */
          const fall = CURTAIN_END - CURTAIN_START;

          /*
           * `from: "center"` walks outward in pairs, so the number of steps is
           * half the panel count regardless of whether there are five or three.
           * Deriving `each` from that lands the last panel on CURTAIN_END at both
           * widths, instead of the three-panel version finishing early.
           */
          const steps = Math.floor((panels.length - 1) / 2);

          timeline.to(
            panels,
            {
              scaleY: 1,
              ease: "power2.inOut",
              duration: PANEL_FALL,
              stagger: {
                each: (fall - PANEL_FALL) / steps,
                from: "center",
              },
            },
            CURTAIN_START,
          );

          /*
           * Nothing follows the fall.
           *
           * The panels each carried a 1px hairline, faded out across CURTAIN_END
           * to 1 so that the handover happened on a plain field. A fade is not a
           * removal, though: the line was painted for the whole fall and then for
           * as long as the shut curtain took to scroll off, which is up to a
           * viewport of travel with nothing else moving on the screen. Taking the
           * seam out takes this tween with it, and CURTAIN_END is now only what
           * its name says -- the end of the fall, and the beat before the release.
           */

          return () => {
            gsap.set(panels, { clearProps: "willChange" });
          };
        },
      );
    },
    { scope: root },
  );

  return (
    /*
     * `z-0` makes this a stacking context, and that is what keeps the panels'
     * `z-10` a statement about the Hero rather than about the page.
     *
     * Without it the panels outrank every following section, and the next one
     * along paints part of itself inside this wrapper's box: QuoteSection holds
     * its sentence with `sticky` and `-translate-y-1/2`, so half the sentence's
     * height sits above its own section's top edge -- exactly the strip the shut
     * curtain occupies. Same colour, so it does not read as an overlap; it reads
     * as the sentence's first words never arriving. Confining the z-index here
     * costs nothing (the curtain only ever needs to cover what it wraps) and no
     * section downstream has to know a curtain exists to outrank it.
     */
    <div ref={root} className="relative z-0">
      {children}

      {/*
       * The runway: one viewport of scroll for the curtain to close over, and the
       * only place its length is written.
       *
       * `bg-canvas` because it is what the reader is looking at underneath the
       * falling panels once the Hero has scrolled up past them. The Hero's ground
       * is the same colour and its content has already left, so the two read as
       * one uninterrupted field rather than as a hole below the Hero.
       *
       * `motion-reduce:hidden` removes it rather than shortening it, so under
       * reduced motion this wrapper collapses to the Hero's own height and the
       * page costs exactly what it costs today.
       */}
      <div
        ref={runway}
        data-curtain-runway
        aria-hidden="true"
        className="h-dvh bg-canvas motion-reduce:hidden"
      />

      {/*
       * The curtain holds the viewport while the Hero scrolls out from under it.
       *
       * Holding the Hero instead was the first design and it does not work:
       * `position: sticky` can only pull a box toward an edge it is short of, so
       * `bottom-0` on a box at the top of its container does nothing at all
       * (measured), and `top-0` freezes the Hero at the first pixel of scroll --
       * which on a phone, where the Hero is 780px against a ~745px `dvh`, would
       * put its CTA permanently out of reach.
       *
       * Holding the curtain instead needs none of that, because the curtain is
       * exactly one viewport tall by construction: `sticky top-0` on a `h-dvh`
       * box is the case sticky handles without any caveat, at every screen size.
       * And nothing is lost by letting the Hero go, because the Hero's content
       * has already left by the time it matters -- what scrolls behind the panels
       * from then on is a flat canvas field, which looks the same held or moving.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 motion-reduce:hidden"
      >
        <div className="sticky top-0 flex h-dvh">
          {PANELS.map((panel) => (
            <div
              key={panel}
              data-curtain-panel
              data-curtain-wide={WIDE_ONLY.has(panel) ? "" : undefined}
              className={[
                /*
                 * `scale-y-0` in the markup, not only in `gsap.set`: the panels
                 * cover the Hero from the first paint, so leaving them full until
                 * JS runs would flash a black screen on load.
                 */
                "h-full flex-1 origin-bottom scale-y-0 bg-accent",
                /*
                 * No seam between the panels. Each carried a 1px hairline so that
                 * five same-coloured panels touching would still read as five --
                 * and it did its job for the length of the fall and then went on
                 * being a line on a field that had nothing else in it, all the way
                 * up the screen. Gabriel called it (2026-09-02) and it goes.
                 *
                 * What the stagger reads against instead is the one thing the
                 * hairline was never needed for: while the panels are rising their
                 * top edges are at five different heights against the Hero's cream
                 * ground behind them, which is where the centre-out gesture is
                 * legible. The seams only ever separated panels that had already
                 * arrived, where there is no gesture left to read.
                 */
                WIDE_ONLY.has(panel) ? "hidden md:block" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
