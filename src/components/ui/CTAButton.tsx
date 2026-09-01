"use client";

import {
  useRef,
  type FocusEvent,
  type MouseEventHandler,
  type PointerEvent,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ArrowIcon from "./ArrowIcon";

type CTAElement = HTMLAnchorElement | HTMLButtonElement;

type CTAButtonProps =
  | {
      href: string;
      label: string;
      variant?: "highlight";
      fullWidth?: boolean;
      /*
       * Opens the link in a new tab. Every href this component is given today is
       * a WhatsApp deep link, and those want it: on desktop the same tab would
       * replace the page with web.whatsapp.com, so a visitor comparing plans
       * loses the page to go and ask about one of them.
       */
      external?: boolean;
      type?: never;
      onClick?: never;
    }
  | {
      href?: never;
      label: string;
      variant?: "highlight";
      fullWidth?: boolean;
      external?: never;
      type?: "button" | "submit";
      onClick?: MouseEventHandler<HTMLButtonElement>;
    };

export default function CTAButton(props: CTAButtonProps) {
  const root = useRef<CTAElement>(null);
  const { contextSafe } = useGSAP({ scope: root });
  const isHighlight = props.variant === "highlight";
  const setRoot = (element: CTAElement | null) => {
    root.current = element;
  };

  // Read on every event rather than once: either preference can change
  // mid-session, and a hybrid device can switch pointer type.
  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Reduced motion keeps every state change — it just arrives without travel,
  // so the button still reads as pressed and as focused.
  const seconds = (value: number) => (prefersReducedMotion() ? 0 : value);

  const iconFor = (button: CTAElement) =>
    button.querySelector<HTMLElement>("[data-cta-icon]");
  const arrowFor = (button: CTAElement) =>
    button.querySelector<SVGSVGElement>("[data-cta-arrow]");

  const raise = (button: CTAElement, buttonEase: string, iconEase: string) => {
    gsap.to(button, {
      y: -3,
      scale: 1.012,
      duration: seconds(0.377),
      ease: buttonEase,
    });

    const icon = iconFor(button);
    if (!icon) return;

    gsap.to(icon, {
      scale: 1.035,
      duration: seconds(0.377),
      ease: iconEase,
    });
  };

  const settle = (button: CTAElement) => {
    gsap.to(button, {
      y: 0,
      scale: 1,
      duration: seconds(0.61),
      ease: "power3.out",
    });

    const icon = iconFor(button);
    if (icon) {
      gsap.to(icon, {
        scale: 1,
        duration: seconds(0.377),
        ease: "power3.out",
      });
    }

    const arrow = arrowFor(button);
    if (arrow) {
      gsap.to(arrow, {
        x: 0,
        duration: seconds(0.377),
        ease: "power3.out",
      });
    }
  };

  const nudgeArrow = (button: CTAElement, from?: number) => {
    const arrow = arrowFor(button);
    if (!arrow) return;

    if (from === undefined) {
      gsap.to(arrow, {
        x: 4,
        duration: seconds(0.233),
        ease: "power2.out",
      });
      return;
    }

    gsap.fromTo(
      arrow,
      { x: from },
      { x: 4, duration: seconds(0.233), ease: "power2.out" },
    );
  };

  const handlePointerEnter = contextSafe((event: PointerEvent<CTAElement>) => {
    // A tap fires pointerenter but frequently never fires pointerleave, which
    // would leave the button stuck in its raised state on a phone.
    if (!canHover()) return;
    raise(event.currentTarget, "power3.out", "power3.out");
    nudgeArrow(event.currentTarget);
  });

  const handlePointerLeave = contextSafe((event: PointerEvent<CTAElement>) => {
    if (!canHover()) return;
    settle(event.currentTarget);
  });

  const handlePointerDown = contextSafe((event: PointerEvent<CTAElement>) => {
    const button = event.currentTarget;
    gsap.to(button, {
      y: 0,
      scale: 0.985,
      duration: seconds(0.144),
      ease: "power2.out",
    });

    const icon = iconFor(button);
    if (!icon) return;

    gsap.to(icon, {
      scale: 0.94,
      duration: seconds(0.144),
      ease: "power2.out",
    });
  });

  const handlePointerUp = contextSafe((event: PointerEvent<CTAElement>) => {
    const button = event.currentTarget;
    // Releasing returns to the raised state only where a cursor can stay on the
    // button. On touch there is no hover to return to, so it goes back to rest.
    if (!canHover()) {
      settle(button);
      return;
    }

    raise(button, "back.out(1.4)", "back.out(1.6)");
    nudgeArrow(button, 1);
  });

  // A cancelled gesture — a scroll starting, the pointer captured elsewhere —
  // never produces pointerup, so the pressed state needs its own way out.
  const handlePointerCancel = contextSafe((event: PointerEvent<CTAElement>) =>
    settle(event.currentTarget),
  );

  // Chromium focuses anchors on mousedown while Safari does not. Raise only
  // keyboard focus, otherwise Chromium would overwrite the press tween.
  const handleFocus = contextSafe((event: FocusEvent<CTAElement>) => {
    const button = event.currentTarget;
    if (!button.matches(":focus-visible")) return;
    raise(button, "power3.out", "power3.out");
    nudgeArrow(button);
  });

  const handleBlur = contextSafe((event: FocusEvent<CTAElement>) => {
    const button = event.currentTarget;

    /*
     * Losing focus is not a reason to drop out of the raised state while the
     * cursor is still on the button -- hover owns that, and pointerleave will
     * settle it when the cursor actually goes.
     *
     * This is not hypothetical tidying: the contact form's submit sends focus to
     * the first empty field when it refuses to submit, so that blur arrives while
     * the pointer is still down on the button -- and without this the button sank
     * under the cursor.
     */
    if (canHover() && button.matches(":hover")) return;

    settle(button);
  });

  /*
   * The icon chip is anchored to the right edge -- that inset chip is the
   * button's shape -- and the label centers on the space the chip leaves, not
   * on the button's own middle. The chip occupies its side of the button, so
   * the field the label answers to is the one that remains: `flex-1` stretches
   * the label across exactly that field and centers it there.
   *
   * Centering on the button's geometric middle instead (a spacer mirroring the
   * chip) puts the label at the true center but reads worse, because the eye
   * measures the label against the chip beside it rather than against the
   * button's invisible axis.
   */
  const content = (
    <>
      <span className="flex h-full min-w-0 flex-1 items-center justify-center overflow-visible">
        <span
          className={[
            "text-action text-center",
            isHighlight ? "text-accent" : "text-on-accent",
          ].join(" ")}
        >
          {props.label}
        </span>
      </span>

      <span
        data-cta-icon
        className="ml-space-6 flex size-space-12 shrink-0 items-center justify-center rounded-base bg-surface text-accent will-change-transform"
      >
        <ArrowIcon />
      </span>
    </>
  );

  const className = [
    "flex max-w-full shrink-0 select-none items-center rounded-md",
    props.fullWidth ? "w-full" : "w-fit",
    "py-space-1 pr-space-1 pl-space-6 outline-none will-change-transform",
    "focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-4",
    "focus-visible:ring-offset-canvas",
    isHighlight ? "bg-highlight" : "bg-accent",
  ].join(" ");

  if ("href" in props) {
    return (
      <a
        ref={setRoot}
        data-cta
        data-cta-button
        data-reveal
        href={props.href}
        target={props.external ? "_blank" : undefined}
        rel={props.external ? "noopener noreferrer" : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={setRoot}
      data-cta
      data-cta-button
      data-reveal
      type={props.type ?? "button"}
      onClick={props.onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    >
      {content}
    </button>
  );
}
