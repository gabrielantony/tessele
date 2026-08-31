"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// useGSAP's `scope` resolves every selector below against this section, so the
// handlers address the CTA through data attributes instead of refs. Refs would
// work at runtime but cannot be read inside a function built during render —
// react-hooks/refs rejects it, and the scoped selector is the way around it.
const CTA = "[data-cta]";
const CTA_ICON = "[data-cta-icon]";
const CTA_ARROW = "[data-cta-arrow]";

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  const { contextSafe } = useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        return;
      }

      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 16,
        duration: 0.61,
        stagger: 0.089,
        ease: "power3.out",
        scrollTrigger: {
          trigger: root.current,
          start: "top 80%",
          once: true,
        },
      });
    },
    { scope: root },
  );

  // Read on every event rather than once: either preference can change
  // mid-session, and a hybrid device can switch pointer type.
  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Reduced motion keeps every state change — it just arrives without travel,
  // so the button still reads as pressed and as focused.
  const seconds = (value: number) => (prefersReducedMotion() ? 0 : value);

  const raise = (buttonEase: string, iconEase: string) => {
    gsap.to(CTA, {
      y: -3,
      scale: 1.012,
      duration: seconds(0.377),
      ease: buttonEase,
    });

    gsap.to(CTA_ICON, {
      scale: 1.035,
      duration: seconds(0.377),
      ease: iconEase,
    });
  };

  const settle = () => {
    gsap.to(CTA, {
      y: 0,
      scale: 1,
      duration: seconds(0.61),
      ease: "power3.out",
    });

    gsap.to(CTA_ICON, {
      scale: 1,
      duration: seconds(0.377),
      ease: "power3.out",
    });

    gsap.to(CTA_ARROW, {
      x: 0,
      duration: seconds(0.377),
      ease: "power3.out",
    });
  };

  const nudgeArrow = (from?: number) => {
    if (from === undefined) {
      gsap.to(CTA_ARROW, {
        x: 4,
        duration: seconds(0.233),
        ease: "power2.out",
      });
      return;
    }

    gsap.fromTo(
      CTA_ARROW,
      { x: from },
      { x: 4, duration: seconds(0.233), ease: "power2.out" },
    );
  };

  const handlePointerEnter = contextSafe(() => {
    // A tap fires pointerenter but frequently never fires pointerleave, which
    // would leave the button stuck in its raised state on a phone.
    if (!canHover()) return;
    raise("power3.out", "power3.out");
    nudgeArrow();
  });

  const handlePointerLeave = contextSafe(() => {
    if (!canHover()) return;
    settle();
  });

  const handlePointerDown = contextSafe(() => {
    gsap.to(CTA, {
      y: 0,
      scale: 0.985,
      duration: seconds(0.144),
      ease: "power2.out",
    });

    gsap.to(CTA_ICON, {
      scale: 0.94,
      duration: seconds(0.144),
      ease: "power2.out",
    });
  });

  const handlePointerUp = contextSafe(() => {
    // Releasing returns to the raised state only where a cursor can stay on the
    // button. On touch there is no hover to return to, so it goes back to rest.
    if (!canHover()) {
      settle();
      return;
    }

    raise("back.out(1.4)", "back.out(1.6)");
    nudgeArrow(1);
  });

  // A cancelled gesture — a scroll starting, the pointer captured elsewhere —
  // never produces pointerup, so the pressed state needs its own way out.
  const handlePointerCancel = contextSafe(() => settle());

  // Keyboard parity: focus and blur mirror hover, with no hover-capability gate.
  const handleFocus = contextSafe(() => {
    raise("power3.out", "power3.out");
    nudgeArrow();
  });

  const handleBlur = contextSafe(() => settle());

  return (
    <section
      ref={root}
      className="
        flex
        min-h-[48.75rem]
        w-full
        flex-col
        items-center
        justify-center
        gap-space-8
        overflow-hidden
        bg-canvas
        px-page
        py-section
      "
    >
      <div
        className="
          flex
          w-full
          max-w-narrow
          flex-col
          items-center
          gap-space-4
        "
      >
        <div
          data-reveal
          className="
            flex
            min-h-space-4
            w-full
            items-center
            justify-center
            gap-space-2
          "
        >
          <span
            aria-hidden="true"
            className="
              hidden
              size-space-1-5
              shrink-0
              rounded-full
              bg-highlight
              md:block
            "
          />

          <p
            className="
              text-label
              text-center
              uppercase
              text-muted
            "
          >
            ESTÚDIO DE MARKETING, DESIGN{" "}
            <br className="md:hidden" />
            E DESENVOLVIMENTO EM CURITIBA
          </p>
        </div>

        <div
          className="
            flex
            w-full
            flex-col
            items-center
            gap-space-4
          "
        >
          <h1
            data-reveal
            className="
              text-display
              font-display
              w-full
              text-balance
              text-center
              text-ink
            "
          >
            Sua empresa não precisa fazer mais. Precisa saber o que faz{" "}
            <span className="text-highlight">sentido</span> fazer agora.
          </h1>

          <p
            data-reveal
            className="
              text-lead
              w-full
              max-w-copy
              text-center
              text-muted
            "
          >
            Estratégia para escolher o caminho. Design e desenvolvimento para
            fazê-lo acontecer.
          </p>
        </div>
      </div>

      <a
        data-cta
        data-reveal
        href="#contato"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="
          flex
          h-[3.5rem]
          w-[18.125rem]
          shrink-0
          select-none
          items-center
          rounded-md
          bg-accent
          py-space-1
          pr-space-1
          pl-space-6
          outline-none
          will-change-transform

          focus-visible:ring-2
          focus-visible:ring-highlight
          focus-visible:ring-offset-4
          focus-visible:ring-offset-canvas
        "
      >
        <span
          className="
            flex
            h-full
            flex-1
            items-center
            justify-center
            overflow-visible
          "
        >
          <span
            className="
              text-action
              whitespace-nowrap
              text-on-accent
            "
          >
            Quero falar do meu projeto
          </span>
        </span>

        <span
          data-cta-icon
          className="
            ml-space-6
            flex
            size-space-12
            shrink-0
            items-center
            justify-center
            overflow-hidden
            rounded-base
            bg-surface
            text-accent
            will-change-transform
          "
        >
          <svg
            data-cta-arrow
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="will-change-transform"
          >
            <path
              d="M5 12H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M15 8L19 12L15 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>
    </section>
  );
}
