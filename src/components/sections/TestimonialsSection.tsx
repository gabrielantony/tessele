"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

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

type CaseMetric = {
  value: string;
  label: string;
};

type CaseMedia =
  | {
      kind: "image";
      src: string;
      alt: string;
    }
  | {
      kind: "video";
      src: string;
      poster?: string;
      label: string;
    };

type CaseStudy = {
  id: string;
  name: string;
  role: string;
  media: CaseMedia;
  services: {
    symbol: string;
    label: string;
  }[];
  quote: string;
  metrics: CaseMetric[];
};

const BRUNO_CASE: CaseStudy = {
  id: "bruno-pontes",
  name: "Bruno Pontes",
  role: "Professor e produtor de conteúdo",
  media: {
    kind: "image",
    src: "images/bruno-pontes.webp",
    alt: "Bruno Pontes",
  },
  services: [
    {
      symbol: "◎",
      label: "Estratégia e marketing",
    },
    {
      symbol: "↗",
      label: "Tráfego Pago",
    },
  ],
  quote:
    "“O principal ganho foi deixar de tomar decisão no escuro. A gente passou a entender melhor o que estava trazendo pessoas realmente interessadas, onde fazia sentido investir mais e o que precisava ser interrompido.”",
  metrics: [
    {
      value: "5k+",
      label: "Visualizações orgânicas",
    },
    {
      value: "132",
      label: "Novos seguidores",
    },
  ],
};

/*
 * Exemplo de case usando vídeo.
 *
 * Troque os dados abaixo pelo próximo case real.
 * O poster continua sendo exibido caso o vídeo ainda não tenha carregado
 * e também funciona como estado estático para reduced motion.
 */
const VIDEO_CASE: CaseStudy = {
  ...BRUNO_CASE,
  id: "bruno-pontes-video",
  media: {
    kind: "video",
    src: "videos/bruno-pontes.mp4",
    poster: "images/bruno-pontes.webp",
    label: "Case Bruno Pontes",
  },
};

const CASES: CaseStudy[] = [BRUNO_CASE, VIDEO_CASE];
const CASES_RAIL_ID = "cases-rail";

const RELATIONSHIP_METRICS = [
  {
    value: "4 anos",
    label: "de relacionamento médio com clientes",
  },
  {
    value: "95%",
    label: "dos clientes voltaram para novos projetos",
  },
  {
    value: "7 negócios",
    label: "acompanhados de forma recorrente",
  },
];

type DragState = {
  pointerId: number | null;
  startX: number;
  scrollLeft: number;
};

function CaseMedia({ media }: { media: CaseMedia }) {
  if (media.kind === "video") {
    return (
      <video
        data-case-video
        className="h-full w-full object-cover"
        src={media.src}
        poster={media.poster}
        aria-label={media.label}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        draggable={false}
      />
    );
  }

  return (
    <img
      className="h-full w-full object-cover"
      src={media.src}
      alt={media.alt}
      loading="lazy"
      draggable={false}
    />
  );
}

function CaseCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <article
      data-case-card
      className="w-full max-w-wide shrink-0 snap-center overflow-hidden rounded-xl bg-surface p-space-4 shadow-lifted"
    >
      <div className="grid gap-space-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          data-case-media
          className="relative aspect-square overflow-hidden rounded-lg bg-surface-sunken"
        >
          <CaseMedia media={caseStudy.media} />

          <div className="absolute inset-x-space-0 bottom-space-0 bg-accent px-space-6 py-space-4">
            <p className="text-body-bold text-on-accent">
              {caseStudy.name}
            </p>

            <p className="text-small text-on-accent-muted">
              {caseStudy.role}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-space-8 p-space-6 lg:col-span-2">
          <div className="flex flex-col gap-space-8">
            <div className="flex flex-wrap gap-space-3">
              {caseStudy.services.map((service) => (
                <span
                  key={service.label}
                  className="inline-flex items-center gap-space-2 rounded-full bg-surface-sunken px-space-4 py-space-2 text-small text-ink"
                >
                  <span aria-hidden="true">{service.symbol}</span>
                  {service.label}
                </span>
              ))}
            </div>

            <blockquote className="text-lead text-ink">
              {caseStudy.quote}
            </blockquote>
          </div>

          <div className="grid grid-cols-2 gap-space-8">
            {caseStudy.metrics.map((metric) => (
              <div key={metric.label}>
                <p className="text-metric text-highlight">
                  {metric.value}
                </p>

                <p className="mt-space-2 text-small text-muted">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CasesSection() {
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [activeCase, setActiveCase] = useState(0);

  const dragState = useRef<DragState>({
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
  });

  useGSAP(
    () => {
      const section = root.current;

      if (!section) {
        return;
      }

      const select = gsap.utils.selector(section);

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const videos = select(
        "[data-case-video]",
      ) as HTMLVideoElement[];

      if (prefersReducedMotion) {
        gsap.set(
          select(
            "[data-heading], [data-case-card], [data-relationship-metric]",
          ),
          {
            clearProps: "all",
          },
        );

        videos.forEach((video) => {
          video.pause();
          video.currentTime = 0;
        });

        return;
      }

      const computedStyle = getComputedStyle(section);

      const headingDistance = computedStyle
        .getPropertyValue("--spacing-space-6")
        .trim();

      const cardDistance = computedStyle
        .getPropertyValue("--spacing-space-8")
        .trim();

      const metricDistance = computedStyle
        .getPropertyValue("--spacing-space-4")
        .trim();

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
        .from("[data-heading]", {
          opacity: 0,
          y: headingDistance,
          duration: DURATION_PRIMARY,
        })
        .from(
          "[data-case-card]",
          {
            opacity: 0,
            y: cardDistance,
            duration: DURATION_PRIMARY,
            stagger: STAGGER,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-relationship-metric]",
          {
            opacity: 0,
            y: metricDistance,
            duration: DURATION_SECONDARY,
            stagger: STAGGER,
          },
          `-=${OVERLAP}`,
        );
    },
    {
      scope: root,
    },
  );

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const carousel = rail.current;

    if (!carousel || event.pointerType !== "mouse") {
      return;
    }

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: carousel.scrollLeft,
    };

    carousel.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const carousel = rail.current;

    if (
      !carousel ||
      dragState.current.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const distance = event.clientX - dragState.current.startX;

    carousel.scrollLeft =
      dragState.current.scrollLeft - distance;
  }

  function finishPointerDrag(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const carousel = rail.current;

    if (
      !carousel ||
      dragState.current.pointerId !== event.pointerId
    ) {
      return;
    }

    if (carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }

    dragState.current.pointerId = null;
  }

  function updateActiveCase() {
    const carousel = rail.current;

    if (!carousel) {
      return;
    }

    const railCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    let closestCase = 0;
    let closestDistance = Infinity;

    Array.from(carousel.children).forEach((card, index) => {
      if (!(card instanceof HTMLElement)) {
        return;
      }

      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - railCenter);

      if (distance < closestDistance) {
        closestCase = index;
        closestDistance = distance;
      }
    });

    setActiveCase(closestCase);
  }

  function scrollToCase(index: number) {
    const carousel = rail.current;
    const card = carousel?.children.item(index);

    if (!(card instanceof HTMLElement)) {
      return;
    }

    const behavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";

    card.scrollIntoView({
      behavior,
      block: "nearest",
      inline: "center",
    });
  }

  return (
    <section
      ref={root}
      className="overflow-hidden bg-canvas py-section"
      aria-labelledby="cases-title"
    >
      <div className="px-page">
        <h2
          id="cases-title"
          data-heading
          className="mx-auto max-w-copy text-center text-heading-2 text-ink"
        >
          Problemas diferentes,
          <br />
          soluções construídas para o
          <br />
          que cada negócio{" "}
          <span className="text-highlight">
            precisava.
          </span>
        </h2>
      </div>

      <div
        ref={rail}
        id={CASES_RAIL_ID}
        role="region"
        aria-label="Cases de clientes"
        tabIndex={0}
        onScroll={updateActiveCase}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        className="cases-rail mt-space-16 flex gap-space-8 overflow-x-auto overscroll-x-contain px-page pb-space-8 snap-x snap-mandatory lg:cursor-grab lg:snap-none lg:active:cursor-grabbing"
      >
        {CASES.map((caseStudy) => (
          <CaseCard
            key={caseStudy.id}
            caseStudy={caseStudy}
          />
        ))}
      </div>

      <div
        className="mt-space-6 flex justify-center gap-space-3"
        aria-label="Navegação dos cases"
      >
        {CASES.map((caseStudy, index) => {
          const isActive = activeCase === index;

          return (
            <button
              key={caseStudy.id}
              type="button"
              aria-controls={CASES_RAIL_ID}
              aria-current={isActive ? "true" : undefined}
              aria-label={`Ver case ${index + 1}: ${caseStudy.name}`}
              className={`h-space-3 w-space-3 rounded-full transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight ${
                isActive ? "bg-highlight" : "bg-hairline"
              }`}
              onClick={() => scrollToCase(index)}
            />
          );
        })}
      </div>

      <div className="mx-auto mt-space-16 grid max-w-wide gap-space-8 px-page md:grid-cols-3">
        {RELATIONSHIP_METRICS.map((metric) => (
          <div
            key={metric.value}
            data-relationship-metric
            className="text-center"
          >
            <p className="text-heading-2 text-accent">
              {metric.value}
            </p>

            <p className="mx-auto mt-space-3 max-w-copy text-body text-muted">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
