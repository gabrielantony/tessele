"use client";

import { useRef, useState, type RefObject } from "react";

import {
  IconAd2,
  IconArticle,
  IconBolt,
  IconBrowser,
  IconCode,
  IconDevices,
  IconFileDescription,
  IconFilter,
  IconFlag,
  IconFlask,
  IconLayoutDashboard,
  IconPalette,
  IconRadar,
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

/*
 * Ties the last two words of a run of text together, so no paragraph or heading
 * in this section can end on a line holding a single word.
 *
 * This lives in the render rather than in the strings for one reason: the same
 * `&nbsp;` typed by hand into the copy is a fix that survives exactly until the
 * next person edits the sentence and does not know the character is there. The
 * heading above the tabs still carries its own hand-typed tie, because that one
 * moves the wrap an extra word earlier than this rule needs.
 *
 * Tying only the last pair is enough: a non-breaking space cannot be broken, so
 * the pair either stays on the line it is on or moves down together. What it
 * does not promise is a pretty penultimate line -- it promises the last line is
 * never one word, which is what `no copy in the section ends on a widow` in
 * tests/layout/sections/services.spec.mjs measures.
 */
function noWidow(text: string) {
  return text.replace(/\s+(\S+)\s*$/u, "\u00A0$1");
}

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
      "Planejamento de marketing é, antes de tudo, decidir o que fica de fora.",
    description:
      "Antes de qualquer execução, a gente entende o momento da empresa: o que já está rodando, o que está travando e quais objetivos merecem atenção agora. Desse diagnóstico sai um plano de marketing com prioridades e canais definidos, e é ele que orienta conteúdo, redes sociais e campanhas. O marketing deixa de ser uma sequência de ações e passa a responder a decisões do negócio.",
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
      "Quem desenha o site é quem escreve o código, e a intenção chega inteira na tela.",
    description:
      "Da identidade visual ao site ou à interface de um produto, cada entrega parte do que a empresa precisa comunicar e do que as pessoas precisam conseguir fazer ali. UX/UI e desenvolvimento acontecem no mesmo projeto, do wireframe ao código em produção, então o que foi decidido no design não se perde na implementação. Tipografia, cores e componentes ficam documentados, e a próxima página nasce coerente com as anteriores.",
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
      "Anúncio não conserta oferta. Por isso a campanha é a última coisa a subir.",
    description:
      "A campanha parte de um objetivo, uma oferta, um público e uma página de destino que fazem sentido juntos. Só então ela sobe: Pesquisa e Performance Max no Google Ads, Instagram e Facebook no Meta Ads. Daí em diante a gente acompanha custo por lead, CPA e ROAS mês a mês, para saber o que merece escala e o que precisa mudar.",
    image: "images/Service-Ads-1.jpg",
    imageAlt: "Dashboard com gráficos de desempenho.",
    items: [
      {
        icon: IconAd2,
        label: "Google Ads e Meta Ads",
      },
      {
        icon: IconUsersGroup,
        label: "Remarketing e públicos",
      },
      {
        icon: IconRadar,
        label: "Rastreamento de conversões",
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
        "gap-space-2-5",
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
      className="flex min-w-0 items-center gap-space-2-5 text-ink"
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
                  <h3 className="text-heading-3 text-ink">
                    {noWidow(entry.title)}
                  </h3>

                  <p className="text-body text-ink">
                    {noWidow(entry.description)}
                  </p>
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

          <p data-intro className="text-subtitle text-muted">
            {noWidow(
              "Às vezes, o que precisa mudar é a forma como a empresa se apresenta. Em outras, é o site, o conteúdo ou a campanha que leva as pessoas até ela. O diagnóstico diz onde a gente entra.",
            )}
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
