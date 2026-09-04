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

/*
 * Written from the card end inward, which is the direction it draws: a line
 * revealed by `stroke-dashoffset` uncovers itself from the path's first point,
 * so the point order IS the direction of travel. The factor sends its answer to
 * the decision, not the other way round.
 */
const spokePath = (angle: number) => {
  const fromCard = pointAt(angle, SPOKE_END);
  const toHub = pointAt(angle, SPOKE_START);

  return `M ${trim(fromCard.x)} ${trim(fromCard.y)} L ${trim(toHub.x)} ${trim(toHub.y)}`;
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

/*
 * How much longer than the line the hiding gap is, in the same 0-100 units.
 *
 * A gap exactly as long as the line is not enough, for two reasons that both
 * showed up as a green stub sitting at the end of an arc before its step had
 * run. The closed forms above are a hair off what the renderer measures -- 9.5
 * against 9.5035 for a spoke -- and a `round` linecap paints a dash of any
 * length at all, however small, as a full-width dot. One unit of slack is ~300x
 * the error and costs nothing: the gap only has to be long enough to hide the
 * line, and the dash only long enough to cover it.
 */
const DASH_SLACK = 1;

// The stacked layout below 640px: viewBox units of one connector, which is also
// the length of the line inside it.
const CONNECTOR = { width: 32, length: 40 } as const;

/*
 * Array order is the sequence, and both layouts follow it: each factor lights
 * up in this order, and below 640px the stacked column reads top to bottom in
 * this same order -- the reader meets Experiência, then Percepção, then
 * Confiança, building up to the decision. `angle` is the one thing that does
 * not follow it: it says where a factor sits on the circle, which puts
 * Percepção at the top regardless of it being the second to light.
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

/*
 * The entrance the rest of the page already uses -- the same golden-ratio
 * durations and ease as OurProcessSection and ServicesSection carry, so this
 * section arrives the way its neighbours do instead of being the one block that
 * is simply already there when the page loads.
 */
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = 1 / PHI;
const PHI_SQUARED = PHI * PHI;

/*
 * One ladder of durations, each rung 1/phi of the one above it. The entrance and
 * the diagram's own sequence both step on it, so there is a single set of numbers
 * behind everything that moves here rather than a golden-ratio entrance next to a
 * handful of typed-in tenths -- which is what the sequence used to be, and why it
 * ran a second and a half longer than it needed to.
 */
const BEAT_LONG = PHI_INVERSE;
const BEAT = BEAT_LONG * PHI_INVERSE;
const BEAT_SHORT = BEAT * PHI_INVERSE;
const BEAT_TICK = BEAT_SHORT * PHI_INVERSE;

// The entrance's rungs, under the names the other sections give them.
const DURATION_PRIMARY = BEAT_LONG;
const DURATION_SECONDARY = BEAT;
const OVERLAP = BEAT_SHORT;

const ENTER_Y_PERCENT = PHI * 10;

function fibonacciEaseOut(progress: number) {
  return 1 - Math.pow(1 - progress, PHI_SQUARED);
}

/*
 * Seconds. One factor lands per step, and inside a step nothing overlaps: the
 * card lights, it sends its line in to the decision, and only then does the
 * circle carry on to the next factor. The loop holds on the closed circle, fades
 * it out and starts over.
 *
 * The direction is the point. The hub used to push a line out to each card and
 * sat green from the first frame, which read as the decision handing out its
 * reasons. It is the other way round: the hub rests grey and inert, each factor
 * feeds it in turn, and only once the circle closes does the decision light up
 * and get pressed.
 */
const MOTION = {
  // A beat before the step's first card starts to light.
  lead: BEAT_TICK,
  card: BEAT,
  // What the LONGEST line takes. Every other line takes its own length's share
  // of the same rate -- see DRAW_RATE below.
  draw: BEAT_LONG,
  // A beat of stillness on the finished factor before the next one starts.
  breath: BEAT_TICK,
  hubFill: BEAT_SHORT,
  press: BEAT_TICK,
  pressBack: BEAT,
  // 1/phi + 1/phi^2 is exactly 1, which is the rung the radar wants: long
  // enough to read as a sweep, short enough not to hold the cycle open.
  radar: BEAT_LONG + BEAT,
  radarStagger: BEAT_TICK,
  // Held on the closed circle after the radar has finished, before the reset.
  hold: BEAT_SHORT,
  reset: BEAT,
} as const;

const nextOf = (index: number) => FACTORS[(index + 1) % FACTORS.length];
const arcFor = (index: number) =>
  arcLength(FACTORS[index].angle, nextOf(index).angle);

/*
 * Every green line travels at the same rate, and its duration falls out of its
 * own length. A fixed duration per leg is what made the spokes drag: 9.5 units
 * in the same time an arc covers 87 is a fifth of the speed, on two lines the
 * eye reads as one signal continuing, and the slow one spent a third of a second
 * crossing a tenth of the diagram.
 *
 * The longest arc is the anchor -- it keeps the duration it had -- so nothing
 * got faster than what was already right, the short legs just stopped waiting.
 */
const LONGEST_ARC = Math.max(...FACTORS.map((_factor, index) => arcFor(index)));
const DRAW_RATE = LONGEST_ARC / MOTION.draw;
const drawTime = (length: number) => length / DRAW_RATE;

/*
 * Where each leg of a step begins, relative to the step's own start -- derived
 * rather than typed, because "derived" is the property under discussion: each
 * one starts exactly where the previous one ends, and STEP is long enough that
 * the next factor's card cannot light while this one's line is still drawing.
 *
 * STEP is sized on `draw` because the longest arc is the longest thing drawn in
 * any step -- the stacked column's connector is 40 units of its own 32x40
 * viewBox and comes in well under it.
 */
const CARD_AT = MOTION.lead;
const INBOUND_AT = CARD_AT + MOTION.card;
const OUTBOUND_AT = INBOUND_AT + drawTime(SPOKE_LENGTH);
const STEP = OUTBOUND_AT + MOTION.draw + MOTION.breath;

export default function ProblemSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!root.current) return;

      const fills = gsap.utils.toArray<SVGPathElement>("[data-fill]", root.current);
      const layers = gsap.utils.toArray<SVGGElement>("[data-fill-layer]", root.current);
      const rings = gsap.utils.toArray<HTMLElement>("[data-card-active]", root.current);
      const pulses = gsap.utils.toArray<HTMLElement>("[data-pulse]", root.current);
      const hubButton = gsap.utils.toArray<HTMLElement>("[data-hub-button]", root.current);
      const hubFill = gsap.utils.toArray<HTMLElement>("[data-hub-fill]", root.current);

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

      // `in` is the line the hub sends to a card, `out` the one that leaves it
      // -- the circle's arc, or the stacked column's connector.
      const fillsFor = (index: number, kind: "in" | "out") =>
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
       *
       * The dash goes on as an ATTRIBUTE, not as a style, and that is the whole
       * fix for two things at once. Written as a style, GSAP picks up the `px`
       * unit from the computed value and rounds every frame to a whole pixel:
       * the resting offset came out at 87 against a dash of 87.18, which left
       * that 0.18 painted -- a green dot at the end of an arc from the first
       * frame of the cycle -- and the draw itself advanced in 1-unit steps,
       * which on a 9.5-unit spoke is ten of them. The attribute takes the number
       * it is given.
       */
      loop
        .set(
          fills,
          {
            attr: {
              "stroke-dasharray": (_index: number, path: SVGPathElement) =>
                `${lengthOf(path)} ${lengthOf(path) + DASH_SLACK}`,
              "stroke-dashoffset": (_index: number, path: SVGPathElement) =>
                lengthOf(path),
            },
          },
          0,
        )
        .set(layers, { opacity: 1 }, 0)
        .set(rings, { opacity: 0 }, 0)
        .set(hubFill, { opacity: 0 }, 0)
        .set(hubButton, { scale: 1 }, 0);

      FACTORS.forEach((_factor, index) => {
        const at = index * STEP;
        const inbound = fillsFor(index, "in");
        const outbound = fillsFor(index, "out");

        // The card first, always: it is what the line that follows comes from.
        loop.to(
          rings[index],
          { opacity: 1, duration: MOTION.card, ease: "none" },
          at + CARD_AT,
        );

        /*
         * Both legs are tweened at every viewport, because both exist in the DOM
         * at every viewport -- one layout's paths are the ones inside the subtree
         * that is `display: none`. What differs is which leg is visible: the
         * circle shows the lit card feeding the hub and then the arc carrying on
         * to the next factor; the stacked column has no line to the hub in the
         * middle, so what it shows is the card and the connector under it.
         */
        /*
         * One tween per path rather than one per leg, because a tween carries a
         * single duration and each line's duration is now its own length's. The
         * ease stays linear: a line that eases lurches and then crawls, and at a
         * shared rate the legs read as one signal continuing through the diagram.
         */
        inbound.forEach((path) => {
          loop.to(
            path,
            {
              attr: { "stroke-dashoffset": 0 },
              duration: drawTime(lengthOf(path)),
              ease: "none",
            },
            at + INBOUND_AT,
          );
        });

        outbound.forEach((path) => {
          loop.to(
            path,
            {
              attr: { "stroke-dashoffset": 0 },
              duration: drawTime(lengthOf(path)),
              ease: "none",
            },
            at + OUTBOUND_AT,
          );
        });
      });

      /*
       * The instant the last arc closes the circle, the decision is made: the
       * grey hub takes its green, gets tapped -- a quick press-down that springs
       * back with an overshoot -- and the radar goes out from under it.
       *
       * This is the only moment the radar fires. It used to ping on every step
       * as well, which is what made it read as faint: three quiet pings and then
       * a fourth barely louder one. One ring, once, at full strength.
       */
      const completeAt =
        (FACTORS.length - 1) * STEP +
        OUTBOUND_AT +
        drawTime(arcFor(FACTORS.length - 1));

      loop
        .to(
          hubFill,
          { opacity: 1, duration: MOTION.hubFill, ease: "power2.out" },
          completeAt,
        )
        .to(
          hubButton,
          { scale: 0.92, duration: MOTION.press, ease: "power1.out" },
          completeAt,
        )
        .to(
          hubButton,
          { scale: 1, duration: MOTION.pressBack, ease: "back.out(3)" },
          completeAt + MOTION.press,
        )
        .fromTo(
          pulses,
          // 0.5 was the wash that read as absent; 0.8 is the same wash, more of
          // it. Scale stays at 2.2: below 640px the hub is a fixed 8rem in a
          // column that can be 280px wide, and a wider sweep than this reaches
          // the clip at the section's edge.
          { scale: 1, opacity: 0.8 },
          {
            scale: 2.2,
            opacity: 0,
            duration: MOTION.radar,
            ease: "power2.out",
            stagger: MOTION.radarStagger,
          },
          completeAt + MOTION.press,
        );

      /*
       * When the cycle is allowed to end, derived from the finale rather than
       * typed: the last ring has to finish expanding before anything fades, or
       * the beat the whole sequence builds to is the one that gets cut off. The
       * ring count comes from the DOM so adding a ring cannot leave this stale.
       */
      const radarEnd =
        completeAt +
        MOTION.press +
        MOTION.radar +
        MOTION.radarStagger * Math.max(0, pulses.length - 1);

      const settled = Math.max(FACTORS.length * STEP, radarEnd) + MOTION.hold;

      loop
        .to(layers, { opacity: 0, duration: MOTION.reset, ease: "none" }, settled)
        .to(rings, { opacity: 0, duration: MOTION.reset, ease: "none" }, settled)
        .to(hubFill, { opacity: 0, duration: MOTION.reset, ease: "none" }, settled);

      /*
       * Off-screen the loop is paused. A timeline that never stops costs battery
       * and CPU where nobody is looking, and this one runs for as long as the
       * page is open.
       *
       * It also waits for the entrance below: `arrived` is what keeps the
       * sequence from being already two steps deep by the time the diagram has
       * finished fading in. The gate starts where the entrance does -- `top 75%`
       * rather than `top bottom` -- for the same reason: the section is read
       * from there, and a cycle spent below the fold is one nobody sees.
       */
      let arrived = false;

      const gate = ScrollTrigger.create({
        trigger: root.current,
        start: "top 75%",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive && arrived) loop.play();
          else loop.pause();
        },
      });

      /*
       * The entrance. Every other section on the page fades and lifts into place
       * on the way in, and this one did not -- it was simply there, which is the
       * seam a visitor notices on a refresh that lands mid-page.
       *
       * `from` tweens on purpose: the resting markup is the finished state, so a
       * reduced-motion visitor (who returns above, before any of this is built)
       * and a visitor whose JS never runs both get the section as designed rather
       * than an opacity 0 they need a timeline to undo.
       *
       * The diagram travels as one box -- `y` on the container, not on the cards.
       * The cards' own `left`/`top` centring lives in a transform on their
       * wrappers, and a second transform written there would overwrite it.
       */
      const entrance = gsap.timeline({
        defaults: { ease: fibonacciEaseOut },
        scrollTrigger: {
          trigger: root.current,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
        onComplete: () => {
          arrived = true;
          if (gate.isActive) loop.play();
        },
      });

      entrance
        .from("[data-eyebrow]", {
          opacity: 0,
          yPercent: ENTER_Y_PERCENT,
          duration: DURATION_SECONDARY,
        })
        .from(
          "[data-heading]",
          {
            opacity: 0,
            // The section-heading entrance, shared by every section on the page:
            // one `space-6` of rise. A FIXED distance, not a share of the
            // heading's own height -- as a percentage this heading travelled
            // 38px while the one-line heading in the footer travelled 2.5px,
            // which is the spread this replaced. Change it here and you have
            // changed one section, not the page: the value is repeated in each,
            // because a section in this codebase is self-contained.
            y: "var(--spacing-space-6)",
            duration: DURATION_PRIMARY,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-intro]",
          {
            opacity: 0,
            yPercent: ENTER_Y_PERCENT,
            duration: DURATION_SECONDARY,
          },
          `-=${OVERLAP}`,
        )
        .from(
          "[data-diagram]",
          {
            opacity: 0,
            y: "var(--spacing-space-6)",
            duration: DURATION_PRIMARY,
          },
          `-=${OVERLAP}`,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-analytics-section="problema"
      className="overflow-x-clip bg-canvas px-page py-section"
    >
      <div className="mx-auto grid w-full max-w-wide grid-cols-1 items-center gap-space-10 xl:grid-cols-2 xl:gap-space-16">
        <div>
          <p
            data-eyebrow
            className="inline-block rounded-base bg-highlight px-space-3 py-space-1-5 text-label text-ink uppercase"
          >
            Quando tudo vira prioridade
          </p>

          {/* The nbsp is load-bearing: it ties the highlighted last word to the
            * one before it, so the heading can never end on a line holding only
            * "avançar." -- which is what it did at the width this column has from
            * lg up. `text-balance` evens the rag on top of that, where it is
            * supported; the tie does not depend on it. */}
          <h2
            data-heading
            className="mt-space-4 max-w-copy text-heading-2 text-balance text-ink"
          >
            Você testa, muda, publica, investe. Mas ainda fica difícil saber o
            que realmente faz a empresa&nbsp;
            <span className="text-highlight">avançar</span>.
          </h2>

          {/* The same tie as the heading above, on the closing phrase: without it
            * this paragraph's last line was "e orçamento." alone -- two words
            * split from the "tempo, equipe" they belong with. Gluing the whole
            * closing run moves the wrap earlier instead, so the last line reads
            * as a full phrase at every width this column takes. */}
          <p data-intro className="mt-space-4 max-w-copy text-subtitle text-muted">
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
              {FACTORS.map((factor, index) => ((
                  <Fragment key={factor.title}>
                    <path
                      data-fill={index}
                      data-fill-kind="in"
                      data-fill-length={SPOKE_LENGTH}
                      d={spokePath(factor.angle)}
                    />

                    <path
                      data-fill={index}
                      data-fill-kind="out"
                      data-fill-length={arcFor(index)}
                      d={arcPath(factor.angle, nextOf(index).angle)}
                    />
                  </Fragment>
                )))}
            </g>
          </svg>

          {/*
            * The hub, and the two rings that leave it on every step.
            *
            * Same split as the cards below: `left`/`top` on the wrapper, which a
            * flow item ignores and an absolute one obeys, so one inline style
            * serves both layouts. Anything animated lives inside it, clear of the
            * centring translate GSAP would otherwise overwrite.
            *
            * `order-last` is the mobile-only exception: the hub stays the JSX's
            * first flex child (so it keeps painting under the cards if their
            * boxes ever touch) but the reader sees it at the very bottom, after
            * what it is the sum of. `order-*` only takes hold while the parent
            * is actually `display: flex` -- true below `sm`, where this wrapper
            * is a flow item -- so it is inert from `sm` up, where the wrapper is
            * `sm:absolute` and stops participating in flex layout at all.
            */}
          <div
            style={{ left: `${CENTER_X}%`, top: `${CENTER_Y}%` }}
            className="order-last w-full sm:absolute sm:w-[24%] sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div
              data-hub
              className="relative mx-auto size-space-32 sm:size-full sm:aspect-square"
            >
              {/* The radar: a soft wash expanding out of the hub, not a hard
                * ring. A 2px stroke in the solid green had the presence and none
                * of the softness -- what carries this is the tint, and it only
                * ever needed a little more of it. The strength now lives in the
                * `fromTo` below, which is where a value can be nudged without
                * changing what the thing is. */}
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

              {/*
                * Grey until the circle closes. The green is an overlay at
                * opacity 0 rather than a colour this hook swaps, for the same
                * reason the cards' ring and the SVG's green layer are: the
                * resting markup is the design's own state, so a reduced-motion
                * visitor and a visitor whose JS never runs both get the diagram
                * before the decision is made, not a frame of one that stopped.
                */}
              <div
                data-hub-button
                className="absolute inset-0 overflow-hidden rounded-full bg-control-disabled"
              >
                <span
                  data-hub-fill
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-highlight opacity-0"
                />

                <div className="relative flex size-full items-center justify-center px-space-3 text-center">
                  <p className="text-body-bold text-ink">Decisão de compra</p>
                </div>
              </div>
            </div>
          </div>

          {FACTORS.map((factor, index) => {
            const place = pointAt(factor.angle, ORBIT_RADIUS);

            return (
              <Fragment key={factor.title}>
                {/*
                  * Position and width live on this wrapper, the animation on the
                  * card inside it. GSAP writes `transform` when it moves a card,
                  * and that is the same property the centring translate uses.
                  *
                  * Rendered before its own connector so the stacked layout's line
                  * trails the card instead of leading it: with the hub moved to
                  * the end (see `data-hub`), a leading line on the first card
                  * would dangle above nothing. A trailing line always has
                  * something to lead into -- the next factor, or the hub for
                  * whichever factor is last -- so nothing needs hiding.
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

                {/* The stacked layout's line, one per step. It is the outbound
                  * leg -- the same role the circle's arc plays -- so it carries
                  * the same `out` kind and the same slot in the step: it draws
                  * only once this factor's card has finished lighting, and reads
                  * as that light continuing on toward whatever comes next. */}
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
                        data-fill-kind="out"
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
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
