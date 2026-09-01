"use client";

import { useRef, useState } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import CTAButton from "@/components/ui/CTAButton";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
    <article
      data-plan-card
      className={[
        "relative flex min-w-0 flex-col self-stretch",
        "rounded-xl border bg-surface",
        "p-space-6 pt-space-8",
        "transition-all duration-(--duration-base) ease-(--ease-out)",
        "hover:shadow-floating",
        plan.featured
          ? "border-highlight shadow-card"
          : "border-border-strong hover:border-highlight",
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

              <p
                key={`${plan.name}-${billing}`}
                data-current-price
                className="text-heading-3 tabular-nums text-accent"
              >
                {price}
              </p>
            </div>

            <p className="min-h-space-20 text-body text-muted">
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
        />
      </div>
    </article>
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
        "grid w-full grid-cols-1",
        "gap-space-6 pt-space-4",
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

        <p className="text-metric tabular-nums text-on-accent">
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
  const billingReady = useRef(false);

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

  /* ------------------------------------------------------
     Billing continuity
  ------------------------------------------------------ */

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set("[data-current-price]", {
          clearProps: "all",
        });

        return;
      }

      if (!billingReady.current) {
        billingReady.current = true;
        return;
      }

      gsap.fromTo(
        "[data-current-price]",
        {
          opacity: 0,
          yPercent: 18,
        },
        {
          opacity: 1,
          yPercent: 0,
          duration: DURATION_SECONDARY,
          ease: fibonacciEaseOut,
          stagger: STAGGER,
        },
      );
    },
    {
      scope: root,
      dependencies: [billing],
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

        <BillingToggle
          billing={billing}
          onChange={setBilling}
        />

        <PricingGrid billing={billing} />

        <DemandSection />
      </div>
    </section>
  );
}
