"use client";

import { useRef } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger);

const FIBONACCI = {
  orbitDuration: 21,
  pulseDuration: 2.33,
  pulseDelay: 1.44,
  pulseRepeatDelay: 1.44,
  pulseScale: 1.618,
  pulseOpacity: 0.34,
} as const;

const orbitItems = [
  {
    title: "Percepção",
    description: "o que as pessoas imaginam sobre sua marca",
  },
  {
    title: "Confiança",
    description: "o que faz alguém escolher sua empresa",
  },
  {
    title: "Experiência",
    description: "o que elas sentem ao entrar em contato",
  },
];

export default function ProblemSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const rotor =
        root.current?.querySelector<HTMLElement>("[data-orbit-rotor]");

      const orbitSlots = gsap.utils.toArray<HTMLElement>("[data-orbit-slot]", root.current);

      const orbitCards = gsap.utils.toArray<HTMLElement>("[data-orbit-card]", root.current);

      const pulses =
        gsap.utils.toArray<HTMLElement>("[data-pulse]", root.current);

      if (!rotor || orbitSlots.length === 0 || orbitCards.length === 0) {
        return;
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const angleStep = 360 / orbitSlots.length;

      CustomEase.create(
        "fibonacciFlow",
        "M0,0 C0.13,0.55 0.34,1 1,1",
      );

      /*
       * Cada slot ocupa a área da órbita, mas o conteúdo fica
       * preso ao topo. Isso impede o flex de esticar os cards.
       */
      gsap.set(orbitSlots, {
        rotation: (index) => index * angleStep,
        transformOrigin: "50% 50%",
      });

      /*
       * O deslocamento coloca o centro do card sobre a linha
       * da órbita sem deixá-lo sair do quadrado. A rotação inversa mantém o
       * texto sempre reto.
       */
      gsap.set(orbitCards, {
        yPercent: -50,
        rotation: (index) => -(index * angleStep),
        transformOrigin: "50% 50%",
      });

      const updateOrbitCardOffset = () => {
        gsap.set(orbitCards, {
          marginTop: (_index, card) =>
            Math.max(card.offsetWidth, card.offsetHeight) / 2 -
            parseFloat(getComputedStyle(rotor).insetInlineStart),
        });
      };

      updateOrbitCardOffset();

      const orbitResizeObserver = new ResizeObserver(updateOrbitCardOffset);
      orbitResizeObserver.observe(rotor);

      gsap.set(rotor, { transformOrigin: "50% 50%" });

      gsap.set(pulses, {
        opacity: 0,
        scale: 1,
        transformOrigin: "50% 50%",
      });

      if (prefersReducedMotion) {
        return () => orbitResizeObserver.disconnect();
      }

      /*
       * O rotor e a compensação dos cards vivem na MESMA timeline. Como dois
       * tweens infinitos separados, eles dependiam de continuar em fase por
       * 21s para sempre — e qualquer deriva entre os dois inclina o texto
       * progressivamente. Um relógio só não pode sair de fase consigo mesmo.
       */
      const orbit = gsap
        .timeline({ repeat: -1, paused: true })
        .to(rotor, {
          rotation: 360,
          duration: FIBONACCI.orbitDuration,
          ease: "none",
        }, 0)
        .to(orbitCards, {
          rotation: "-=360",
          duration: FIBONACCI.orbitDuration,
          ease: "none",
        }, 0);

      const pulseTweens = pulses.map((pulse, index) =>
        gsap.fromTo(
          pulse,
          {
            opacity: FIBONACCI.pulseOpacity,
            scale: 1,
          },
          {
            opacity: 0,
            scale: FIBONACCI.pulseScale,
            duration: FIBONACCI.pulseDuration,
            delay: index * FIBONACCI.pulseDelay,
            repeat: -1,
            repeatDelay: FIBONACCI.pulseRepeatDelay,
            ease: "fibonacciFlow",
            paused: true,
          },
        ),
      );

      const running = [orbit, ...pulseTweens];

      /*
       * Sem isto a órbita gira para sempre, inclusive com a seção fora da tela
       * — uma animação de transform contínua que nunca para custa bateria e
       * CPU num lugar onde ninguém está olhando.
       */
      const gate = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          for (const animation of running) {
            if (self.isActive) animation.play();
            else animation.pause();
          }
        },
      });

      // onToggle não dispara para um estado que já era verdadeiro na criação.
      if (gate.isActive) {
        for (const animation of running) animation.play();
      }

      return () => orbitResizeObserver.disconnect();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="bg-canvas px-page py-section"
    >
      <div className="mx-auto grid w-full max-w-wide grid-cols-1 items-center gap-space-12 lg:grid-cols-2 lg:gap-space-24">
        <div>
          <p className="inline-block rounded-base bg-highlight px-space-3 py-space-1-5 text-label text-ink uppercase">
            Quando tudo vira prioridade
          </p>

          <h2 className="mt-space-6 max-w-copy text-heading-2 text-ink">
            Você testa, muda, publica, investe. Mas ainda fica difícil saber o
            que realmente faz a empresa{" "}
            <span className="text-highlight">avançar</span>.
          </h2>

          <p className="mt-space-8 max-w-copy text-lead text-muted">
            Uma campanha funciona por um tempo. O site recebe ajustes. O
            conteúdo continua saindo. Surge uma nova ideia e ela também entra
            na fila. Quando cada decisão nasce isolada, fica difícil separar o
            que merece mais investimento do que só está consumindo tempo,
            equipe e orçamento.
          </p>
        </div>

        <div className="relative aspect-square w-full max-w-narrow justify-self-center lg:justify-self-end">
          {/* Órbita fixa */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-space-8 h-auto w-auto text-hairline"
          >
            <circle
              cx="50"
              cy="50"
              r="49"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />
          </svg>

          {/* Elementos que percorrem a órbita */}
          <div
            data-orbit-rotor
            className="pointer-events-none absolute inset-space-8"
          >
            {orbitItems.map((item) => (
              <div
                key={item.title}
                data-orbit-slot
                className="absolute inset-space-0 flex items-start justify-center"
              >
                <div
                  data-orbit-card
                  className="w-space-24 shrink-0 rounded-lg border border-hairline bg-surface px-space-3 py-space-3 text-center shadow-card sm:w-space-32 sm:px-space-4 sm:py-space-4 lg:w-space-40 lg:px-space-5 lg:py-space-5"
                >
                  <p className="text-small-bold text-ink uppercase">
                    {item.title}
                  </p>

                  <p className="mt-space-2 text-small text-muted">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Conexões fixas com o centro */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-space-8 h-auto w-auto text-hairline"
          >
            <line
              x1="50"
              y1="40"
              x2="50"
              y2="18"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />

            <line
              x1="41"
              y1="55"
              x2="22"
              y2="67"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />

            <line
              x1="59"
              y1="55"
              x2="78"
              y2="67"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />
          </svg>

          {/* Centro */}
          <div className="pointer-events-none absolute inset-space-0 flex items-center justify-center">
            <div
              data-pulse
              aria-hidden="true"
              className="absolute size-space-24 rounded-full bg-highlight-soft sm:size-space-32 lg:size-space-40"
            />

            <div
              data-pulse
              aria-hidden="true"
              className="absolute size-space-24 rounded-full bg-highlight-soft sm:size-space-32 lg:size-space-40"
            />

            <div className="relative flex size-space-24 items-center justify-center rounded-full bg-highlight px-space-3 text-center sm:size-space-32 sm:px-space-5 lg:size-space-40 lg:px-space-6">
              <p className="text-body-bold text-ink">
                Decisão de compra
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
