"use client";

import { useRef, useState, type RefObject } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ======================================================
   MOTION
====================================================== */

const PHI = (1 + Math.sqrt(5)) / 2;

const PHI_INVERSE = 1 / PHI;

const PHI_SQUARED = PHI * PHI;

const DURATION_PRIMARY = PHI_INVERSE;

const DURATION_SECONDARY = PHI_INVERSE * PHI_INVERSE;

const DURATION_ACCENT = DURATION_SECONDARY * PHI_INVERSE;

const DURATION_MICRO = DURATION_ACCENT * PHI_INVERSE;

const STAGGER_LIST = DURATION_MICRO * PHI_INVERSE * PHI_INVERSE;

const OVERLAP = DURATION_ACCENT;

const IMAGE_SCALE_FROM =
  1 +
  PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE;

const HOVER_SCALE =
  1 +
  PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE;

const PRESS_SCALE =
  1 -
  PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE *
    PHI_INVERSE;

function fibonacciEaseOut(progress: number) {
  return 1 - Math.pow(1 - progress, PHI_SQUARED);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ======================================================
   TYPES
====================================================== */

type ServiceIcon =
  | "target"
  | "code"
  | "trending"
  | "clipboard"
  | "chart"
  | "edit"
  | "share"
  | "rocket"
  | "message"
  | "palette"
  | "layout"
  | "browser"
  | "smartphone"
  | "prototype"
  | "zap"
  | "dollar"
  | "users"
  | "linechart"
  | "click"
  | "search";

type ServiceItem = {
  icon: ServiceIcon;
  label: string;
};

type Service = {
  id: string;
  tab: string;
  tabIcon: ServiceIcon;
  tag: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  items: ServiceItem[];
};

/* ======================================================
   DATA
====================================================== */

const services: Service[] = [
  {
    id: "estrategia",
    tab: "Estratégia e marketing",
    tabIcon: "target",
    tag: "Direção",
    title:
      "Estratégia para escolher onde investir esforço e transformar isso em execução.",
    description:
      "Antes de qualquer execução, é preciso entender o momento da empresa, o que está funcionando, onde estão os gargalos e quais prioridades realmente merecem atenção. A partir desse diagnóstico, marketing deixa de ser uma sequência de ações e passa a responder a decisões concretas do negócio.",
    image: "images/services-estrategia.jpg",
    imageAlt: "Peças de xadrez sobre um tabuleiro.",
    items: [
      {
        icon: "clipboard",
        label: "Planejamento estratégico",
      },
      {
        icon: "chart",
        label: "Gestão de marketing digital",
      },
      {
        icon: "edit",
        label: "Estratégia de conteúdo",
      },
      {
        icon: "share",
        label: "Gestão de redes sociais",
      },
      {
        icon: "rocket",
        label: "Campanhas e lançamentos",
      },
      {
        icon: "message",
        label: "Direção de comunicação",
      },
    ],
  },
  {
    id: "design",
    tab: "Design & Desenvolvimento",
    tabIcon: "code",
    tag: "Criação",
    title:
      "Design e desenvolvimento para transformar estratégia em uma experiência clara.",
    description:
      "Da identidade ao produto digital, cada entrega parte do que a empresa precisa comunicar e do que as pessoas precisam conseguir fazer. A forma acompanha essa lógica para construir pontos de contato consistentes com o negócio.",
    image: "images/services-design.jpg",
    imageAlt: "Notebook aberto em uma mesa de trabalho.",
    items: [
      {
        icon: "palette",
        label: "Identidade visual",
      },
      {
        icon: "layout",
        label: "Design de interfaces",
      },
      {
        icon: "browser",
        label: "Sites institucionais",
      },
      {
        icon: "smartphone",
        label: "Experiências responsivas",
      },
      {
        icon: "prototype",
        label: "Landing pages",
      },
      {
        icon: "zap",
        label: "Desenvolvimento e otimização",
      },
    ],
  },
  {
    id: "trafego",
    tab: "Tráfego Pago",
    tabIcon: "trending",
    tag: "Conversão",
    title:
      "Mídia paga com direção para transformar investimento em oportunidades reais.",
    description:
      "A campanha parte de um objetivo claro, uma oferta, um público e uma jornada coerente. A partir daí, investimento e desempenho são acompanhados para entender o que merece escala e onde é preciso ajustar.",
    image: "images/services-trafego.jpg",
    imageAlt: "Dashboard com gráficos de desempenho.",
    items: [
      {
        icon: "dollar",
        label: "Google Ads",
      },
      {
        icon: "users",
        label: "Meta Ads",
      },
      {
        icon: "linechart",
        label: "Análise de desempenho",
      },
      {
        icon: "click",
        label: "Estratégia de conversão",
      },
      {
        icon: "search",
        label: "Pesquisa e segmentação",
      },
      {
        icon: "chart",
        label: "Relatórios e otimizações",
      },
    ],
  },
];

/* ======================================================
   ICON
====================================================== */

function Icon({
  type,
  className = "",
}: {
  type: ServiceIcon;
  className?: string;
}) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (type) {
    case "target":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );

    case "code":
      return (
        <svg {...commonProps}>
          <path d="M8 8L4 12L8 16" />
          <path d="M16 8L20 12L16 16" />
          <path d="M14 4L10 20" />
        </svg>
      );

    case "trending":
      return (
        <svg {...commonProps}>
          <path d="M4 17L10 11L14 15L21 8" />
          <path d="M16 8H21V13" />
        </svg>
      );

    case "clipboard":
      return (
        <svg {...commonProps}>
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 4.5V3H15V4.5" />
          <path d="M9 9H15" />
          <path d="M9 13H15" />
        </svg>
      );

    case "chart":
      return (
        <svg {...commonProps}>
          <path d="M5 19V13" />
          <path d="M10 19V9" />
          <path d="M15 19V5" />
          <path d="M20 19V11" />
        </svg>
      );

    case "edit":
      return (
        <svg {...commonProps}>
          <path d="M5 19L6 14L16 4L20 8L10 18L5 19Z" />
          <path d="M14 6L18 10" />
        </svg>
      );

    case "share":
      return (
        <svg {...commonProps}>
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="18" cy="18" r="2" />
          <path d="M8 11L16 7" />
          <path d="M8 13L16 17" />
        </svg>
      );

    case "rocket":
      return (
        <svg {...commonProps}>
          <path d="M14 5C17 3 20 4 20 4C20 4 21 7 19 10L13 16L8 11L14 5Z" />
          <path d="M8 11L5 12L4 16L8 15" />
          <path d="M13 16L12 20L8 21L9 16" />
          <circle cx="16" cy="8" r="1.5" />
        </svg>
      );

    case "message":
      return (
        <svg {...commonProps}>
          <path d="M5 5H19V16H10L6 20V16H5V5Z" />
        </svg>
      );

    case "palette":
      return (
        <svg {...commonProps}>
          <path d="M12 4C7 4 4 7 4 12C4 16 7 19 11 19H13C14 19 15 18 15 17C15 16 14 15 14 14C14 13 15 12 16 12H18C19 12 20 11 20 10C20 6 16 4 12 4Z" />
          <circle cx="8" cy="10" r="1" />
          <circle cx="11" cy="7" r="1" />
          <circle cx="15" cy="8" r="1" />
        </svg>
      );

    case "layout":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 10H20" />
          <path d="M10 10V19" />
        </svg>
      );

    case "browser":
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9H21" />
          <circle cx="6" cy="7" r=".5" />
          <circle cx="8" cy="7" r=".5" />
        </svg>
      );

    case "smartphone":
      return (
        <svg {...commonProps}>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M11 18H13" />
        </svg>
      );

    case "prototype":
      return (
        <svg {...commonProps}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8H15" />
          <path d="M9 12H15" />
          <path d="M9 16H13" />
        </svg>
      );

    case "zap":
      return (
        <svg {...commonProps}>
          <path d="M13 2L5 14H11L10 22L19 9H13L13 2Z" />
        </svg>
      );

    case "dollar":
      return (
        <svg {...commonProps}>
          <path d="M12 3V21" />
          <path d="M16 7H10C8 7 7 8 7 10C7 12 8 13 10 13H14C16 13 17 14 17 16C17 18 16 19 14 19H8" />
        </svg>
      );

    case "users":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="9" r="3" />
          <path d="M4 19C4 16 6 14 9 14C12 14 14 16 14 19" />
          <path d="M15 7C17 7 19 8.5 19 11" />
          <path d="M16 14C19 14 21 16 21 19" />
        </svg>
      );

    case "linechart":
      return (
        <svg {...commonProps}>
          <path d="M4 18L9 13L13 15L20 7" />
          <path d="M4 5V19H20" />
        </svg>
      );

    case "click":
      return (
        <svg {...commonProps}>
          <path d="M8 4L16 12L12 13L15 18L12 20L9 15L6 18L8 4Z" />
        </svg>
      );

    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="10" cy="10" r="5" />
          <path d="M14 14L20 20" />
        </svg>
      );
  }
}

