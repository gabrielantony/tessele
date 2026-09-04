"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CTAButton from "@/components/ui/CTAButton";
import SpotlightGrid from "@/components/ui/SpotlightGrid";
import { whatsappHref } from "@/lib/whatsapp";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
 * The CTA opens WhatsApp directly rather than scrolling to the form below. The
 * form has no backend -- WhatsApp is the only destination either path can reach
 * -- so the only question was how many clicks to get there.
 *
 * Kept to one sentence on purpose: the visitor is the one who sends this, and a
 * long message put in their mouth is a message they delete and retype.
 */
const WHATSAPP_MESSAGE =
  "Oi! Vi o site de vocês e queria conversar sobre um projeto aqui da empresa.";

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        return;
      }

      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 16,
        duration: 0.61,
        stagger: 0.089,
        ease: "power3.out",
        scrollTrigger: {
          trigger: root.current,
          start: "top 80%",
          once: true,
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-analytics-section="hero"
      /*
       * Two different jobs used to share this one min-height, and they want
       * different numbers.
       *
       * This one is the scroll geometry: the curtain's runway sits directly below
       * this section and triggers on `top bottom`, which resolves to
       * `sectionHeight - viewportHeight`. Negative means the page loads with the
       * timeline already part-run (docs/failure-archetypes.md), so the section
       * must never be shorter than the viewport can get -- and `lvh` is exactly
       * that: the viewport with the browser's own chrome retracted. `dvh` and
       * `svh` both report the *current*, chrome-expanded height on a phone (695
       * against an `lvh` of 735, measured), so either of them leaves the section
       * short of the viewport the moment the address bar rolls away.
       *
       * Centring the copy is the other job, and it moved to the wrapper below.
       */
      className="
        relative
        isolate
        min-h-[max(48.75rem,100lvh)]
        w-full
        overflow-hidden
        bg-canvas
      "
    >
      {/*
       * `isolate` above is what makes this work: the grid sits at -z-10 so it
       * stays behind the copy, and the stacking context keeps that negative index
       * from dropping it behind the section's own bg-canvas, where it would be
       * invisible.
       */}
      <SpotlightGrid />

      {/*
       * The copy centres on what the reader can actually see, which is not the
       * section.
       *
       * The section is `max(48.75rem, 100lvh)` for the reason above, and on a
       * phone the 48.75rem floor wins: 780px of section against 665px of visible
       * viewport (measured, Chrome iOS). Centring inside that box puts the middle
       * of the copy 58px below the middle of the screen, because the whole 115px
       * of surplus is below the fold -- the copy was never off-centre in its box,
       * the box was taller than the window.
       *
       * `svh` rather than `dvh`: dvh would re-centre the copy every time the
       * address bar rolls in or out, which is a relayout mid-scroll fighting the
       * `y` the curtain is tweening on these same elements. svh is the height with
       * the chrome expanded, which is the state the page loads in and the only one
       * where a centred hero is what the reader is looking at.
       *
       * The page padding lives here rather than on the section for the same
       * reason: on the section it would eat into the box this height describes,
       * and the copy would centre 32px low again.
       */}
      <div
        className="
          flex
          min-h-[100svh]
          w-full
          flex-col
          items-center
          justify-center
          gap-space-8
          px-page
          py-section
        "
      >
        <div
          data-hero-content
          className="
            flex
            w-full
            max-w-narrow
            flex-col
            items-center
            gap-space-4
          "
        >
          <div
            data-reveal
            className="
              flex
              min-h-space-4
              w-full
              items-center
              justify-center
              gap-space-2
            "
          >
            <span
              aria-hidden="true"
              className="
                hidden
                size-space-1-5
                shrink-0
                rounded-full
                bg-highlight
                md:block
              "
            />

            <p
              className="
                text-label
                text-center
                uppercase
                text-muted
              "
            >
              ESTÚDIO DE MARKETING, DESIGN{" "}
              <br className="md:hidden" />
              E DESENVOLVIMENTO EM CURITIBA
            </p>
          </div>

          <div
            className="
              flex
              w-full
              flex-col
              items-center
              gap-space-4
            "
          >
            <h1
              data-reveal
              className="
                text-display
                font-display
                w-full
                text-balance
                text-center
                text-ink
              "
            >
              Sua empresa não precisa fazer mais. Precisa saber o que faz{" "}
              <span className="text-highlight">sentido</span> fazer agora.
            </h1>

            <p
              data-reveal
              className="
                text-lead
                w-full
                max-w-copy
                text-center
                text-muted
              "
            >
              Estratégia para escolher o caminho. Design e desenvolvimento para
              fazê-lo acontecer.
            </p>
          </div>
        </div>

        {/*
         * The CTA is wrapped rather than marked directly because CTAButton already
         * owns `y` and `scale` on itself for hover, press and focus. The curtain's
         * exit tween writes `y` too, and any settle firing mid-scrub would stomp it.
         * Two elements, two transforms, and they compose instead of fighting.
         */}
        <div data-hero-content>
          <CTAButton
            href={whatsappHref(WHATSAPP_MESSAGE)}
            external
            label="Quero falar do meu projeto"
          />
        </div>
      </div>
    </section>
  );
}
