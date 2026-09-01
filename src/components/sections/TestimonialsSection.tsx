"use client";

import {
  useRef,
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
      /*
       * `src` is optional so a case can carry only its poster while the real
       * file is still missing: a <video> with a poster and no source paints the
       * still and issues no request, where a src pointing at nothing paints a
       * black box and logs a network error.
       */
      src?: string;
      poster: string;
      label: string;
    };

type CaseStudy = {
  id: string;
  name: string;
  role: string;
  /* Absent renders the avatar slot as an empty tile — see the note on CASES. */
  avatar?: string;
  /* The line beside the layout-board icon: what was built for this client. */
  project: string;
  quote: string;
  metrics: CaseMetric[];
  /*
   * Absent selects the design's second variant: no media column, a narrower
   * card, a larger inner padding and a smaller corner radius. Not every case
   * will have footage, so the media column is what varies, not the layout.
   */
  media?: CaseMedia;
};

/*
 * PLACEHOLDER CONTENT — the real cases are still to come.
 *
 * Three entries so both variants are on screen at once: two with a media column
 * (one image, one video) and one without. The images are the site's own service
 * photos standing in for project shots; the avatars are deliberately left unset
 * so no stock face can be mistaken for a real client. Replacing any of this is a
 * data edit, not a markup edit.
 */
const CASES: CaseStudy[] = [
  {
    id: "placeholder-image",
    name: "Nome do cliente",
    role: "Cargo e empresa",
    project: "Landing page de serviços para o Aprenda Bem",
    quote:
      "\u201cO principal ganho foi deixar de tomar decisão no escuro. A gente passou a entender melhor o que estava trazendo pessoas realmente interessadas, onde fazia sentido investir mais e o que precisava ser interrompido.\u201d",
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
    media: {
      kind: "image",
      src: "images/services-design.jpg",
      alt: "Imagem do projeto",
    },
  },
  {
    id: "placeholder-quote-only",
    name: "Nome do cliente",
    role: "Cargo e empresa",
    project: "Estratégia de conteúdo e distribuição",
    quote:
      "\u201cSaímos de um calendário improvisado para uma rotina que a equipe consegue sustentar sozinha. O que mudou não foi o volume, foi saber o porquê de cada peça.\u201d",
    metrics: [
      {
        value: "3x",
        label: "Alcance por publicação",
      },
      {
        value: "18",
        label: "Pautas em produção",
      },
    ],
  },
  {
    id: "placeholder-video",
    name: "Nome do cliente",
    role: "Cargo e empresa",
    project: "Campanha de tráfego pago para captação",
    quote:
      "\u201cO investimento parou de ser um chute mensal. Hoje a gente sabe quanto custa uma conversa qualificada e decide com esse número na mão.\u201d",
    metrics: [
      {
        value: "R$ 4,20",
        label: "Custo por lead",
      },
      {
        value: "47%",
        label: "Aumento em conversas",
      },
    ],
    media: {
      kind: "video",
      poster: "images/services-trafego.jpg",
      label: "Depoimento em vídeo",
    },
  },
];

const CASES_RAIL_ID = "cases-rail";

/*
 * The label is stored in two pieces because the break point is a decision, not
 * an outcome. Left to wrap on its own, "acompanhados de forma recorrente" drops
 * a lone "recorrente" onto the second line while its neighbours keep two words
 * there, and which line a word lands on shifts with the font and the column.
 *
 * `tail` is what must sit on the second line wherever there is room for two.
 * The single-word tail on the last one is deliberate -- Gabriel took that one as
 * the exception, since the phrase has no two-word ending to give.
 */
const RELATIONSHIP_METRICS = [
  {
    value: "4 anos",
    lead: "de relacionamento médio",
    tail: "com clientes",
  },
  {
    value: "95%",
    lead: "dos clientes voltaram para",
    tail: "novos projetos",
  },
  {
    value: "7 negócios",
    lead: "acompanhados de forma",
    tail: "recorrente",
  },
];

type DragState = {
  pointerId: number | null;
  startX: number;
  scrollLeft: number;
};

/*
 * Path data exported verbatim from the design's `layout-board` layer; only the
 * stroke was swapped for currentColor so the icon follows the text beside it.
 */
