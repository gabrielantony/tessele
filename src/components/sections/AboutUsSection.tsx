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

type Stat = {
  value: string;
  label: string;
};

type Person = {
  name: string;
  role: string;
  image: string;
  title: string;
  description: string;
  stats: Stat[];
};

const PEOPLE: Person[] = [
  {
    name: "Gabriel Antony",
    role: "UX/UI Design e Desenvolvimento",
    image: "images/Gabriel-img.jpg",
    title: "Design e desenvolvimento precisam conversar desde o começo.",
    description:
      "Desde 2019, Gabriel trabalha com produtos digitais para empresas no Brasil, Canadá e Estados Unidos. Ao longo de mais de 50 projetos, sua atuação passou por UX/UI, pesquisa, arquitetura de informação, design systems, SaaS e desenvolvimento, acompanhando desde a estrutura da experiência até a implementação.\nEssa combinação entre design e tecnologia permite uma visão mais completa do produto, considerando uso, viabilidade, consistência e evolução ao longo do tempo.",
    stats: [
      {
        value: "7+",
        label: "anos de experiência",
      },
      {
        value: "50+",
        label: "projetos realizados",
      },
      {
        value: "4+",
        label: "Projetos internacionais",
      },
    ],
  },
  {
    name: "Thaís Cuman",
    role: "Estratégia, Marketing e Conteúdo",
    image: "images/thais-img.jpg",
    title:
      "O conteúdo foi o ponto de partida. A estratégia passou a ocupar cada vez mais espaço.",
    description:
      "Desde 2018, Thaís atua em projetos de educação, varejo e serviços, no Brasil e fora dele. Nesse percurso, trabalhou com conteúdo, campanhas, mídia, lançamentos e posicionamento, mas principalmente acompanhou de perto as decisões que acontecem antes da execução: o que uma marca precisa comunicar, como uma oferta deve ser apresentada e onde o marketing realmente pode contribuir para o negócio.",
    stats: [
      {
        value: "8+",
        label: "anos de experiência",
      },
      {
        value: "15+",
        label: "marcas e projetos",
      },
      {
        value: "4+",
        label: "Projetos internacionais",
      },
    ],
  },
];

