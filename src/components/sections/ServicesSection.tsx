"use client";

import { useRef, useState, type RefObject } from "react";

import {
  IconArticle,
  IconBolt,
  IconBrandGoogle,
  IconBrandMeta,
  IconBrowser,
  IconCode,
  IconDevices,
  IconFileDescription,
  IconFilter,
  IconFlag,
  IconFlask,
  IconLayoutDashboard,
  IconPalette,
  IconReportAnalytics,
  IconRocket,
  IconRoute,
  IconShare3,
  IconSpeakerphone,
  IconTargetArrow,
  IconTrendingUp,
  IconUsersGroup,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

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

/*
 * Icons come from @tabler/icons-react rather than being drawn here. Tabler is
 * the page's icon set, and the local switch this replaced was 230 lines of
 * hand-drawn paths approximating it -- shapes that read as "an icon like
 * Tabler's" rather than the icon. Each service carries the component itself, so
 * adding a service is an import plus an entry in `services` and nothing else.
 */
type ServiceIcon = TablerIcon;

/*
 * Tabler draws its outline set at stroke 2 on a 24px grid. At `size-space-5`
 * (20px) that reads heavier than the rest of the page, so the section keeps the
 * 1.7 the hand-drawn icons used -- the weight is unchanged from before the swap.
 */
const ICON_STROKE = 1.7;

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
    tabIcon: IconTargetArrow,
    tag: "Direção",
    title:
      "Diagnóstico, planejamento e gestão de marketing digital, nessa ordem.",
    description:
      "A gente começa por um diagnóstico do que já está rodando, onde estão os gargalos e quais objetivos do negócio o marketing pode de fato mover. Disso sai um plano com prioridades, canais e o que entra em cada trimestre, e é ele que decide a execução de conteúdo, redes e campanhas. Serve para empresas que já investem em marketing e não conseguem dizer o que está funcionando.",
    image: "images/services-estrategia.jpg",
    imageAlt: "Peças de xadrez sobre um tabuleiro.",
    items: [
      {
        icon: IconRoute,
        label: "Planejamento de marketing",
      },
      {
        icon: IconSpeakerphone,
        label: "Gestão de marketing digital",
      },
      {
        icon: IconArticle,
        label: "Estratégia de conteúdo",
      },
      {
        icon: IconShare3,
        label: "Gestão de redes sociais",
      },
      {
        icon: IconRocket,
        label: "Campanhas e lançamentos",
      },
      {
        icon: IconFlag,
        label: "Posicionamento de marca",
      },
    ],
  },
  {
    id: "design",
    tab: "Design & Desenvolvimento",
    tabIcon: IconCode,
    tag: "Criação",
    title:
      "Criação de sites, landing pages e identidade visual, com design e desenvolvimento na mesma mão.",
    description:
      "A gente cuida de UX/UI e de desenvolvimento no mesmo projeto, do wireframe ao código em produção, sem repassar o site para um time de fora no meio do caminho. Identidade visual, tipografia e componentes ficam documentados, então a página seguinte nasce consistente com as anteriores. Serve para empresas cujo site não sustenta mais o que a empresa virou.",
    image: "images/services-design.jpg",
    imageAlt: "Notebook aberto em uma mesa de trabalho.",
    items: [
      {
        icon: IconPalette,
        label: "Identidade visual",
      },
      {
        icon: IconLayoutDashboard,
        label: "Design de interface",
      },
      {
        icon: IconBrowser,
        label: "Sites institucionais",
      },
      {
        icon: IconDevices,
        label: "Design responsivo",
      },
      {
        icon: IconFileDescription,
        label: "Landing pages de conversão",
      },
      {
        icon: IconBolt,
        label: "Desenvolvimento front-end",
      },
    ],
  },
  {
    id: "trafego",
    tab: "Tráfego Pago",
    tabIcon: IconTrendingUp,
    tag: "Conversão",
    title:
      "Gestão de tráfego pago no Google Ads e no Meta Ads, medida por custo por lead e não por alcance.",
    description:
      "A gente estrutura as campanhas na Rede de Pesquisa e no Performance Max do Google Ads e nos posicionamentos de Instagram e Facebook do Meta Ads. Oferta, público e página de destino ficam definidos antes de a campanha subir, e o desempenho é lido por CPL, CPA e ROAS em relatório mensal. Serve para empresas que já vendem e precisam de oportunidades que não dependam de indicação.",
    image: "images/services-trafego.jpg",
    imageAlt: "Dashboard com gráficos de desempenho.",
    items: [
      {
        icon: IconBrandGoogle,
        label: "Google Ads",
      },
      {
        icon: IconBrandMeta,
        label: "Meta Ads",
      },
      {
        icon: IconUsersGroup,
        label: "Remarketing e públicos",
      },
      {
        icon: IconFilter,
        label: "Otimização de conversão",
      },
      {
        icon: IconFlask,
        label: "Testes de anúncio e oferta",
      },
      {
        icon: IconReportAnalytics,
        label: "Relatório de CPL e ROAS",
      },
    ],
  },
];

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
  const TabIcon = service.tabIcon;

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
        <TabIcon className="size-space-5" stroke={ICON_STROKE} />
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
  const ItemIcon = item.icon;

  return (
    <div
      data-tab-item
      className="flex min-w-0 items-center gap-space-2 text-ink"
    >
      <span
        data-tab-item-icon
        className="flex size-space-5 shrink-0 items-center justify-center"
      >
        <ItemIcon className="size-space-5" stroke={ICON_STROKE} />
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

            {/*
             * Every service's title and description stack in one grid cell, so
             * the block is always as tall as the longest of them and switching
             * tabs cannot resize the card. A min-height would have to be a
             * per-breakpoint guess: which service is tallest changes with
             * width, because title and description wrap at different points.
             */}
            <div data-tab-copy-stack className="grid min-w-0">
              {services.map((entry) => (
                <div
                  key={entry.id}
                  aria-hidden={entry.id !== service.id}
                  className={[
                    "col-start-1 row-start-1 flex min-w-0 flex-col gap-space-3",

                    entry.id === service.id ? "" : "invisible",
                  ].join(" ")}
                >
                  <h3 className="text-heading-3 text-ink">{entry.title}</h3>

                  <p className="text-body text-ink">{entry.description}</p>
                </div>
              ))}
            </div>
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

          // The shared section-heading entrance: one `space-6` of rise, fixed
          // rather than a share of the heading's own height. See ProblemSection.
          // This one read `yPercent: PHI_SQUARED`, which moved it 2.5px.
          y: "var(--spacing-space-6)",

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

          {/* Names the three fronts outright instead of gesturing at them.
            * The paragraph it replaced ("Às vezes... Em outras...") never said
            * which services exist, so neither a search result nor an answer
            * engine could lift a sentence from it that stands on its own. */}
          <p data-intro className="text-subtitle text-muted">
            A Tessele trabalha em três frentes: estratégia e marketing, design e
            desenvolvimento e tráfego pago. Qual delas entra, e em que ordem,
            quem define é o diagnóstico do negócio.
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
