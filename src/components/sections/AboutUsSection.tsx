"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * SCAFFOLDING — delete this file.
 *
 * Shape of a section that animates. Three things make it different from the
 * static one, and all three are required:
 *
 *   1. "use client" at the top — GSAP touches the DOM, so this cannot be a
 *      server component. Forgetting it is the single most common error in
 *      LLM-generated Next.js + GSAP code.
 *   2. useGSAP({ scope }) instead of useEffect — it reverts every tween and
 *      ScrollTrigger created inside it on unmount and before re-running. That
 *      cleanup is what stops triggers from stacking.
 *   3. A reduced-motion path — read docs/failure-archetypes.md before writing
 *      any real scroll sequence here. Every archetype in it is a bug that
 *      already escaped once in this exact area.
 */
export default function AboutUsSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Static end state, not a shorter animation.
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        return;
      }

      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 16,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="bg-surface-sunken px-page py-section"
    >
      <div className="mx-auto w-full max-w-(--container-content)">
        <p data-reveal className="text-label text-muted uppercase">
          Motion section
        </p>
        <h2 data-reveal className="text-heading-2 font-display mt-space-4">
          Placeholder heading
        </h2>
        <p data-reveal className="text-lead text-muted mt-space-6 max-w-[35rem]">
          Scroll down and these three elements rise into place, staggered.
        </p>
      </div>
    </section>
  );
}
