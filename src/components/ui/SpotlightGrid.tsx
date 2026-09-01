"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

/*
 * A faint grid revealed only under the cursor, as a background layer.
 *
 * Renders one absolutely positioned div and drives two CSS custom properties on
 * it; the mask that turns those into a moving hole lives in `.spotlight-grid` in
 * globals.css, which is also where the borrowed reference is recorded.
 *
 * Drop it inside any `relative isolate` element -- it reads its parent's box for
 * coordinates and sits behind the parent's content at `-z-10`.
 */

/*
 * How long the light takes to catch up with the pointer.
 *
 * Not zero, because a spotlight welded to the cursor reads as a cursor
 * decoration, and the thing being sold here is that the surface has depth. Half
 * a second of `power3` lets it arrive rather than jump, which is the same reason
 * the page damps its scroll rather than tracking the wheel notch for notch.
 */
const LAG = 0.5;

export default function SpotlightGrid() {
  const layer = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = layer.current;
      const host = element?.parentElement;
      if (!element || !host) return;

      /*
       * Same gate the CSS applies, read here as well because this half has to
       * agree with that one: with no fine pointer there is nothing to follow, and
       * a touch device fires pointermove on a tap.
       */
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
      }

      /*
       * Reduced motion keeps the spotlight and drops only the travel, which is
       * the same trade CTAButton makes: the effect is driven by the reader's own
       * hand, so it is not the kind of motion the preference is about -- but the
       * half second of drift is, so that goes away and the light sits exactly on
       * the cursor.
       */
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const point = { x: 0, y: 0 };

      const write = () => {
        element.style.setProperty("--spotlight-x", `${point.x}px`);
        element.style.setProperty("--spotlight-y", `${point.y}px`);
      };

      /*
       * Two paths, and the reduced-motion one is not `quickTo` with `duration: 0`.
       *
       * That was the first version and it produces NaN: quickTo keeps one tween
       * and re-aims it, and re-aiming a zero-duration tween leaves its progress
       * maths without a span to divide by. The first pointer position still
       * looked right because the branch below writes it directly, so only the
       * second move onward wrote `--spotlight-x: NaNpx` -- which drops the mask
       * declaration entirely and floods the hero with an unmasked grid. Silent,
       * and only for readers who asked for less motion.
       *
       * With no travel to interpolate there is nothing for a tween to do anyway,
       * so that path just writes the position.
       */
      const aim = reduced
        ? (x: number, y: number) => {
            point.x = x;
            point.y = y;
            write();
          }
        : (() => {
            /*
             * `quickTo` rather than a `gsap.to` per event: pointermove fires up to
             * once a frame, and building a fresh tween each time would cost more
             * than the animation. quickTo reuses one, re-aiming it.
             */
            const xTo = gsap.quickTo(point, "x", {
              duration: LAG,
              ease: "power3",
              onUpdate: write,
            });
            const yTo = gsap.quickTo(point, "y", {
              duration: LAG,
              ease: "power3",
              onUpdate: write,
            });

            return (x: number, y: number) => {
              xTo(x);
              yTo(y);
            };
          })();

      // The grid appearing and disappearing is travel too, so it goes with the
      // rest of it under the preference.
      const fade = reduced ? 0 : 0.4;

      let entered = false;

      const track = (event: PointerEvent) => {
        const box = host.getBoundingClientRect();
        const x = event.clientX - box.left;
        const y = event.clientY - box.top;

        /*
         * The first sighting places the light instead of animating to it.
         * Without this the layer fades in with the spotlight still at the
         * origin, and the reader watches it sweep in from the top-left corner --
         * one large diagonal move that has nothing to do with what their hand
         * did.
         */
        if (!entered) {
          entered = true;
          point.x = x;
          point.y = y;
          write();
          gsap.to(element, { autoAlpha: 1, duration: fade, ease: "power2.out" });
        }

        aim(x, y);
      };

      const leave = () => {
        entered = false;
        gsap.to(element, { autoAlpha: 0, duration: fade, ease: "power2.out" });
      };

      host.addEventListener("pointermove", track);
      host.addEventListener("pointerleave", leave);

      return () => {
        host.removeEventListener("pointermove", track);
        host.removeEventListener("pointerleave", leave);
      };
    },
    { scope: layer },
  );

  return (
    <div
      ref={layer}
      data-spotlight-grid
      aria-hidden="true"
      /*
       * `-z-10` puts it behind the section's content while `isolate` on the host
       * keeps it in front of the section's own background. `opacity-0` is the
       * resting state: the grid exists but is not visible until a pointer has
       * actually been over the section, so a reader who never moves the mouse --
       * or whose JS never runs -- sees the hero exactly as it was.
       */
      className="spotlight-grid pointer-events-none absolute inset-0 -z-10 opacity-0"
    />
  );
}
