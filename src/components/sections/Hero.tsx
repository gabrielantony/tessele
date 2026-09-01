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
      className="
        relative
        isolate
        flex
        min-h-[48.75rem]
        w-full
        lg:min-h-screen
        flex-col
        items-center
        justify-center
        gap-space-8
        overflow-hidden
        bg-canvas
        px-page
        py-section
      "
    >
      {/*
       * `isolate` above is what makes this work: the grid sits at -z-10 so it
       * stays behind the copy, and the stacking context keeps that negative index
       * from dropping it behind the section's own bg-canvas, where it would be
       * invisible.
       */}
      <SpotlightGrid />

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
    </section>
  );
}
