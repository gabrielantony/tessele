"use client";

import { useRef, useState } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import CTAButton from "@/components/ui/CTAButton";

gsap.registerPlugin(ScrollTrigger, useGSAP, CustomEase);

// Same curves as --ease-enter / --ease-exit in globals.css (Material 3
// emphasized decelerate/accelerate — the UX-in-Motion enter/exit pairing).
// GSAP can't read CSS custom properties for its `ease` option, so the
// values are duplicated here; keep both in sync if the tokens change.
CustomEase.create("price-enter", "0.05, 0.7, 0.1, 1");
CustomEase.create("price-exit", "0.3, 0, 0.8, 0.15");

/* ======================================================
   TYPES
====================================================== */

type BillingPeriod = "trimestral" | "semestral";

type Plan = {
  name: string;
  description: string;
  quarterlyPrice: string;
  semesterPrice: string;
  features: string[];
  featured?: boolean;
};

/* ======================================================
   DATA
====================================================== */

const plans: Plan[] = [
  {
    name: "Presença",
    description:
      "Para empresas que precisam manter uma presença ativa nas redes e organizar a comunicação.",
    quarterlyPrice: "R$ 1.290/mês",
    semesterPrice: "R$ 1.150/mês",
    features: [
      "Gestão mensal das redes sociais",
      "8 conteúdos por mês",
      "Acompanhamento dos resultados",
      "1 reunião por mês",
    ],
  },
  {
    name: "Aquisição",
    description:
      "Para empresas que precisam ir além das redes sociais e usar o marketing para atrair novas oportunidades.",
    quarterlyPrice: "R$ 2.590/mês",
    semesterPrice: "R$ 2.300/mês",
    featured: true,
    features: [
      "12 conteúdos por mês",
      "Gestão de tráfego pago com 2 campanhas ativas até R$ 3 mil",
      "Site institucional",
      "4 conteúdos para blog por mês",
      "Design de materiais comerciais",
      "2 reuniões por mês",
    ],
  },
  {
    name: "Estrutura",
    description:
      "Para empresas que precisam de uma operação mais completa, conectando comunicação e presença digital.",
    quarterlyPrice: "R$ 4.990/mês",
    semesterPrice: "R$ 4.700/mês",
    features: [
      "16 conteúdos por mês",
      "Gestão de tráfego pago com 4 campanhas ativas até R$ 10 mil",
      "Site institucional premium",
      "6 conteúdos para blog por mês",
      "Automações para marketing e atendimento",
      "Design para demandas comerciais recorrentes",
      "Até 3 reuniões por mês",
    ],
  },
];

const demandServices = [
  "Captação de conteúdo",
  "Edição de vídeos",
  "Identidade visual",
  "Diagramação impressa",
  "Landing pages",
  "Posts para redes sociais",
];

/* ======================================================
   MOTION
====================================================== */

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = 1 / PHI;
const PHI_SQUARED = PHI * PHI;

const DURATION_PRIMARY = PHI_INVERSE;
const DURATION_SECONDARY = PHI_INVERSE * PHI_INVERSE;
const STAGGER = DURATION_SECONDARY * PHI_INVERSE;
const OVERLAP = STAGGER;

// The price swap, stepped down the same golden-ratio ladder. The old value
// leaves in PRICE_EXIT, and the new one starts arriving at PRICE_OVERLAP --
// well before that exit finishes, so the first character shows up in ~90ms
// instead of waiting out a full exit first.
const PRICE_EXIT = STAGGER * PHI_INVERSE; // ~146ms
const PRICE_ENTER = STAGGER; // ~236ms
const PRICE_OVERLAP = PRICE_EXIT * PHI_INVERSE; // ~90ms
const PRICE_CHAR_STAGGER = PRICE_EXIT * PHI_INVERSE * PHI_INVERSE * PHI_INVERSE; // ~34ms

function fibonacciEaseOut(progress: number) {
  return 1 - Math.pow(1 - progress, PHI_SQUARED);
}

/* ======================================================
   ICONS
====================================================== */

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="size-space-4 shrink-0"
    >
      <path
        d="M2.5 8L6.2 11.5L13.5 4.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="size-space-4"
    >
      <path
        d="M8 1.5L10 3.2L12.6 3.1L12.9 5.7L14.5 7.7L12.9 9.7L12.6 12.3L10 12.2L8 13.9L6 12.2L3.4 12.3L3.1 9.7L1.5 7.7L3.1 5.7L3.4 3.1L6 3.2L8 1.5Z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />

      <path
        d="M5.7 7.7L7.2 9.2L10.4 6"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ======================================================
   BILLING TOGGLE