/* ======================================================
   SERVICE TAB
====================================================== */

function ServiceTab({
  service,
  active,
  onSelect,
  onHoverStart,
  onHoverEnd,
  onPressStart,
  onPressEnd,
}: {
  service: Service;
  active: boolean;

  onSelect: (button: HTMLButtonElement) => void;

  onHoverStart: (button: HTMLButtonElement) => void;

  onHoverEnd: (button: HTMLButtonElement) => void;

  onPressStart: (button: HTMLButtonElement) => void;

  onPressEnd: (button: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-tab-button
      onPointerEnter={(event) => onHoverStart(event.currentTarget)}
      onPointerLeave={(event) => onHoverEnd(event.currentTarget)}
      onPointerDown={(event) => onPressStart(event.currentTarget)}
      onPointerUp={(event) => onPressEnd(event.currentTarget)}
      onPointerCancel={(event) => onHoverEnd(event.currentTarget)}
      onClick={(event) => onSelect(event.currentTarget)}
      className={[
        "group",
        "relative",
        "flex",
        "w-full",
        "cursor-pointer",
        "items-center",
        "justify-center",
        "gap-space-2",
        "rounded-full",
        "px-space-4",
        "py-space-3",
        "lg:w-auto",
        "lg:px-space-6",
        "text-ink",
        // Focus is declared here rather than left to the browser: Chrome's own
        // ring is `outline: auto`, which ignores outline-color and paints its
        // blue -- a colour from outside this palette.
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight",
        "transition-[background-color,color,box-shadow]",
        "duration-(--duration-base)",
        "ease-(--ease-out)",
        active
          ? "bg-surface shadow-control"
          : "bg-transparent hover:bg-surface-glass active:bg-surface",
      ].join(" ")}
    >
      <span
        data-tab-icon
        className={[
          "flex",
          "size-space-5",
          "shrink-0",
          "items-center",
          "justify-center",
          "transition-colors",
          "duration-(--duration-fast)",
          "ease-(--ease-out)",
          active ? "text-highlight" : "text-muted group-hover:text-ink",
        ].join(" ")}
      >
        <Icon type={service.tabIcon} className="size-space-5" />
      </span>

      <span
        className={[
          "whitespace-nowrap",
          active ? "text-small-bold" : "text-small",
        ].join(" ")}
      >
        {service.tab}
      </span>
    </button>
  );
}

/* ======================================================
   SERVICE ITEM
====================================================== */

function ServiceListItem({ item }: { item: ServiceItem }) {
  return (
    <div
      data-tab-item
      className="flex min-w-0 items-center gap-space-2 text-ink"
    >
      <span
        data-tab-item-icon
        className="flex size-space-5 shrink-0 items-center justify-center"
      >
        <Icon type={item.icon} className="size-space-5" />
      </span>

      <p data-tab-item-label className="min-w-0 text-body">
        {item.label}
      </p>
    </div>
  );
}

/* ======================================================
   SERVICE CARD
====================================================== */

function ServiceCard({
  service,
  cardRef,
}: {
  service: Service;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <article
      ref={cardRef}
      data-card
      role="tabpanel"
      className="w-full overflow-hidden rounded-xl bg-surface p-space-4 shadow-lifted"
    >
      <div className="grid min-w-0 grid-cols-1 gap-space-6 lg:grid-cols-5 lg:items-stretch">
        {/* IMAGE */}

        <div className="relative aspect-[3/2] w-full min-w-0 overflow-hidden rounded-lg bg-surface-sunken sm:aspect-auto sm:h-64 md:h-72 lg:col-span-2 lg:aspect-auto lg:h-auto">
          <img
            key={service.image}
            data-tab-image
            src={service.image}
            alt={service.imageAlt}
            loading="eager"
            decoding="async"
            className="absolute inset-0 block h-full w-full object-cover object-center"
          />
        </div>

        {/* CONTENT */}

        <div className="flex min-w-0 flex-col justify-center gap-space-6 p-space-2 lg:col-span-3 lg:p-space-10">
          <div
            key={`${service.id}-copy`}
            data-tab-copy
            className="flex min-w-0 flex-col gap-space-3"
          >
            <div className="w-fit rounded-md bg-badge px-space-3 py-space-1">
              <p className="text-label uppercase text-ink">{service.tag}</p>
            </div>

            <h3 className="text-heading-3 text-ink">{service.title}</h3>

            <p className="text-body text-ink">{service.description}</p>
          </div>

          <div
            data-tab-divider
            className="w-full origin-left border-t border-hairline"
          />

          <div
            key={`${service.id}-items`}
            className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-x-space-6 gap-y-space-5"
          >
            {service.items.map((item) => (
              <ServiceListItem key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ======================================================
   SECTION
====================================================== */

export default function ServicosEEntregas() {
  const root = useRef<HTMLElement>(null);

  const cardRoot = useRef<HTMLDivElement>(null);

  const hasMounted = useRef(false);

  const [activeService, setActiveService] = useState(0);

  const service = services[activeService];

  /* ==================================================
       MAIN SECTION REVEAL
    ================================================== */

  const { contextSafe } = useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set(
          ["[data-heading]", "[data-intro]", "[data-tabs]", "[data-card]"],
          {
            opacity: 1,
            yPercent: 0,
            scale: 1,
            clearProps: "transform",
          },
        );

        return;
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: fibonacciEaseOut,
        },

        scrollTrigger: {
          trigger: root.current,

          start: "top 75%",

          toggleActions: "play none none reverse",
        },
      });

      timeline
        .from("[data-heading]", {
          opacity: 0,

          yPercent: PHI_SQUARED,

          duration: DURATION_PRIMARY,
        })

        .from(
          "[data-intro]",
          {
            opacity: 0,

            yPercent: PHI,

            duration: DURATION_SECONDARY,
          },

          `-=${OVERLAP}`,
        )

        .from(
          "[data-tabs]",
          {
            opacity: 0,

            yPercent: PHI,

            duration: DURATION_SECONDARY,
          },

          `-=${DURATION_ACCENT}`,
        )

        .from(
          "[data-card]",
          {
            opacity: 0,

            yPercent: PHI_SQUARED,

            duration: DURATION_PRIMARY,
          },

          `-=${DURATION_ACCENT}`,
        );
    },

    {
      scope: root,
    },
  );

  /* ==================================================
       SERVICE CONTENT CHANGE

       Only the content inside the card animates here.
       The card shell itself remains visible.
    ================================================== */

  useGSAP(
    () => {
      if (!hasMounted.current) {
        hasMounted.current = true;

        return;
      }

      if (prefersReducedMotion()) {
        gsap.set(
          [
            "[data-tab-image]",
            "[data-tab-copy]",
            "[data-tab-item]",
            "[data-tab-item-icon]",
            "[data-tab-item-label]",
          ],
          {
            opacity: 1,

            xPercent: 0,

            yPercent: 0,

            scale: 1,

            clearProps: "transform",
          },
        );

        gsap.set("[data-tab-divider]", {
          scaleX: 1,

          clearProps: "transform",
        });

        return;
      }

      /*
       * Explicit fromTo prevents a previous
       * reverted tween from leaving the new
       * service invisible.
       */

      const timeline = gsap.timeline({
        defaults: {
          ease: fibonacciEaseOut,
        },
      });

      timeline

        /* IMAGE */

        .fromTo(
          "[data-tab-image]",

          {
            opacity: 0,

            scale: IMAGE_SCALE_FROM,
          },

          {
            opacity: 1,

            scale: 1,

            duration: DURATION_SECONDARY,

            overwrite: "auto",
          },
        )

        /* COPY */

        .fromTo(
          "[data-tab-copy]",

          {
            opacity: 0,

            xPercent: -PHI_INVERSE,
          },

          {
            opacity: 1,

            xPercent: 0,

            duration: DURATION_ACCENT,

            overwrite: "auto",
          },

          `-=${DURATION_ACCENT}`,
        )

        /* DIVIDER */

        .fromTo(
          "[data-tab-divider]",

          {
            scaleX: 0,

            transformOrigin: "left center",
          },

          {
            scaleX: 1,

            duration: DURATION_ACCENT,

            overwrite: "auto",
          },

          `-=${DURATION_MICRO}`,
        )

        /* LIST ITEMS */

        .fromTo(
          "[data-tab-item]",

          {
            opacity: 0,

            yPercent: PHI_INVERSE,
          },

          {
            opacity: 1,

            yPercent: 0,

            duration: DURATION_ACCENT,

            stagger: STAGGER_LIST,

            overwrite: "auto",
          },

          `-=${DURATION_MICRO}`,
        )

        /* ICON FADE */

        .fromTo(
          "[data-tab-item-icon]",

          {
            opacity: 0,
          },

          {
            opacity: 1,

            duration: DURATION_MICRO,

            stagger: STAGGER_LIST,

            overwrite: "auto",
          },

          "<",
        );
    },

    {
      scope: cardRoot,

      dependencies: [activeService],

      revertOnUpdate: true,
    },
  );

  /* ==================================================
       TAB MOTION
    ================================================== */

  const animateTab = contextSafe(
    (
      button: HTMLButtonElement,

      scale: number,

      duration: number,
    ) => {
      if (prefersReducedMotion()) {
        return;
      }

      gsap.killTweensOf(button);

      gsap.to(button, {
        scale,

        duration,

        ease: fibonacciEaseOut,

        overwrite: "auto",
      });
    },
  );

  const handleHoverStart = contextSafe(
    (
      button: HTMLButtonElement,

      active: boolean,
    ) => {
      if (active) {
        return;
      }

      animateTab(
        button,

        HOVER_SCALE,

        DURATION_ACCENT,
      );
    },
  );

  const handleHoverEnd = contextSafe((button: HTMLButtonElement) => {
    animateTab(
      button,

      1,

      DURATION_ACCENT,
    );
  });

  const handlePressStart = contextSafe((button: HTMLButtonElement) => {
    animateTab(
      button,

      PRESS_SCALE,

      DURATION_MICRO,
    );
  });

  const handlePressEnd = contextSafe((button: HTMLButtonElement) => {
    animateTab(
      button,

      1,

      DURATION_MICRO,
    );
  });

  /* ==================================================
       SELECT SERVICE
    ================================================== */

  const handleSelect = contextSafe(
    (
      index: number,

      button: HTMLButtonElement,
    ) => {
      /*
       * Always update the state.
       * No activeService comparison here,
       * which avoids a stale closure.
       */

      setActiveService(index);

      animateTab(
        button,

        1,

        DURATION_ACCENT,
      );

      if (prefersReducedMotion()) {
        return;
      }

      const icon = button.querySelector("[data-tab-icon]");

      if (!icon) {
        return;
      }

      /*
       * Small fade on the selected icon.
       */

      gsap.killTweensOf(icon);

      gsap.fromTo(
        icon,

        {
          opacity: PHI_INVERSE,
        },

        {
          opacity: 1,

          duration: DURATION_ACCENT,

          ease: fibonacciEaseOut,

          overwrite: "auto",
        },
      );
    },
  );

  /* ==================================================
       RENDER
    ================================================== */

  return (
    <section
      ref={root}
      id="servicos"
      data-name="servicos-e-entregas"
      className="bg-canvas px-page py-section"
    >
      <div className="mx-auto flex w-full max-w-wide flex-col items-center gap-space-10">
        {/* HEADER */}

        <header className="flex w-full max-w-copy flex-col items-center gap-space-3 text-center">
          <h2 data-heading className="text-heading-2 text-ink">
            {/* The nbsp is load-bearing, the same tie ProblemSection's heading
              * uses: without it "diferente." was the entire second line at every
              * width from 768 up. Gluing it to "entrega" moves the wrap one word
              * earlier instead, so the last line is never a single word. */}
            Cada problema pede uma entrega&nbsp;
            <span className="text-highlight">diferente</span>.
          </h2>

          <p data-intro className="text-subtitle text-muted">
            Às vezes, o que precisa mudar é a forma como a empresa se apresenta.
            Em outras, a comunicação, o marketing ou a experiência de quem chega
            até ela. A direção define onde a gente precisa atuar.
          </p>
        </header>

        {/* SERVICES */}

        <div className="flex w-full flex-col items-center gap-space-10">
          {/* TABS */}

          <div
            data-tabs
            role="tablist"
            aria-label="Áreas de atuação"
            className="flex w-full flex-col items-stretch gap-space-1 rounded-xl border border-border-strong bg-surface-sunken p-space-1 lg:w-auto lg:max-w-full lg:flex-row lg:items-center lg:justify-center lg:gap-space-2 lg:rounded-full"
          >
            {services.map((item, index) => {
              const active = activeService === index;

              return (
                <ServiceTab
                  key={item.id}
                  service={item}
                  active={active}
                  onHoverStart={(button) =>
                    handleHoverStart(
                      button,

                      active,
                    )
                  }
                  onHoverEnd={handleHoverEnd}
                  onPressStart={handlePressStart}
                  onPressEnd={handlePressEnd}
                  onSelect={(button) =>
                    handleSelect(
                      index,

                      button,
                    )
                  }
                />
              );
            })}
          </div>

          {/* CARD */}

          <div className="w-full max-w-content">
            <ServiceCard service={service} cardRef={cardRoot} />
          </div>
        </div>
      </div>
    </section>
  );
}
