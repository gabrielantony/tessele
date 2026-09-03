"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import Link from "next/link";

import Wordmark from "@/components/ui/Wordmark";
import { whatsappHref } from "@/lib/whatsapp";

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

/*
 * The most generic entry point on the page: whoever gets here scrolled past
 * everything and just wants to talk, so the message says only that.
 */
const FOOTER_WHATSAPP_MESSAGE =
  "Oi! Cheguei pelo site de vocês. Podemos conversar?";

// `external` is per link rather than blanket: a mailto: hands off to the mail
// client and leaves the page where it is, so a new tab there is a blank tab.
const contactLinks = [
  {
    label: "WhatsApp",
    href: whatsappHref(FOOTER_WHATSAPP_MESSAGE),
    external: true,
  },
  {
    label: "E-mail",
    href: "mailto:contatotessele@gmail.com",
    external: false,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/tessele.co",
    external: true,
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
        // The shared section-heading entrance: one `space-6` of rise and nothing
        // else. The blur that used to ride along came off so this heading
        // arrives the way the other eight do. See ProblemSection.
        .from(selector("[data-footer-heading]"), {
          opacity: 0,
          y: "var(--spacing-space-6)",
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
          selector("[data-footer-legal]"),
          {
            autoAlpha: 0,
            y: "var(--spacing-space-2)",
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        )
        // Last beat, and a masked reveal rather than a fade. The card already
        // clips (`overflow-hidden`) and the mark is pinned to its bottom edge,
        // so one height of downward offset parks it entirely behind that edge
        // and it rises into place through the mask -- the mark reads as having
        // been there all along, uncovered, instead of materialising out of
        // nothing. Rising is the only direction its own anchor allows: coming
        // down from above would mean crossing the copy it sits under.
        //
        // `DURATION_PRIMARY`, not `_SECONDARY`: the travel here is the mark's
        // full height, an order of magnitude past the `space-2`/`space-3`
        // nudges above, and the same duration over that distance reads as a
        // flick.
        .from(
          selector("[data-footer-wordmark]"),
          {
            yPercent: 100,
            duration: DURATION_PRIMARY,
          },
          `-=${OVERLAP}`,
        );
    },
    { scope: root },
  );

  return (
    <footer
      ref={root}
      className="bg-canvas p-space-1 md:p-space-5"
      aria-label="Rodapé"
    >
      <div className="relative w-full overflow-hidden rounded-xl bg-accent px-page py-section">
        <div
          data-footer-reveal
          data-footer-wordmark
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-space-0 bottom-space-0 z-0 aspect-[685/123] w-full"
        >
          <Wordmark />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-space-0 z-10 bg-[linear-gradient(180deg,transparent_43%,color-mix(in_srgb,var(--color-dark-canvas)_80%,transparent)_100%)]"
        />

        <div className="relative z-20 mx-auto w-full max-w-content">
          <h2
            data-footer-reveal
            data-footer-heading
            className="text-heading-3 text-center text-on-accent md:text-heading-2"
          >
            Marketing, design e desenvolvimento para empresas que precisam
            decidir e construir o próximo passo.
          </h2>
        </div>

        <div className="relative z-20 mt-space-16 grid w-full grid-cols-2 gap-space-8 md:gap-space-12 lg:grid-cols-3">
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
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className={linkClassName}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div
            data-footer-reveal
            data-footer-column
            className="flex min-w-0 flex-col gap-space-6 col-span-2 lg:col-span-1"
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

        <div
          data-footer-reveal
          data-footer-legal
          className="relative z-20 mt-space-16 flex flex-col items-center justify-center gap-space-3 text-center text-body text-on-accent md:mt-space-20 md:flex-row md:gap-space-8"
        >
          <p>© 2026 Tessele Estúdio</p>

          {/* next/link, not a plain <a>: Link is what applies the export's
              routing config -- trailingSlash today, a basePath if the site ever
              moves off the root of tessele.com.br. */}
          <Link
            href="/privacidade"
            className="transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-highlight focus-visible:text-highlight"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
