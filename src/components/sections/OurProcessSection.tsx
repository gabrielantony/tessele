"use client";

import { useRef, type FocusEvent, type PointerEvent } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { whatsappHref } from "@/lib/whatsapp";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Picks up the section's own closing line -- "Vamos traçar o caminho" -- from
// the visitor's side: they have just read how the studio works and want it
// applied to their case.
const WHATSAPP_MESSAGE =
  "Oi! Vi como vocês trabalham e queria entender como seria pra minha empresa.";

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

  const { contextSafe } = useGSAP(
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
          // The shared section-heading entrance: one `space-6` of rise, fixed
          // rather than a share of the heading's own height. See ProblemSection.
          y: "var(--spacing-space-6)",
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

  // Read on every event rather than once: either preference can change
  // mid-session, and a hybrid device can switch pointer type.
  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const seconds = (value: number) => (prefersReducedMotion() ? 0 : value);

  const raiseFooterCta = (button: HTMLAnchorElement, ease: string) => {
    gsap.to(button, {
      y: -3,
      scale: 1.012,
      duration: seconds(0.377),
      ease,
    });
  };

  const settleFooterCta = (button: HTMLAnchorElement) => {
    gsap.to(button, {
      y: 0,
      scale: 1,
      duration: seconds(0.61),
      ease: "power3.out",
    });
  };

  const handleFooterCtaPointerEnter = contextSafe(
    (event: PointerEvent<HTMLAnchorElement>) => {
      if (!canHover()) return;
      raiseFooterCta(event.currentTarget, "power3.out");
    },
  );

  const handleFooterCtaPointerLeave = contextSafe(
    (event: PointerEvent<HTMLAnchorElement>) => {
      if (!canHover()) return;
      settleFooterCta(event.currentTarget);
    },
  );

  const handleFooterCtaPointerDown = contextSafe(
    (event: PointerEvent<HTMLAnchorElement>) => {
      gsap.to(event.currentTarget, {
        y: 0,
        scale: 0.985,
        duration: seconds(0.144),
        ease: "power2.out",
      });
    },
  );

  const handleFooterCtaPointerUp = contextSafe(
    (event: PointerEvent<HTMLAnchorElement>) => {
      const button = event.currentTarget;
      // Releasing returns to the raised state only where a cursor can stay on
      // the button. On touch there is no hover to return to, so it goes back
      // to rest.
      if (!canHover()) {
        settleFooterCta(button);
        return;
      }
      raiseFooterCta(button, "back.out(1.4)");
    },
  );

  const handleFooterCtaPointerCancel = contextSafe(
    (event: PointerEvent<HTMLAnchorElement>) => settleFooterCta(event.currentTarget),
  );

  // Chromium focuses anchors on mousedown while Safari does not. Raise only
  // keyboard focus, otherwise Chromium would overwrite the press tween.
  const handleFooterCtaFocus = contextSafe(
    (event: FocusEvent<HTMLAnchorElement>) => {
      const button = event.currentTarget;
      if (!button.matches(":focus-visible")) return;
      raiseFooterCta(button, "power3.out");
    },
  );

  const handleFooterCtaBlur = contextSafe(
    (event: FocusEvent<HTMLAnchorElement>) => settleFooterCta(event.currentTarget),
  );

  return (
    <section
      ref={root}
      id="como-trabalhamos"
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
            className="mt-space-3 h-space-1 w-[7.5rem] origin-left rounded-full bg-highlight"
          />
        </header>

        <ol className="mt-space-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,calc(var(--spacing-space-40)*2)),1fr))] gap-space-10">
          {STEPS.map((step) => (
            <li
              key={step.number}
              data-motion
              data-step
            >
              <div className="flex items-center gap-space-2">
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

              <p className="mt-space-6 text-display font-display">
                {step.number}
              </p>

              <h3 className="mt-space-4 text-heading-4">
                {step.title}
              </h3>

              <p className="mt-space-2 text-body text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="relative mt-space-12 pt-space-6">
          <div
            data-motion
            data-footer-line
            aria-hidden="true"
            className="absolute inset-x-space-0 top-space-0 origin-left border-t border-hairline"
          />

          <div className="flex flex-wrap items-center justify-between gap-space-8">
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
              href={whatsappHref(WHATSAPP_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              onPointerEnter={handleFooterCtaPointerEnter}
              onPointerLeave={handleFooterCtaPointerLeave}
              onPointerDown={handleFooterCtaPointerDown}
              onPointerUp={handleFooterCtaPointerUp}
              onPointerCancel={handleFooterCtaPointerCancel}
              onFocus={handleFooterCtaFocus}
              onBlur={handleFooterCtaBlur}
              className="relative rounded-md bg-accent px-space-8 py-space-4 text-action text-on-accent outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] will-change-transform hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
            >
              Vamos trabalhar juntos

              <span
                data-motion
                data-cta-dot
                aria-hidden="true"
                className="absolute -right-space-1-5 -top-space-1-5 size-[1.125rem]"
              >
                <span className="absolute inset-0 animate-ping rounded-base bg-highlight opacity-75" />
                <span className="relative block size-full rounded-base border-[0.1875rem] border-canvas bg-highlight" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}