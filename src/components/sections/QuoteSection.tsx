"use client";

import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const QUOTE =
  "Ajudamos negócios a crescer resolvendo os problemas de comunicação, design e presença digital que estão impedindo sua empresa de avançar.";

const WORDS = QUOTE.split(" ");

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = 1 / PHI;

function fibonacciEase(progress: number) {
  return 1 - Math.pow(1 - progress, PHI * PHI);
}

export default function QuoteSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!root.current) return;

      const letters = gsap.utils.toArray<HTMLElement>(
        "[data-letter]",
        root.current,
      );

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set(letters, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        });

        return;
      }

      /*
       * Estado inicial:
       * a frase inteira continua perceptível,
       * mas ainda desfocada.
       */
      gsap.set(letters, {
        opacity: 0.16,
        y: 8,
        filter: "blur(6px)",
        willChange: "transform, opacity, filter",
      });

      const timeline = gsap.timeline({
        defaults: {
          ease: "none",
        },
        scrollTrigger: {
          trigger: root.current,

          /*
           * A seção chega ao topo e fica presa
           * enquanto toda a frase é revelada.
           */
          start: "top top",

          /*
           * Aproximadamente 1,618 viewport de scroll.
           * Dá espaço suficiente para a leitura acontecer
           * sem parecer lenta demais.
           */
          end: () => `+=${window.innerHeight * 1.3}`,

          pin: true,

          /*
           * Sem atraso artificial.
           * Scroll e animação ficam 1:1.
           */
          scrub: true,

          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      timeline.to(letters, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",

        /*
         * Cada letra ocupa uma pequena região
         * da timeline, criando sobreposição entre elas.
         */
        duration: PHI_INVERSE,

        stagger: {
          each: 0.018,
          from: "start",
          ease: fibonacciEase,
        },

        ease: fibonacciEase,
      });

      return () => {
        gsap.set(letters, {
          clearProps: "willChange",
        });
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="
        flex
        min-h-dvh
        w-full
        items-center
        justify-center
        overflow-hidden
        bg-accent
        px-page
        py-section
      "
    >
      <h2
        aria-label={QUOTE}
        className="
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
              <span className="inline-block whitespace-nowrap">
                {Array.from(word).map(
                  (letter, letterIndex) => (
                    <span
                      key={`${wordIndex}-${letterIndex}`}
                      data-letter
                      className="inline-block"
                    >
                      {letter}
                    </span>
                  ),
                )}
              </span>

              {wordIndex < WORDS.length - 1
                ? " "
                : null}
            </Fragment>
          ))}
        </span>
      </h2>
    </section>
  );
}