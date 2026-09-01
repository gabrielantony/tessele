"use client";

import { Fragment, useRef } from "react";

import { useGSAP } from "@gsap/react";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ---------------------------------------------------------------------------
   Geometry, in the 0-100 space of the diagram's square.

   Every position on this diagram derives from these four numbers -- the SVG
   reads them for its circle, spokes and arcs, and the cards read them for their
   `left`/`top`. Nothing measures a rendered box to place anything, which is what
   the previous orbit did: it derived the cards' inward offset from their
   rendered width at init, and that number went stale on every resize and was
   wrong on every viewport where the cards were taller than wide.
--------------------------------------------------------------------------- */
const CENTER_X = 50;
/*
 * The circle's centre sits below the square's, because the space around it is not
 * symmetric: one card stands above the circle and two below it, so the top edge
 * needs ORBIT_RADIUS + half a card of room while the bottom needs only
 * 0.707 * ORBIT_RADIUS + half a card. Centring the circle would spend that
 * difference as dead space at the bottom and take it out of the top card's
 * clearance -- which is where the escape measured 31px before this moved.
 */
const CENTER_Y = 55;
/*
 * The three numbers that set how much air the diagram has, and the order they
 * were tuned in: the circle carries the cards as far out as the tallest card
 * allows, the hub keeps its share of the middle small, and the spoke spans the
 * gap that opens up between them.
 *
 * The binding constraint is the top card, whose own edge reaches
 * ORBIT_RADIUS + half its height above the centre. The narrowest square this
 * layout runs at is ~496px, at exactly 1280px of viewport where the section
 * splits into two columns -- a card is ~25% of that square tall (title, three
 * lines of description, padding), which leaves ORBIT_RADIUS about 42. 37 keeps a
 * real margin, and `the diagram holds its cards and hub inside the square` in
 * tests/layout/sections/problem.spec.mjs is what measures it at every width.
 */
const ORBIT_RADIUS = 37;
// Half the hub's diameter: the hub is `sm:size-[24%]` of the square.
const HUB_RADIUS = 12;
const SPOKE_START = HUB_RADIUS + 4;
const SPOKE_END = 25.5;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Screen coordinates: y grows downward, so the sine is subtracted. 90deg is the
// top of the circle, and angles increase counter-clockwise on screen.
const pointAt = (angle: number, radius: number) => ({
  x: CENTER_X + radius * Math.cos(radians(angle)),
  y: CENTER_Y - radius * Math.sin(radians(angle)),
});

const trim = (value: number) => Math.round(value * 100) / 100;

const spokePath = (angle: number) => {
  const from = pointAt(angle, SPOKE_START);
  const to = pointAt(angle, SPOKE_END);

  return `M ${trim(from.x)} ${trim(from.y)} L ${trim(to.x)} ${trim(to.y)}`;
};

// How far the sequence travels around the circle to get from one card to the
// next, clockwise on screen -- which is the direction of decreasing angle.
const sweep = (from: number, to: number) => (((from - to) % 360) + 360) % 360;

const arcPath = (from: number, to: number) => {
  const start = pointAt(from, ORBIT_RADIUS);
  const end = pointAt(to, ORBIT_RADIUS);
  const largeArc = sweep(from, to) > 180 ? 1 : 0;

  return [
    `M ${trim(start.x)} ${trim(start.y)}`,
    `A ${ORBIT_RADIUS} ${ORBIT_RADIUS} 0 ${largeArc} 1 ${trim(end.x)} ${trim(end.y)}`,
  ].join(" ");
};

/*
 * The green line is hidden behind a dash gap as long as the line itself, and
 * drawing it is one property: `stroke-dashoffset` from its length to zero.
 *
 * The length is computed here rather than read from `getTotalLength()` at
 * runtime because half of these paths live in a `display: none` subtree at any
 * given viewport -- the circle below 640px, the vertical connectors above it --
 * and a geometry API on an unrendered element is not something to depend on.
 * Both shapes have a closed form anyway.
 */
const SPOKE_LENGTH = SPOKE_END - SPOKE_START;
const arcLength = (from: number, to: number) =>
  trim(ORBIT_RADIUS * radians(sweep(from, to)));

// The stacked layout below 640px: viewBox units of one connector, which is also
// the length of the line inside it.
const CONNECTOR = { width: 32, length: 40 } as const;

/*
 * Order is the sequence: each factor lights up in turn, and below 640px they
 * stack in this order too. Their place on the circle comes from `angle`, so the
 * arrangement in the design (Percepção on top, the other two below) is
 * independent of the order they animate in.
 */
const FACTORS = [
  {
    title: "Experiência",
    description: "o que elas sentem ao entrar em contato",
    angle: 225,
  },
  {
    title: "Percepção",
    description: "o que as pessoas imaginam sobre sua marca",
    angle: 90,
  },
  {
    title: "Confiança",
    description: "o que faz alguém escolher sua empresa",
    angle: 315,
  },
] as const;

/* Seconds. One factor lands every `step`; the loop holds on the completed
   circle, fades it out and starts over. */
