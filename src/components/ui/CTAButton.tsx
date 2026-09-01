"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

type CTAButtonProps = {
  href: string;
  label: string;
  variant?: "accent" | "on-dark";
};

export default function CTAButton({
  href,
  label,
  variant = "accent",
}: CTAButtonProps) {
  const root = useRef<HTMLAnchorElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const { contextSafe } = useGSAP({ scope: root });

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
    if (!root.current || !icon.current) return;

    gsap.to(root.current, {
      y: -3,
      scale: 1.012,
      duration: seconds(0.377),
      ease: buttonEase,
    });

    gsap.to(icon.current, {
      scale: 1.035,
      duration: seconds(0.377),
      ease: iconEase,
    });
  };

  const settle = () => {
    if (!root.current || !icon.current || !arrow.current) return;

    gsap.to(root.current, {
      y: 0,
      scale: 1,
      duration: seconds(0.61),
      ease: "power3.out",
    });

    gsap.to(icon.current, {
      scale: 1,
      duration: seconds(0.377),
      ease: "power3.out",
    });

    gsap.to(arrow.current, {
      x: 0,
      duration: seconds(0.377),
      ease: "power3.out",
    });
  };

  const nudgeArrow = (from?: number) => {
    if (!arrow.current) return;

    if (from === undefined) {
      gsap.to(arrow.current, {
        x: 4,
        duration: seconds(0.233),
        ease: "power2.out",
      });
      return;
    }

    gsap.fromTo(
      arrow.current,
      { x: from },
      { x: 4, duration: seconds(0.233), ease: "power2.out" },
    );
  };

  const handlePointerEnter = () => {
    contextSafe(() => {
      // A tap fires pointerenter but frequently never fires pointerleave, which
      // would leave the button stuck in its raised state on a phone.
      if (!canHover()) return;
      raise("power3.out", "power3.out");
      nudgeArrow();
    })();
  };

  const handlePointerLeave = () => {
    contextSafe(() => {
      if (!canHover()) return;
      settle();
    })();
  };

  const handlePointerDown = () => {
    contextSafe(() => {
      if (!root.current || !icon.current) return;

      gsap.to(root.current, {
        y: 0,
        scale: 0.985,
        duration: seconds(0.144),
        ease: "power2.out",
      });

      gsap.to(icon.current, {
        scale: 0.94,
        duration: seconds(0.144),
        ease: "power2.out",
      });
    })();
  };

  const handlePointerUp = () => {
    contextSafe(() => {
      // Releasing returns to the raised state only where a cursor can stay on the
      // button. On touch there is no hover to return to, so it goes back to rest.
      if (!canHover()) {
        settle();
        return;
      }

      raise("back.out(1.4)", "back.out(1.6)");
      nudgeArrow(1);
    })();
  };

  // A cancelled gesture — a scroll starting, the pointer captured elsewhere —
  // never produces pointerup, so the pressed state needs its own way out.
  const handlePointerCancel = () => contextSafe(() => settle())();

  // Keyboard parity: focus and blur mirror hover, with no hover-capability gate.
  const handleFocus = () => {
    contextSafe(() => {
      if (!root.current?.matches(":focus-visible")) return;
      raise("power3.out", "power3.out");
      nudgeArrow();
    })();
  };

  const handleBlur = () => contextSafe(() => settle())();

  const classes =
    variant === "accent"
      ? {
          button: "bg-accent",
          label: "text-on-accent",
          icon: "bg-surface text-accent",
          ringOffset: "focus-visible:ring-offset-canvas",
        }
      : {
          button: "bg-surface",
          label: "text-accent",
          icon: "bg-on-accent-border text-on-accent",
          ringOffset: "focus-visible:ring-offset-accent",
        };

  return (
    <a
      ref={root}
      data-cta
      data-reveal
      href={href}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={[
        "flex w-fit max-w-full shrink-0 select-none items-center rounded-md",
        "py-space-1 pr-space-1 pl-space-6 outline-none will-change-transform",
        "focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-4",
        classes.button,
        classes.ringOffset,
      ].join(" ")}
    >
      <span className="flex h-full min-w-0 flex-1 items-center justify-center overflow-visible">
        <span className={`text-action text-center ${classes.label}`}>{label}</span>
      </span>

      <span
        ref={icon}
        data-cta-icon
        className={`ml-space-6 flex size-space-12 shrink-0 items-center justify-center rounded-base will-change-transform ${classes.icon}`}
      >
        <svg
          ref={arrow}
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
  );
}
