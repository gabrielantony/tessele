"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = 1 / PHI;
const PHI_SQUARED = PHI * PHI;

const DURATION_PRIMARY = PHI_INVERSE;
const DURATION_SECONDARY = PHI_INVERSE * PHI_INVERSE;
const STAGGER = DURATION_SECONDARY * PHI_INVERSE;
const OVERLAP = STAGGER;

function fibonacciEaseOut(progress: number) {
  return 1 - Math.pow(1 - progress, PHI_SQUARED);
}

const navigationLinks = [
  {
    label: "Como trabalhamos",
    href: "#como-trabalhamos",
  },
  {
    label: "Serviços",
    href: "#servicos",
  },
  {
    label: "Planos",
    href: "#planos",
  },
  {
    label: "FAQ",
    href: "#faq",
  },
];

const contactLinks = [
  {
    label: "WhatsApp",
    href: "#contato",
  },
  {
    label: "E-mail",
    href: "#contato",
  },
  {
    label: "Instagram",
    href: "#contato",
  },
];

const linkClassName =
  "inline-block text-body text-on-accent transition-all duration-(--duration-fast) ease-(--ease-out) hover:translate-x-space-1 hover:text-highlight focus-visible:text-highlight";

export default function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;

      if (!section) {
        return;
      }

      const selector = gsap.utils.selector(section);

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(selector("[data-footer-reveal]"), {
          clearProps: "all",
        });

        return;
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: fibonacciEaseOut,
        },
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      timeline
        .from(selector("[data-footer-heading]"), {
          autoAlpha: 0,
          y: "var(--spacing-space-4)",
          filter: "blur(var(--spacing-space-2))",
          duration: DURATION_PRIMARY,
        })
        .from(
          selector("[data-footer-column]"),
          {
            autoAlpha: 0,
            y: "var(--spacing-space-3)",
            duration: DURATION_SECONDARY,
            stagger: STAGGER,
          },
          `-=${OVERLAP}`,
        )
        .from(
          selector("[data-footer-wordmark]"),
          {
            autoAlpha: 0,
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        )
        .from(
          selector("[data-footer-legal]"),
          {
            autoAlpha: 0,
            y: "var(--spacing-space-2)",
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        );
    },
    { scope: root },
  );

  return (
    <footer
      ref={root}
      className="bg-canvas p-space-5"
      aria-label="Rodapé"
    >
      <div className="relative w-full overflow-hidden rounded-xl bg-accent px-page py-section">
        <div className="mx-auto w-full max-w-content">
          <h2
            data-footer-reveal
            data-footer-heading
            className="text-heading-2 text-center text-on-accent"
          >
            Marketing, design e desenvolvimento para empresas que precisam
            decidir e construir o próximo passo.
          </h2>
        </div>

        <div className="mt-space-16 grid w-full grid-cols-1 gap-space-12 md:grid-cols-2 lg:grid-cols-3">
          <nav
            data-footer-reveal
            data-footer-column
            aria-label="Navegação do rodapé"
            className="flex min-w-0 flex-col gap-space-6"
          >
            <p className="text-label uppercase text-on-accent-muted">
              Navegação
            </p>

            <ul className="flex list-none flex-col gap-space-5">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClassName}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div
            data-footer-reveal
            data-footer-column
            className="flex min-w-0 flex-col gap-space-6"
          >
            <p className="text-label uppercase text-on-accent-muted">
              Contato
            </p>

            <ul className="flex list-none flex-col gap-space-5">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={linkClassName}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div
            data-footer-reveal
            data-footer-column
            className="flex min-w-0 flex-col gap-space-6 md:col-span-2 lg:col-span-1"
          >
            <p className="text-label uppercase text-on-accent-muted">
              Estúdio
            </p>

            <div className="flex max-w-copy flex-col gap-space-5 text-body text-on-accent">
              <p>Curitiba, Paraná</p>

              <p>
                Atendimento para empresas de
                <br />
                todo o Brasil
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-space-20 flex min-h-space-0 items-center justify-center md:min-h-space-40">
          <div
            data-footer-reveal
            data-footer-wordmark
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-space-0 bottom-space-0 hidden h-space-40 md:block"
          >
            <svg
              className="h-space-40 w-full overflow-visible"
              viewBox="0 0 100 64"
              preserveAspectRatio="none"
              role="presentation"
            >
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                textLength="88%"
                lengthAdjust="spacingAndGlyphs"
                className="fill-accent-hover text-display"
              >
                TESSELE
              </text>
            </svg>
          </div>

          <div
            data-footer-reveal
            data-footer-legal
            className="relative flex flex-col items-center justify-center gap-space-3 text-center text-body text-on-accent md:flex-row md:gap-space-8"
          >
            <p>© 2026 Tessele Estúdio</p>

            <a
              href="#privacidade"
              className="transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-highlight focus-visible:text-highlight"
            >
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}