====================================================== */

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}) {
  const isSemester = billing === "semestral";

  return (
    <div
      data-motion-toggle
      data-motion
      className="flex items-center justify-center gap-space-4"
      role="group"
      aria-label="Período de contratação"
    >
      <button
        type="button"
        aria-pressed={!isSemester}
        onClick={() => onChange("trimestral")}
        className={[
          "cursor-pointer transition-colors",
          "duration-(--duration-fast) ease-(--ease-out)",
          !isSemester
            ? "text-body-bold text-on-accent"
            : "text-body text-on-accent-muted hover:text-on-accent",
        ].join(" ")}
      >
        Trimestral
      </button>

      <button
        type="button"
        aria-label="Alternar período de contratação"
        aria-pressed={isSemester}
        onClick={() =>
          onChange(isSemester ? "trimestral" : "semestral")
        }
        className={[
          "relative grid shrink-0 cursor-pointer grid-cols-2",
          "rounded-full p-space-1",
          "transition-all duration-(--duration-base) ease-(--ease-out)",
          "active:shadow-control",
          isSemester ? "bg-highlight" : "bg-muted",
        ].join(" ")}
      >
        <span className="size-space-5" aria-hidden="true" />
        <span className="size-space-5" aria-hidden="true" />

        <span
          aria-hidden="true"
          className={[
            "absolute left-space-1 top-space-1",
            "size-space-5 rounded-full bg-surface",
            "shadow-control",
            "transition-transform duration-(--duration-base) ease-(--ease-out)",
            isSemester ? "translate-x-full" : "",
          ].join(" ")}
        />
      </button>

      <button
        type="button"
        aria-pressed={isSemester}
        onClick={() => onChange("semestral")}
        className={[
          "cursor-pointer transition-colors",
          "duration-(--duration-fast) ease-(--ease-out)",
          isSemester
            ? "text-body-bold text-on-accent"
            : "text-body text-on-accent-muted hover:text-on-accent",
        ].join(" ")}
      >
        Semestral
      </button>
    </div>
  );
}

/* ======================================================
   FEATURE
====================================================== */

function FeatureItem({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-space-2 text-ink">
      <span className="mt-space-1 shrink-0 text-highlight">
        <CheckIcon />
      </span>

      <span className="text-body">{children}</span>
    </li>
  );
}

/* ======================================================
   PRICE
   Swaps the value on a billing change with the old and the
   new price on screen at once: the outgoing copy sits in an
   absolutely-positioned layer so it can leave (--ease-exit)
   while the incoming characters are already cascading in
   (--ease-enter), one after another. Overlapping the two is
   what keeps the whole swap around 500ms.

   Single-pass by design. An earlier version animated the exit,
   waited for React to swap the text, then animated the enter --
   which meant a run interrupted between those two halves left
   the price stuck at opacity 0 with nothing to restore it. Here
   the visible state is the default: if no animation runs at all,
   the current price is simply rendered.
====================================================== */

function splitPriceCharacters(value: string) {
  // Grouping runs of non-digits ("R$ ", ".", "/mês") keeps the cascade on the
  // part that actually changes, instead of spelling out every letter.
  const groups: string[] = [];

  for (const char of value) {
    const isDigit = char >= "0" && char <= "9";
    const last = groups[groups.length - 1];
    const lastIsDigit = last !== undefined && last[0] >= "0" && last[0] <= "9";

    if (!isDigit && last !== undefined && !lastIsDigit) {
      groups[groups.length - 1] = last + char;
    } else {
      groups.push(char);
    }
  }

  return groups;
}

function PriceValue({
  price,
  className,
}: {
  price: string;
  className: string;
}) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  // Deriving during render (React's supported "adjust state when props change")
  // rather than in an effect: it means both copies are already committed to the
  // DOM by the time the animation below looks for them.
  const [shown, setShown] = useState({
    current: price,
    previous: null as string | null,
  });

  if (shown.current !== price) {
    setShown({ current: price, previous: shown.current });
  }

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      const outgoing = container.querySelector("[data-price-out]");
      // No outgoing copy means this is the first paint, not a swap — the
      // incoming price is already visible and must stay that way.
      if (!outgoing) return;

      const clearPrevious = () =>
        setShown((state) => ({ ...state, previous: null }));

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        clearPrevious();
        return;
      }

      const incoming = container.querySelectorAll("[data-price-in] > span");

      gsap
        .timeline({ onComplete: clearPrevious })
        .to(
          outgoing,
          {
            opacity: 0,
            yPercent: -45,
            filter: "blur(5px)",
            duration: PRICE_EXIT,
            ease: "price-exit",
          },
          0,
        )
        .fromTo(
          incoming,
          { opacity: 0, yPercent: 55, filter: "blur(6px)" },
          {
            opacity: 1,
            yPercent: 0,
            filter: "blur(0px)",
            duration: PRICE_ENTER,
            ease: "price-enter",
            stagger: PRICE_CHAR_STAGGER,
          },
          PRICE_OVERLAP,
        );
    },
    { dependencies: [shown.current], scope: containerRef },
  );

  return (
    <p ref={containerRef} className={`relative ${className}`}>
      {shown.previous !== null && (
        <span
          data-price-out
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
        >
          {shown.previous}
        </span>
      )}

      <span data-price-in className="whitespace-nowrap">
        {splitPriceCharacters(shown.current).map((group, i) => (
          // whitespace-pre, because a group can end in a space ("R$ ") and an
          // inline-block collapses trailing whitespace at its own edge -- which
          // silently ran the currency symbol into the first digit.
          <span key={i} className="inline-block whitespace-pre">
            {group}
          </span>
        ))}
      </span>
    </p>
  );
}