const MOTION = {
  step: 1.6,
  pulse: 1.2,
  pulseStagger: 0.2,
  spoke: 0.5,
  card: 0.35,
  arc: 0.95,
  hold: 1.2,
  reset: 0.7,
} as const;

export default function ProblemSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!root.current) return;

      const fills = gsap.utils.toArray<SVGPathElement>("[data-fill]", root.current);
      const layers = gsap.utils.toArray<SVGGElement>("[data-fill-layer]", root.current);
      const rings = gsap.utils.toArray<HTMLElement>("[data-card-active]", root.current);
      const pulses = gsap.utils.toArray<HTMLElement>("[data-pulse]", root.current);

      if (fills.length === 0 || rings.length !== FACTORS.length) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /*
       * Nothing to undo: the resting markup IS the design's own state -- grey
       * dashed circle, no card lit -- because the green layer carries
       * `opacity="0"` and the cards' green ring `opacity-0` as attributes rather
       * than being put there by this hook. So a reduced-motion visitor, and a
       * visitor whose JS never runs, both get the diagram rather than a frame of
       * an animation that stopped.
       */
      if (reducedMotion) return;

      const lengthOf = (path: SVGPathElement) => Number(path.dataset.fillLength);

      const fillsFor = (index: number, kind: "spoke" | "arc") =>
        fills.filter(
          (path) =>
            path.dataset.fill === String(index) && path.dataset.fillKind === kind,
        );

      const loop = gsap.timeline({ repeat: -1, paused: true });

      /*
       * The cycle's own opening frame, at position 0 so it re-applies on every
       * repeat. Without it the second cycle would start with the arcs from the
       * first still drawn: each step resets only its own line, and steps 2 and 3
       * do not reach their reset until seconds into the cycle.
       */
      loop
        .set(fills, { strokeDasharray: (_index, path) => lengthOf(path) }, 0)
        .set(fills, { strokeDashoffset: (_index, path) => lengthOf(path) }, 0)
        .set(layers, { opacity: 1 }, 0)
        .set(rings, { opacity: 0 }, 0);

      FACTORS.forEach((_factor, index) => {
        const at = index * MOTION.step;
        const spokes = fillsFor(index, "spoke");
        const arcs = fillsFor(index, "arc");

        // The hub answers first, then the line leaves it.
        loop.fromTo(
          pulses,
          { scale: 1, opacity: 0.34 },
          {
            scale: 1.75,
            opacity: 0,
            duration: MOTION.pulse,
            ease: "power2.out",
            stagger: MOTION.pulseStagger,
          },
          at,
        );

        loop.to(
          spokes,
          { strokeDashoffset: 0, duration: MOTION.spoke, ease: "power2.out" },
          at + 0.1,
        );

        loop.to(
          rings[index],
          { opacity: 1, duration: MOTION.card, ease: "none" },
          at + 0.45,
        );

        // Only the circle layout has arcs; the stacked one has a single line per
        // step, so this leg is simply absent below 640px.
        if (arcs.length > 0) {
          loop.to(
            arcs,
            { strokeDashoffset: 0, duration: MOTION.arc, ease: "none" },
            at + 0.55,
          );
        }
      });

      const settled = FACTORS.length * MOTION.step + MOTION.hold;

      loop
        .to(layers, { opacity: 0, duration: MOTION.reset, ease: "none" }, settled)
        .to(rings, { opacity: 0, duration: MOTION.reset, ease: "none" }, settled);

      /*
       * Off-screen the loop is paused. A timeline that never stops costs battery
       * and CPU where nobody is looking, and this one runs for as long as the
       * page is open.
       */
      const gate = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive) loop.play();
          else loop.pause();
        },
      });

      // onToggle does not fire for a state that was already true at creation.
      if (gate.isActive) loop.play();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="overflow-x-clip bg-canvas px-page py-section"
    >
      <div className="mx-auto grid w-full max-w-wide grid-cols-1 items-center gap-space-10 xl:grid-cols-2 xl:gap-space-16">
        <div>
          <p className="inline-block rounded-base bg-highlight px-space-3 py-space-1-5 text-label text-ink uppercase">
            Quando tudo vira prioridade
          </p>

          {/* The nbsp is load-bearing: it ties the highlighted last word to the
            * one before it, so the heading can never end on a line holding only
            * "avançar." -- which is what it did at the width this column has from
            * lg up. `text-balance` evens the rag on top of that, where it is
            * supported; the tie does not depend on it. */}
          <h2 className="mt-space-4 max-w-copy text-heading-2 text-balance text-ink">
            Você testa, muda, publica, investe. Mas ainda fica difícil saber o
            que realmente faz a empresa&nbsp;
            <span className="text-highlight">avançar</span>.
          </h2>

          {/* The same tie as the heading above, on the closing phrase: without it
            * this paragraph's last line was "e orçamento." alone -- two words
            * split from the "tempo, equipe" they belong with. Gluing the whole
            * closing run moves the wrap earlier instead, so the last line reads
            * as a full phrase at every width this column takes. */}
          <p className="mt-space-4 max-w-copy text-lead text-muted">
            Uma campanha funciona por um tempo. O site recebe ajustes. O
            conteúdo continua saindo. Surge uma nova ideia e ela também entra
            na fila. Quando cada decisão nasce isolada, fica difícil separar o
            que merece mais investimento do que só está consumindo
            tempo,&nbsp;equipe&nbsp;e&nbsp;orçamento.
          </p>
        </div>

        {/*
          * Two layouts, one set of cards. From 640px the container is a square and
          * its children are placed on the circle by percentage; below it the same
          * children are a plain column with a dashed connector between each pair.
          *
          * The switch is there because the cards keep a fixed type size while the
          * square is fluid: three cards around a circle inside a 280px column is
          * the arrangement that produced a 14px uppercase word in a 72px box.
          */}
        <div
          data-diagram
          className="relative flex w-full max-w-narrow flex-col items-center gap-space-3 justify-self-center sm:block sm:aspect-square xl:justify-self-end"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 hidden size-full sm:block"
          >
            <g
              className="text-hairline"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
              strokeLinecap="round"
            >
              <circle cx={CENTER_X} cy={CENTER_Y} r={ORBIT_RADIUS} />

              {FACTORS.map((factor) => (
                <path key={factor.title} d={spokePath(factor.angle)} />
              ))}
            </g>

            {/* The green pass, drawn over the dashed one it replaces. */}
            <g
              data-fill-layer
              opacity="0"
              className="text-highlight"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.55"
              strokeLinecap="round"
            >
              {FACTORS.map((factor, index) => {
                const next = FACTORS[(index + 1) % FACTORS.length];

                return (
                  <Fragment key={factor.title}>
                    <path
                      data-fill={index}
                      data-fill-kind="spoke"
                      data-fill-length={SPOKE_LENGTH}
                      d={spokePath(factor.angle)}
                    />

                    <path
                      data-fill={index}
                      data-fill-kind="arc"
                      data-fill-length={arcLength(factor.angle, next.angle)}
                      d={arcPath(factor.angle, next.angle)}
                    />
                  </Fragment>
                );
              })}
            </g>
          </svg>

          {/*
            * The hub, and the two rings that leave it on every step.
            *
            * Same split as the cards below: `left`/`top` on the wrapper, which a
            * flow item ignores and an absolute one obeys, so one inline style
            * serves both layouts. Anything animated lives inside it, clear of the
            * centring translate GSAP would otherwise overwrite.
            */}
          <div
            style={{ left: `${CENTER_X}%`, top: `${CENTER_Y}%` }}
            className="w-full sm:absolute sm:w-[24%] sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div
              data-hub
              className="relative mx-auto size-space-32 sm:size-full sm:aspect-square"
            >
              <span
                data-pulse
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-highlight-soft opacity-0"
              />

              <span
                data-pulse
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-highlight-soft opacity-0"
              />

              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-highlight px-space-3 text-center">
                <p className="text-body-bold text-ink">Decisão de compra</p>
              </div>
            </div>
          </div>

          {FACTORS.map((factor, index) => {
            const place = pointAt(factor.angle, ORBIT_RADIUS);

            return (
              <Fragment key={factor.title}>
                {/* The stacked layout's line, one per step, same fill as a spoke. */}
                <div
                  aria-hidden="true"
                  className="h-space-10 w-space-8 shrink-0 sm:hidden"
                >
                  <svg viewBox={`0 0 ${CONNECTOR.width} ${CONNECTOR.length}`} className="size-full">
                    <path
                      className="text-hairline"
                      d={`M ${CONNECTOR.width / 2} 0 L ${CONNECTOR.width / 2} ${CONNECTOR.length}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                    />

                    <g data-fill-layer opacity="0" className="text-highlight">
                      <path
                        data-fill={index}
                        data-fill-kind="spoke"
                        data-fill-length={CONNECTOR.length}
                        d={`M ${CONNECTOR.width / 2} 0 L ${CONNECTOR.width / 2} ${CONNECTOR.length}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                </div>

                {/*
                  * Position and width live on this wrapper, the animation on the
                  * card inside it. GSAP writes `transform` when it moves a card,
                  * and that is the same property the centring translate uses.
                  */}
                <div
                  style={{ left: `${trim(place.x)}%`, top: `${trim(place.y)}%` }}
                  className="w-full sm:absolute sm:w-[34%] sm:-translate-x-1/2 sm:-translate-y-1/2"
                >
                  <div
                    data-factor-card
                    className="relative rounded-lg border border-hairline bg-surface px-space-4 py-space-4 text-center shadow-card"
                  >
                    <span
                      data-card-active
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-px rounded-lg border border-highlight bg-highlight-soft opacity-0"
                    />

                    <div className="relative">
                      <p className="text-small-bold text-ink uppercase">
                        {factor.title}
                      </p>

                      <p className="mt-space-2 text-small text-muted">
                        {factor.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
