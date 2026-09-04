"use client";

import { useRef, useState } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type FAQItemData = {
  question: string;
  answer: string;
};

const faqItems: FAQItemData[] = [
  {
    question: "Como funciona o primeiro contato com a Tessele?",
    answer:
      "O primeiro contato serve para entender o que está acontecendo na empresa, o que motivou a busca pela Tessele e qual resultado vocês esperam alcançar. A partir dessa conversa, conseguimos avaliar se faz mais sentido um projeto específico ou um acompanhamento contínuo e definir os próximos passos.",
  },
  {
    question: "Como vocês definem o que minha empresa realmente precisa?",
    answer:
      "Antes de sugerir qualquer entrega, a gente procura entender o momento da empresa, o que já está sendo feito, onde estão os gargalos e quais objetivos precisam de mais atenção. A partir dessa leitura, conseguimos definir quais ações fazem sentido agora e quais podem esperar.",
  },
  {
    question:
      "Posso contratar a Tessele para um projeto específico ou apenas para acompanhamento mensal?",
    answer:
      "Sim. A Tessele pode entrar tanto em projetos específicos quanto em acompanhamentos recorrentes. Um site, uma landing page, uma identidade visual ou uma campanha podem ser desenvolvidos como projetos pontuais. Quando existe uma necessidade contínua de marketing, conteúdo, tráfego ou design, o acompanhamento mensal costuma fazer mais sentido.",
  },
  {
    question:
      "Quais tipos de projetos de marketing, design e desenvolvimento vocês realizam?",
    answer:
      "A Tessele atua em estratégia e marketing, design e desenvolvimento e tráfego pago. Isso pode incluir gestão de redes sociais, campanhas, criação de conteúdo, identidade visual, materiais comerciais, sites institucionais, landing pages, interfaces, automações e gestão de mídia paga.",
  },
  {
    question: "A Tessele atende empresas fora de Curitiba?",
    answer:
      "Sim. Apesar de a Tessele estar em Curitiba, boa parte do trabalho pode acontecer de forma remota. Reuniões, planejamento, acompanhamento e desenvolvimento dos projetos podem ser conduzidos online, o que permite atender empresas de outras cidades e estados.",
  },
  {
    question:
      "Depois que o projeto começa, como funciona o acompanhamento e a comunicação com a equipe?",
    answer:
      "A comunicação acontece ao longo de todo o trabalho, com reuniões e pontos de acompanhamento definidos de acordo com o projeto ou plano contratado. Assim, conseguimos compartilhar andamento, validar decisões, receber feedbacks e ajustar prioridades sem perder o contexto do que está sendo construído.",
  },
];

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

const ICON_BAR_LENGTH = 9.9;
const ICON_BAR_SCALE_OPEN = 12 / 7;

function AnimatedFAQIcon({ open }: { open: boolean }) {
  const barClass =
    "absolute left-1/2 top-1/2 h-0.5 rounded-full bg-current transition-[translate,scale,color] duration-[var(--duration-slow)] ease-[var(--ease-fluid)] motion-reduce:transition-none";

  return (
    <span
      className={`relative flex size-space-6 shrink-0 items-center justify-center ${
        open ? "text-accent" : "text-muted"
      }`}
      aria-hidden="true"
    >
      <span
        className={barClass}
        style={{
          width: `${ICON_BAR_LENGTH}px`,
          rotate: "45deg",
          translate: open
            ? "-50% -50%"
            : "calc(-50% - 3.5px) calc(-50% + 0.5px)",
          scale: open ? `${ICON_BAR_SCALE_OPEN} 1` : "1 1",
        }}
      />

      <span
        className={barClass}
        style={{
          width: `${ICON_BAR_LENGTH}px`,
          rotate: "-45deg",
          translate: open
            ? "-50% -50%"
            : "calc(-50% + 3.5px) calc(-50% + 0.5px)",
          scale: open ? `${ICON_BAR_SCALE_OPEN} 1` : "1 1",
        }}
      />
    </span>
  );
}

function FAQItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: FAQItemData;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const triggerId = `faq-trigger-${index}`;
  const answerId = `faq-answer-${index}`;

  return (
    <div
      data-faq-item
      className={`relative w-full rounded-md bg-canvas transition-[box-shadow] duration-[var(--duration-slow)] ease-[var(--ease-fluid)] motion-reduce:transition-none ${
        isOpen ? "shadow-lifted" : ""
      }`}
    >
      <div className="p-space-5">
        <button
          id={triggerId}
          type="button"
          onClick={onToggle}
          className="flex w-full cursor-pointer items-start gap-space-4 rounded-base text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
          aria-expanded={isOpen}
          aria-controls={answerId}
        >
          <span
            className={`min-w-0 flex-1 text-ink ${
              isOpen ? "text-body-bold" : "text-body"
            }`}
          >
            {item.question}
          </span>

          <AnimatedFAQIcon open={isOpen} />
        </button>

        <div
          id={answerId}
          role="region"
          aria-labelledby={triggerId}
          aria-hidden={!isOpen}
          onTransitionEnd={(event) => {
            if (event.propertyName === "grid-template-rows") {
              ScrollTrigger.refresh();
            }
          }}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-[var(--duration-slow)] ease-[var(--ease-fluid)] motion-reduce:transition-none ${
            isOpen
              ? "mt-space-2 grid-rows-[1fr] opacity-100"
              : "mt-space-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="w-full pr-space-10 text-body text-ink">
              {item.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const root = useRef<HTMLElement>(null);
  const [openItem, setOpenItem] = useState<number | null>(null);

  useGSAP(
    () => {
      if (!root.current) {
        return;
      }

      const selector = gsap.utils.selector(root);

      const revealTargets = selector("[data-reveal]");

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(revealTargets, {
          clearProps: "all",
        });

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
        .from("[data-faq-heading]", {
          opacity: 0,
          // The shared section-heading entrance: one `space-6` of rise, fixed
          // rather than a share of the heading's own height. See ProblemSection.
          y: "var(--spacing-space-6)",
          duration: DURATION_PRIMARY,
        })
        .from(
          "[data-faq-copy]",
          {
            autoAlpha: 0,
            yPercent: 8,
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-faq-stack]",
          {
            autoAlpha: 0,
            yPercent: 6,
            duration: DURATION_PRIMARY,
          },
          `-=${OVERLAP}`,
        );
    },
    { scope: root },
  );

  const handleToggle = (index: number) => {
    setOpenItem((current) => (current === index ? null : index));

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  };

  return (
    <section
      ref={root}
      data-analytics-section="faq"
      id="faq"
      aria-labelledby="faq-heading"
      className="bg-canvas px-page py-section"
    >
      <div className="mx-auto grid w-full max-w-wide items-start gap-space-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-space-20">
        <div>
          <h2
            id="faq-heading"
            data-reveal
            data-faq-heading
            className="max-w-copy text-heading-2 text-ink"
          >
            O que você pode querer saber antes de{" "}
            {/* The closing run is glued whole rather than only its last two
              * words: "Tessele." was alone on the fourth line through the
              * 1024-1141px band, and tying just "a Tessele." would have left
              * "com" hanging at the end of the line above. */}
            <span className="text-highlight">começar</span> com&nbsp;a&nbsp;Tessele.
          </h2>

          <p
            data-reveal
            data-faq-copy
            className="mt-space-4 max-w-copy text-subtitle text-muted"
          >
            Reunimos aqui as respostas para as dúvidas mais comuns sobre
            projetos, acompanhamento, escopo e a forma como a Tessele trabalha.
          </p>
        </div>

        <div
          data-reveal
          data-faq-stack
          className="isolate flex w-full flex-col gap-space-2 rounded-lg bg-surface-sunken p-space-2"
        >
          {faqItems.map((item, index) => (
            <FAQItem
              key={item.question}
              item={item}
              index={index}
              isOpen={openItem === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