/* ======================================================
   CARD
====================================================== */

function PlanCard({
  plan,
  billing,
}: {
  plan: Plan;
  billing: BillingPeriod;
}) {
  const price =
    billing === "semestral"
      ? plan.semesterPrice
      : plan.quarterlyPrice;

  return (
    // Two layers on purpose. The scroll reveal writes an inline transform on
    // the wrapper, and an inline style always beats a class -- so a hover:
    // utility on that same element would silently never apply. Giving the hover
    // its own element keeps the two transforms from fighting over one node.
    <div data-plan-card className="flex min-w-0">
      <article
        className={[
          "group relative flex min-w-0 flex-1 flex-col",
          // border-2 on every card, not just the featured one: the width is
          // what reserves the space, so varying it per card would make the
          // three of them differ by a pixel on each edge.
          "rounded-xl border-2 bg-surface shadow-plan",
          "p-space-6 pt-space-8 will-change-[translate,scale]",
          // translate and scale, not transform: Tailwind v4 writes the hover
          // lift to the individual `translate:` / `scale:` properties, so a
          // transition naming `transform` covers none of it and the card jumps.
          "transition-[translate,scale,box-shadow,border-color]",
          "duration-(--duration-lift) ease-(--ease-lift)",
          "hover:-translate-y-2 hover:scale-[1.02] hover:shadow-plan-lifted",
          // The green edge belongs to the featured plan alone -- it is what
          // marks that card out, so lending it to the other two on hover would
          // undo the distinction at exactly the moment they are compared.
          plan.featured
            ? "plan-beam border-highlight-deep"
            : "border-border-strong",
        ].join(" ")}
      >
        {plan.featured && (
          <div
            className={[
              "absolute left-1/2 top-space-0",
              "-translate-x-1/2 -translate-y-1/2",
              "flex items-center gap-space-1",
              "whitespace-nowrap rounded-base",
              "bg-highlight px-space-3 py-space-1",
              "text-label uppercase text-accent",
              "shadow-control",
            ].join(" ")}
          >
            <AwardIcon />
            <span>Mais escolhido</span>
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between gap-space-10">
          <div className="flex flex-col gap-space-6">
            <div className="flex flex-col gap-space-3">
              <div className="flex flex-col gap-space-2">
                <p className="text-body text-muted">{plan.name}</p>

                <PriceValue
                  price={price}
                  className="text-heading-3 tabular-nums lining-nums text-accent"
                />
              </div>

              {/* The reserved height is only worth anything from lg up, where
                  the three cards sit side by side and their dividers should
                  line up. Stacked, each card is alone on its row, so it just
                  leaves a hole under a short description. */}
              <p className="text-body text-muted lg:min-h-space-20">
                {plan.description}
              </p>
            </div>

            <div className="border-t border-hairline" />

            <ul className="flex flex-col gap-space-4">
              {plan.features.map((feature) => (
                <FeatureItem key={feature}>{feature}</FeatureItem>
              ))}
            </ul>
          </div>

          <CTAButton
            label="Quero este plano"
            variant={plan.featured ? "highlight" : undefined}
            fullWidth
          />
        </div>
      </article>
    </div>
  );
}

/* ======================================================
   PRICING GRID
====================================================== */

function PricingGrid({
  billing,
}: {
  billing: BillingPeriod;
}) {
  return (
    <div
      className={[
        "grid w-full grid-cols-1 gap-space-6",
        // The top padding is clearance for the featured card's badge, which
        // hangs above the row. Only the lg row leads with that card -- stacked,
        // a plain card comes first and the padding is just a gap.
        "lg:pt-space-4",
        // Uma coluna até lg, três a partir dali. Duas colunas deixariam o
        // terceiro plano sozinho numa linha pela metade — pior que a pilha.
        "lg:grid-cols-3",
      ].join(" ")}
    >
      {plans.map((plan) => (
        <PlanCard
          key={plan.name}
          plan={plan}
          billing={billing}
        />
      ))}
    </div>
  );
}

/* ======================================================
   DEMAND
====================================================== */

function DemandChip({ children }: { children: string }) {
  return (
    <span
      className={[
        "rounded-md bg-on-accent-border",
        "px-space-4 py-space-2",
        "text-small text-on-accent",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function DemandSection() {
  return (
    <div
      data-motion-demand
      data-motion
      className={[
        "grid w-full grid-cols-1 gap-space-8",
        "rounded-xl bg-dark-canvas p-space-8",
        "shadow-card",
        "lg:grid-cols-2 lg:gap-space-10 lg:p-space-12",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-col gap-space-3">
        <p className="text-label uppercase text-muted">
          Por demanda a partir de
        </p>

        <p className="text-metric tabular-nums lining-nums text-on-accent">
          R$ 150
        </p>

        <p className="max-w-copy text-body text-on-accent">
          Não quer assinar um plano mensal agora? Contrate de
          forma convencional, por produto: você escolhe o que
          precisa, paga por aquilo e recebe pronto, sem
          mensalidade.
        </p>
      </div>

      <div
        className={[
          "flex min-w-0 flex-col justify-between gap-space-8",
          "lg:items-end",
        ].join(" ")}
      >
        <div
          className={[
            "flex w-full flex-wrap gap-space-2",
            "lg:justify-end",
          ].join(" ")}
        >
          {demandServices.map((service) => (
            <DemandChip key={service}>{service}</DemandChip>
          ))}
        </div>

        <div className="w-full lg:w-auto">
          <CTAButton label="Solicitar orçamento" variant="highlight" />
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   SECTION
====================================================== */

export default function PlanosEPrecos() {
  const root = useRef<HTMLElement>(null);

  const [billing, setBilling] =
    useState<BillingPeriod>("semestral");

  /* ------------------------------------------------------
     Main narrative reveal
  ------------------------------------------------------ */

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set("[data-motion]", {
          clearProps: "all",
        });

        return;
      }

      const timeline = gsap.timeline({
        paused: true,
        defaults: {
          ease: fibonacciEaseOut,
        },
      });

      timeline
        .from("[data-motion-heading]", {
          opacity: 0,
          yPercent: 16,
          duration: DURATION_PRIMARY,
        })
        .from(
          "[data-motion-description]",
          {
            opacity: 0,
            yPercent: 12,
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-motion-toggle]",
          {
            opacity: 0,
            yPercent: 16,
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-plan-card]",
          {
            opacity: 0,
            yPercent: 12,
            duration: DURATION_PRIMARY,
            stagger: STAGGER,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-motion-demand]",
          {
            opacity: 0,
            yPercent: 12,
            duration: DURATION_PRIMARY,
          },
          `-=${OVERLAP}`,
        );

      ScrollTrigger.create({
        trigger: root.current,
        start: "top 75%",
        animation: timeline,
        toggleActions: "play none none reverse",
      });
    },
    {
      scope: root,
    },
  );

  return (
    <section
      ref={root}
      data-name="planos-e-precos"
      className={[
        "overflow-hidden rounded-xl bg-accent",
        "px-page py-section",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex w-full max-w-wide",
          "flex-col items-center gap-space-10",
        ].join(" ")}
      >
        <header
          className={[
            "flex w-full max-w-copy flex-col",
            "items-center gap-space-3 text-center",
          ].join(" ")}
        >
          <h2
            data-motion-heading
            data-motion
            className="text-heading-2 text-on-accent"
          >
            Onde sua empresa está hoje é o ponto de{" "}
            <span className="text-highlight">partida</span>.
          </h2>

          <p
            data-motion-description
            data-motion
            className="text-body text-on-accent"
          >
            A Tessele pode começar organizando sua presença
            digital ou assumir uma operação mais ampla, com
            conteúdo, aquisição, site e automação.
          </p>
        </header>

        {/* Toggle and grid are one unit: the toggle labels what the prices
            below it say, so they sit closer together than the section's own
            rhythm below lg, where the full gap left them reading as separate. */}
        <div
          className={[
            "flex w-full flex-col items-center",
            "gap-space-8 lg:gap-space-10",
          ].join(" ")}
        >
          <BillingToggle
            billing={billing}
            onChange={setBilling}
          />

          <PricingGrid billing={billing} />
        </div>

        <DemandSection />
      </div>
    </section>
  );
}
