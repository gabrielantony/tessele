"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = 1 / PHI;
const PHI_SQUARED = PHI * PHI;

const FIBONACCI_DURATION = PHI_INVERSE;
const FIBONACCI_DURATION_QUICK = FIBONACCI_DURATION * PHI_INVERSE;
const FIBONACCI_OFFSET = FIBONACCI_DURATION_QUICK * PHI_INVERSE;

const ENTER_Y_PERCENT = PHI * 10;
const ENTER_SCALE = 1 - PHI_INVERSE / 10;

function fibonacciEaseOut(progress: number) {
  return 1 - Math.pow(1 - progress, PHI_SQUARED);
}

const STEPS = [
  {
    number: "01",
    label: "Visão",
    title: "Entender o que está travando",
    description:
      "Antes de propor qualquer entrega, a gente entende o negócio, o momento da empresa e o que está impedindo o próximo passo.",
  },
  {
    number: "02",
    label: "Estratégia",
    title: "Definir o que merece ser feito",
    description:
      "Nem todo problema pede mais uma ação. A gente escolhe o que precisa de prioridade e qual direção faz sentido seguir.",
  },
  {
    number: "03",
    label: "Execução",
    title: "Dar forma à solução",
    description:
      "Com a direção definida, a gente transforma a decisão em projeto e execução, combinando marketing, design e desenvolvimento conforme a necessidade.",
  },
];

export default function OurProcessSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;

      if (!section) {
        return;
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const motionTargets =
        section.querySelectorAll<HTMLElement>("[data-motion]");

      if (prefersReducedMotion) {
        gsap.set(motionTargets, {
          clearProps: "all",
        });

        return;
      }

      const title = section.querySelector("[data-title]");
      const titleRule = section.querySelector("[data-title-rule]");
      const steps = gsap.utils.toArray<HTMLElement>(
        section.querySelectorAll("[data-step]"),
      );
      const stepLines = gsap.utils.toArray<HTMLElement>(
        section.querySelectorAll("[data-step-line]"),
      );
      const footerLine = section.querySelector("[data-footer-line]");
      const footerCopy = section.querySelector("[data-footer-copy]");
      const cta = section.querySelector("[data-cta]");
      const ctaDot = section.querySelector("[data-cta-dot]");

      const timeline = gsap.timeline({
        defaults: {
          ease: fibonacciEaseOut,
        },
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          // Deliberate: scrolling back up above the start plays the entrance in
          // reverse, so the section re-enters on the way down. Not a bug — do
          // not "fix" this to "play none none none".
          toggleActions: "play none none reverse",
        },
      });

      timeline
        .from(title, {
          opacity: 0,
          yPercent: ENTER_Y_PERCENT,
          duration: FIBONACCI_DURATION,
        })
        .from(
          titleRule,
          {
            scaleX: 0,
            transformOrigin: "left center",
            duration: FIBONACCI_DURATION_QUICK,
          },
          `-=${FIBONACCI_DURATION_QUICK}`,
        )
        .from(
          steps,
          {
            opacity: 0,
            yPercent: ENTER_Y_PERCENT,
            duration: FIBONACCI_DURATION,
            stagger: {
              each: FIBONACCI_DURATION_QUICK,
            },
          },
          `-=${FIBONACCI_OFFSET}`,
        )
        .from(
          stepLines,
          {
            scaleX: 0,
            transformOrigin: "left center",
            duration: FIBONACCI_DURATION_QUICK,
            stagger: {
              each: FIBONACCI_DURATION_QUICK,
            },
          },
          "<",
        )
        .from(
          footerLine,
          {
            scaleX: 0,
            transformOrigin: "left center",
            duration: FIBONACCI_DURATION,
          },
          `-=${FIBONACCI_DURATION_QUICK}`,
        )
        .from(
          footerCopy,
          {
            opacity: 0,
            yPercent: ENTER_Y_PERCENT,
            duration: FIBONACCI_DURATION_QUICK,
          },
          `-=${FIBONACCI_DURATION_QUICK}`,
        )
        .from(
          cta,
          {
            opacity: 0,
            scale: ENTER_SCALE,
            duration: FIBONACCI_DURATION,
          },
          "<",
        )
        .from(
          ctaDot,
          {
            opacity: 0,
            scale: 0,
            duration: FIBONACCI_DURATION_QUICK,
          },
          `-=${FIBONACCI_OFFSET}`,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="bg-canvas px-page py-section text-ink"
    >
      <div className="mx-auto w-full max-w-wide">
        <header>
          <div className="overflow-hidden">
            <h2
              data-motion
              data-title
              className="text-heading-2"
            >
              Como a gente decide o que fazer
            </h2>
          </div>

          <div
            data-motion
            data-title-rule
            aria-hidden="true"
            className="mt-space-6 h-space-1 w-space-40 origin-left rounded-full bg-highlight"
          />
        </header>

        <ol className="mt-space-20 grid grid-cols-[repeat(auto-fit,minmax(min(100%,calc(var(--spacing-space-40)*2)),1fr))] gap-space-12">
          {STEPS.map((step) => (
            <li
              key={step.number}
              data-motion
              data-step
            >
              <div className="flex items-center gap-space-3">
                <span
                  aria-hidden="true"
                  className="size-space-2-5 shrink-0 rounded-full bg-highlight"
                />

                <span
                  data-motion
                  data-step-line
                  aria-hidden="true"
                  className="flex-1 origin-left border-t border-hairline"
                />

                <span className="text-label shrink-0 text-muted uppercase">
                  {step.label}
                </span>
              </div>

              <p className="mt-space-10 text-metric">
                {step.number}
              </p>

              <h3 className="mt-space-8 text-heading-4">
                {step.title}
              </h3>

              <p className="mt-space-2 text-body text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="relative mt-space-16 pt-space-8">
          <div
            data-motion
            data-footer-line
            aria-hidden="true"
            className="absolute inset-x-space-0 top-space-0 origin-left border-t border-hairline"
          />

          <div className="flex flex-wrap items-center justify-between gap-space-6">
            <p
              data-motion
              data-footer-copy
              className="text-heading-4"
            >
              Tem um projeto em mente? Vamos traçar o caminho.
            </p>

            <a
              data-motion
              data-cta
              href="#contato"
              className="relative rounded-md bg-accent px-space-8 py-space-5 text-action text-on-accent transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-accent-hover"
            >
              Vamos trabalhar juntos

              <span
                data-motion
                data-cta-dot
                aria-hidden="true"
                className="absolute right-space-0 top-space-0 size-space-2-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-highlight"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}