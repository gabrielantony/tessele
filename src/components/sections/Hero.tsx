"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CTAButton from "@/components/ui/CTAButton";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
      <div
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

      <CTAButton href="#contato" label="Quero falar do meu projeto" />
    </section>
  );
}