function Stats({ stats }: { stats: Stat[] }) {
  return (
    // Três stats devem usar uma ou três colunas para não isolar uma métrica.
    <div
      data-stats
      className="grid grid-cols-1 gap-space-4 sm:grid-cols-3"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-space-2">
          <strong className="text-metric text-ink">{stat.value}</strong>

          <span className="text-small text-muted md:text-body">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function MemberIdentity({
  person,
  compact = false,
}: {
  person: Person;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-space-5">
        <div
          data-avatar
          className="size-space-20 shrink-0 overflow-hidden rounded-md"
        >
          <img
            src={person.image}
            alt=""
            className="size-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <h3 className="text-heading-4 text-ink">{person.name}</h3>

          <p className="mt-space-1 text-body text-muted">{person.role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-5">
      <div
        data-photo
        className="aspect-square w-full overflow-hidden rounded-xl"
      >
        <img
          src={person.image}
          alt=""
          className="size-full object-cover"
        />
      </div>

      <div>
        <h3 className="text-heading-4 text-ink">{person.name}</h3>

        <p className="mt-space-1 text-body text-muted">{person.role}</p>
      </div>
    </div>
  );
}

function InfoCard({
  person,
  compact = false,
}: {
  person: Person;
  compact?: boolean;
}) {
  return (
    <article
      data-info-card
      className="flex min-w-0 flex-col gap-space-8 rounded-xl border border-border bg-surface p-space-6 shadow-lifted md:p-space-8 lg:gap-space-10 lg:p-space-12"
    >
      {compact && <MemberIdentity person={person} compact />}

      <div className="flex flex-col gap-space-3">
        <h3 className="text-heading-3 text-ink">{person.title}</h3>

        <p className="whitespace-pre-line text-body text-ink">
          {person.description}
        </p>
      </div>

      <Stats stats={person.stats} />
    </article>
  );
}

function PersonRow({
  person,
  reverse,
}: {
  person: Person;
  reverse?: boolean;
}) {
  return (
    <div data-person-row>
      {/* Mobile + tablet */}
      <div className="lg:hidden">
        <InfoCard person={person} compact />
      </div>

      {/* Desktop */}
      <div className="hidden items-start gap-space-8 lg:grid lg:grid-cols-4">
        {reverse ? (
          <>
            <div className="col-span-3" data-row-content>
              <InfoCard person={person} />
            </div>

            <div className="col-span-1" data-row-profile>
              <MemberIdentity person={person} />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-1" data-row-profile>
              <MemberIdentity person={person} />
            </div>

            <div className="col-span-3" data-row-content>
              <InfoCard person={person} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AboutUs() {
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

      const animatedElements = section.querySelectorAll(
        "[data-heading], [data-person-row], [data-stats], [data-avatar], [data-photo]",
      );

      if (prefersReducedMotion) {
        gsap.set(animatedElements, {
          clearProps: "all",
        });

        return;
      }

      const rows = gsap.utils.toArray<HTMLElement>("[data-person-row]");

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

      timeline.from("[data-heading]", {
        opacity: 0,
        y: "var(--spacing-space-6)",
        filter: "blur(var(--spacing-space-1))",
        duration: DURATION_PRIMARY,
        clearProps: "filter",
      });

      rows.forEach((row) => {
        const card =
          row.querySelector<HTMLElement>("[data-info-card]");

        const profile =
          row.querySelector<HTMLElement>("[data-row-profile]");

        const photo =
          row.querySelector<HTMLElement>("[data-photo]");

        const avatar =
          row.querySelector<HTMLElement>("[data-avatar]");

        const stats =
          row.querySelector<HTMLElement>("[data-stats]");

        timeline.from(
          row,
          {
            opacity: 0,
            y: "var(--spacing-space-6)",
            duration: DURATION_PRIMARY,
          },
          `-=${OVERLAP}`,
        );

        if (card) {
          timeline.from(
            card,
            {
              opacity: 0,
              y: "var(--spacing-space-4)",
              duration: DURATION_SECONDARY,
            },
            "<",
          );
        }

        if (profile) {
          timeline.from(
            profile,
            {
              opacity: 0,
              y: "var(--spacing-space-4)",
              duration: DURATION_SECONDARY,
            },
            `<${STAGGER}`,
          );
        }

        if (photo) {
          timeline.from(
            photo,
            {
              opacity: 0,
              filter: "blur(var(--spacing-space-1))",
              duration: DURATION_SECONDARY,
              clearProps: "filter",
            },
            "<",
          );
        }

        if (avatar) {
          timeline.from(
            avatar,
            {
              opacity: 0,
              filter: "blur(var(--spacing-space-1))",
              duration: DURATION_SECONDARY,
              clearProps: "filter",
            },
            "<",
          );
        }

        if (stats) {
          timeline.from(
            stats.children,
            {
              opacity: 0,
              y: "var(--spacing-space-3)",
              duration: DURATION_SECONDARY,
              stagger: STAGGER,
            },
            `-=${OVERLAP}`,
          );
        }
      });

      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="about-us-heading"
      className="overflow-hidden bg-canvas px-page py-section"
    >
      <div className="mx-auto w-full max-w-content">
        <header
          data-heading
          className="mx-auto max-w-narrow text-center"
        >
          <h2
            id="about-us-heading"
            className="text-heading-2 text-ink"
          >
            Duas especialidades diferentes deram origem a uma forma{" "}
            <span className="text-highlight">
              mais completa
            </span>{" "}
            de trabalhar.
          </h2>
        </header>

        <div className="mt-space-20 flex flex-col gap-space-20 lg:mt-space-24 lg:gap-space-16">
          <PersonRow person={PEOPLE[0]} />

          <PersonRow person={PEOPLE[1]} reverse />
        </div>
      </div>
    </section>
  );
}