function LayoutBoardIcon() {
  return (
    <svg
      className="size-space-5 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.33333 7.5H10M10 12.5H16.6667M10 3.33333V16.6667M3.33333 5C3.33333 4.55797 3.50893 4.13405 3.82149 3.82149C4.13405 3.50893 4.55797 3.33333 5 3.33333H15C15.442 3.33333 15.8659 3.50893 16.1785 3.82149C16.4911 4.13405 16.6667 4.55797 16.6667 5V15C16.6667 15.442 16.4911 15.8659 16.1785 16.1785C15.8659 16.4911 15.442 16.6667 15 16.6667H5C4.55797 16.6667 4.13405 16.4911 3.82149 16.1785C3.50893 15.8659 3.33333 15.442 3.33333 15V5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaseMedia({ media }: { media: CaseMedia }) {
  if (media.kind === "video") {
    const hasSource = Boolean(media.src);

    return (
      <video
        data-case-video
        className="absolute inset-0 block h-full w-full object-cover object-center"
        src={media.src}
        poster={media.poster}
        aria-label={media.label}
        autoPlay={hasSource}
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
      className="absolute inset-0 block h-full w-full object-cover object-center"
      src={media.src}
      alt={media.alt}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

function CaseCard({ caseStudy }: { caseStudy: CaseStudy }) {
  const { media } = caseStudy;

  return (
    <article
      data-case-card
      /*
       * Each variant carries its own width, radius and padding from the design.
       *
       * The width below lg is not from the design, which was drawn at one size:
       * the card is held short of the rail so the next one shows at the edge.
       * That sliver is the only thing telling a phone reader the row continues,
       * now that the dots are gone.
       */
      className={`w-[85%] shrink-0 snap-center lg:w-full flex flex-col bg-surface shadow-lifted lg:flex-row lg:items-center ${
        media
          ? "max-w-testimonial rounded-3xl p-space-4"
          : "max-w-testimonial-compact rounded-2xl p-space-8"
      }`}
    >
      {media ? (
        <div
          data-case-media
          /*
           * A fixed 320px column beside the copy on wide viewports, as designed.
           * Below that the frame the design was drawn in no longer exists, so
           * the column becomes a square banner above the copy rather than a
           * sliver next to it.
           */
          className="relative aspect-square min-w-0 shrink-0 overflow-hidden rounded-xl bg-surface-sunken lg:aspect-auto lg:w-80 lg:self-stretch"
        >
          <CaseMedia media={media} />
        </div>
      ) : null}

      <div
        className={`flex min-w-0 flex-1 flex-col gap-space-8 ${
          media
            ? "p-space-4 lg:py-space-2 lg:pl-space-8 lg:pr-space-6"
            : ""
        }`}
      >
        <div className="flex min-w-0 flex-col gap-space-6">
          <div className="flex flex-wrap items-center gap-space-4">
            <div className="size-space-16 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
              {caseStudy.avatar ? (
                <img
                  className="block h-full w-full object-cover object-center"
                  src={caseStudy.avatar}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-body-bold text-ink">{caseStudy.name}</p>

              <p className="text-body text-muted">{caseStudy.role}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-space-4">
            <div className="flex min-w-0 items-center gap-space-2 text-muted">
              <LayoutBoardIcon />

              <p className="text-body-medium min-w-0 flex-1">
                {caseStudy.project}
              </p>
            </div>

            {/* Regular weight here, against the 500 the lead token carries
                everywhere else — the design sets this quote in Lead/Desktop. */}
            <blockquote className="text-lead min-w-0 font-normal text-ink">
              {caseStudy.quote}
            </blockquote>
          </div>
        </div>

        <div className="h-px w-full bg-hairline" />

        <div className="flex flex-wrap items-start gap-space-10">
          {caseStudy.metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex min-w-0 flex-1 flex-col"
            >
              <p className="text-heading-2 text-highlight">
                {metric.value}
              </p>

              <p className="text-body text-muted">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function CasesSection() {
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);

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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        /*
         * The vertical padding here is holding the card's shadow, not spacing.
         *
         * `overflow-x: auto` leaves `overflow-y: visible`, which CSS coerces to
         * `auto` -- so the rail clips vertically whether or not that was ever
         * the intent, and it clips at its padding box. shadow-lifted reaches
         * 146px below the card and 10px above it, so anything less cut a hard
         * edge across the shadow.
         *
         * Each padding is paired with a margin that gives the space straight
         * back, leaving the rhythm exactly where it was: 64px above the cards
         * (48 + 16) and 32px below (160 - 128). Changing one half of a pair
         * without the other either moves the section or brings the cut back.
         */
        className="cases-rail mt-space-12 flex gap-space-8 overflow-x-auto overscroll-x-contain px-page pt-space-4 pb-space-40 -mb-space-32 snap-x snap-mandatory lg:cursor-grab lg:snap-none lg:active:cursor-grabbing"
      >
        {CASES.map((caseStudy) => (
          <CaseCard
            key={caseStudy.id}
            caseStudy={caseStudy}
          />
        ))}
      </div>

      {/*
       * `relative` is doing hit-testing work, not layout. The rail above gives
       * its shadow room with padding and takes the space back with a negative
       * margin, so its padding box still lies over the next 128px -- which is
       * here. A non-positioned box loses that overlap to the earlier sibling in
       * WebKit; positioning this paints it above.
       */}
      <div className="relative z-10 mt-space-16 px-page">
        {/*
         * Same box as the card above it, at every width: short of the rail and
         * left-aligned below lg, the card's own width and centred from lg up.
         */}
        <div className="grid w-[85%] max-w-testimonial gap-space-8 md:grid-cols-3 lg:mx-auto lg:w-full">
          {RELATIONSHIP_METRICS.map((metric) => (
            <div
              key={metric.value}
              data-relationship-metric
              className="text-center"
            >
              <p className="text-heading-2 text-accent">
                {metric.value}
              </p>

              <p className="mt-space-3 text-body text-muted">
                {metric.lead}{" "}
                {/*
                 * A block span rather than a <br />: from md up, where the
                 * three sit side by side and the break is the point, it takes
                 * its own line. Below that the columns stack full-width and it
                 * flows back inline, so a narrow phone is not forced into a
                 * break that leaves the first line half empty.
                 */}
                <span
                  data-metric-tail
                  className="md:block"
                >
                  {metric.tail}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
