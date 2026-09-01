"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* =========================
   TYPES
========================= */

type ContactType =
  | "Acompanhamento mensal"
  | "Projeto específico"
  | "Ainda não sei";

type ContactFormData = {
  name: string;
  company: string;
  contact: string;
  message: string;
};

/* =========================
   CONSTANTS
========================= */

const CONTACT_TYPES: ContactType[] = [
  "Acompanhamento mensal",
  "Projeto específico",
  "Ainda não sei",
];

const MAX_EMAIL_LENGTH = 80;
const MAX_PHONE_DIGITS = 11;

/* =========================
   MOTION
========================= */

const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INVERSE = 1 / PHI;
const PHI_SQUARED = PHI * PHI;

const DURATION_PRIMARY = PHI_INVERSE;
const DURATION_SECONDARY =
  PHI_INVERSE * PHI_INVERSE;

function fibonacciEaseOut(progress: number) {
  return 1 - Math.pow(1 - progress, PHI_SQUARED);
}

/* =========================
   HELPERS
========================= */

function formatPhone(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, MAX_PHONE_DIGITS);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(
      2,
      6,
    )}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(
    2,
    7,
  )}-${digits.slice(7)}`;
}

function looksLikeEmail(value: string) {
  return /[a-zA-Z@]/.test(value);
}

/* =========================
   ICON
========================= */

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="
        size-space-5
        transition-transform
        duration-(--duration-base)
        ease-(--ease-out)
        group-hover/cta:translate-x-space-1
      "
    >
      <path
        d="M5 12H19M14 7L19 12L14 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================
   INPUT
========================= */

type InputFieldProps = {
  label: string;
  name: string;
  value: string;
  autoComplete?: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
};

function InputField({
  label,
  name,
  value,
  autoComplete,
  onChange,
}: InputFieldProps) {
  return (
    <div
      className="
        group/input
        relative
        w-full
        overflow-hidden
        rounded-md
        border
        border-transparent
        bg-surface-sunken

        transition-all
        duration-(--duration-base)
        ease-(--ease-out)

        hover:border-hairline

        focus-within:border-highlight
        focus-within:shadow-control
      "
    >
      <input
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder=" "
        className="
          peer
          w-full
          bg-transparent
          px-space-5
          pb-space-2
          pt-space-6
          text-body
          text-ink
          outline-none
          selection:bg-highlight
          selection:text-accent
        "
      />

      <label
        className="
          pointer-events-none
          absolute
          left-space-5
          top-space-4
          text-small-medium
          text-muted

          transition-all
          duration-(--duration-fast)
          ease-(--ease-out)

          peer-focus:top-space-2
          peer-focus:text-label

          peer-[:not(:placeholder-shown)]:top-space-2
          peer-[:not(:placeholder-shown)]:text-label
        "
      >
        {label}
      </label>
    </div>
  );
}

/* =========================
   CONTACT INPUT
========================= */

function ContactInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const emailMode = looksLikeEmail(value);

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextValue = event.target.value;

    if (looksLikeEmail(nextValue)) {
      onChange(
        nextValue.slice(0, MAX_EMAIL_LENGTH),
      );
      return;
    }

    onChange(formatPhone(nextValue));
  }

  return (
    <div
      className="
        group/input
        relative
        w-full
        overflow-hidden
        rounded-md
        border
        border-transparent
        bg-surface-sunken

        transition-all
        duration-(--duration-base)
        ease-(--ease-out)

        hover:border-hairline

        focus-within:border-highlight
        focus-within:shadow-control
      "
    >
      <input
        name="contact"
        type="text"
        value={value}
        onChange={handleChange}
        autoComplete={
          emailMode ? "email" : "tel"
        }
        inputMode={
          emailMode ? "email" : "tel"
        }
        placeholder=" "
        className="
          peer
          w-full
          bg-transparent
          px-space-5
          pb-space-2
          pt-space-6
          pr-space-24
          text-body
          text-ink
          outline-none
          selection:bg-highlight
          selection:text-accent
        "
      />

      <label
        className="
          pointer-events-none
          absolute
          left-space-5
          top-space-4
          text-small-medium
          text-muted

          transition-all
          duration-(--duration-fast)
          ease-(--ease-out)

          peer-focus:top-space-2
          peer-focus:text-label

          peer-[:not(:placeholder-shown)]:top-space-2
          peer-[:not(:placeholder-shown)]:text-label
        "
      >
        E-mail ou WhatsApp
      </label>

      {value && (
        <div
          className="
            pointer-events-none
            absolute
            inset-y-space-0
            right-space-4
            flex
            items-center
          "
        >
          <span
            className="
              rounded-full
              bg-highlight-soft
              px-space-2
              py-space-1
              text-label
              text-accent
            "
          >
            {emailMode ? "E-mail" : "WhatsApp"}
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================
   CHIPS
========================= */

function ContactChip({
  label,
  selected,
  onClick,
}: {
  label: ContactType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`
        rounded-full
        border
        px-space-4
        py-space-2
        text-body-bold

        transition-all
        duration-(--duration-base)
        ease-(--ease-out)

        focus-visible:outline-highlight

        ${
          selected
            ? `
                border-accent
                bg-accent
                text-on-accent
                shadow-control
              `
            : `
                border-transparent
                bg-surface-sunken
                text-ink

                hover:border-highlight
                hover:bg-highlight-soft
              `
        }
      `}
    >
      {label}
    </button>
  );
}

/* =========================
   TEXTAREA
========================= */

function MessageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => void;
}) {
  return (
    <div
      className="
        group/textarea
        relative
        min-h-space-40
        w-full
        overflow-hidden
        rounded-md
        border
        border-transparent
        bg-surface-sunken

        transition-all
        duration-(--duration-base)
        ease-(--ease-out)

        hover:border-hairline

        focus-within:border-highlight
        focus-within:shadow-control
      "
    >
      <textarea
        name="message"
        value={value}
        onChange={onChange}
        placeholder="Conte um pouco sobre o que está acontecendo na sua empresa hoje"
        className="
          min-h-space-40
          w-full
          resize-y
          bg-transparent
          p-space-5
          pb-space-8
          text-body
          text-ink
          outline-none
          placeholder:text-muted
          selection:bg-highlight
          selection:text-accent
        "
      />

      <span
        className="
          pointer-events-none
          absolute
          bottom-space-3
          right-space-4
          text-label
          text-muted
        "
      >
        {value.length}
      </span>
    </div>
  );
}

/* =========================
   CTA
========================= */

function CtaButton() {
  return (
    <button
      type="submit"
      className="
        group/cta
        flex
        w-full
        items-center
        rounded-md
        bg-accent
        p-space-1
        pl-space-6
        text-on-accent

        transition-all
        duration-(--duration-base)
        ease-(--ease-out)

        hover:bg-accent-hover
        hover:shadow-control

        focus-visible:outline-highlight
      "
    >
      <span
        className="
          flex-1
          text-center
          text-action
        "
      >
        Quero falar do meu projeto
      </span>

      <span
        className="
          flex
          size-space-12
          shrink-0
          items-center
          justify-center
          rounded-base
          bg-surface
          text-accent

          transition-colors
          duration-(--duration-base)
          ease-(--ease-out)

          group-hover/cta:bg-surface-tint
        "
      >
        <ArrowIcon />
      </span>
    </button>
  );
}

/* =========================
   FORM
========================= */

function ContactForm() {
  const [formData, setFormData] =
    useState<ContactFormData>({
      name: "",
      company: "",
      contact: "",
      message: "",
    });

  const [
    relationshipType,
    setRelationshipType,
  ] = useState<ContactType | null>(null);

  function updateField(
    field: keyof ContactFormData,
    value: string,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    console.log({
      ...formData,
      relationshipType,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
        flex
        w-full
        max-w-copy
        flex-col
        gap-space-6
      "
    >
      <input
        type="hidden"
        name="relationshipType"
        value={relationshipType ?? ""}
      />

      <div
        data-motion="fields"
        className="
          flex
          w-full
          flex-col
          gap-space-3
        "
      >
        <InputField
          label="Nome"
          name="name"
          value={formData.name}
          autoComplete="name"
          onChange={(event) =>
            updateField(
              "name",
              event.target.value,
            )
          }
        />

        <InputField
          label="Empresa"
          name="company"
          value={formData.company}
          autoComplete="organization"
          onChange={(event) =>
            updateField(
              "company",
              event.target.value,
            )
          }
        />

        <ContactInput
          value={formData.contact}
          onChange={(value) =>
            updateField("contact", value)
          }
        />
      </div>

      <div
        data-motion="relationship"
        className="
          flex
          w-full
          flex-col
          gap-space-4
        "
      >
        <p className="text-body text-ink">
          Como você imagina trabalhar com a
          Tessele?
        </p>

        <div
          className="
            flex
            w-full
            flex-wrap
            gap-space-2
          "
        >
          {CONTACT_TYPES.map((option) => (
            <ContactChip
              key={option}
              label={option}
              selected={
                relationshipType === option
              }
              onClick={() =>
                setRelationshipType(option)
              }
            />
          ))}
        </div>
      </div>

      <div data-motion="message">
        <MessageField
          value={formData.message}
          onChange={(event) =>
            updateField(
              "message",
              event.target.value,
            )
          }
        />
      </div>

      <div data-motion="cta">
        <CtaButton />
      </div>
    </form>
  );
}

/* =========================
   SECTION
========================= */

export default function FormularioDeContato() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;

      if (!section) {
        return;
      }

      const select = gsap.utils.selector(section);

      const heading = select(
        '[data-motion="heading"]',
      );

      const fields = select(
        '[data-motion="fields"]',
      );

      const relationship = select(
        '[data-motion="relationship"]',
      );

      const message = select(
        '[data-motion="message"]',
      );

      const cta = select(
        '[data-motion="cta"]',
      );

      const allTargets = [
        ...heading,
        ...fields,
        ...relationship,
        ...message,
        ...cta,
      ];

      const prefersReducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

      if (prefersReducedMotion) {
        gsap.set(allTargets, {
          clearProps: "all",
        });

        return;
      }

      const reveal = (
        targets: HTMLElement[],
        from: gsap.TweenVars,
        duration: number,
      ) => {
        const timeline = gsap.timeline({
          paused: true,
          defaults: {
            ease: fibonacciEaseOut,
          },
        });

        timeline.fromTo(targets, from, {
          autoAlpha: 1,
          yPercent: 0,
          scale: 1,
          duration,
        });

        ScrollTrigger.create({
          trigger: targets[0],
          start: "top bottom",
          animation: timeline,
          toggleActions: "play none none reverse",
        });
      };

      reveal(heading, { autoAlpha: 0, yPercent: 10 }, DURATION_PRIMARY);
      reveal(fields, { autoAlpha: 0, yPercent: 8 }, DURATION_SECONDARY);
      reveal(relationship, { autoAlpha: 0, yPercent: 6 }, DURATION_SECONDARY);
      reveal(message, { autoAlpha: 0, yPercent: 6 }, DURATION_SECONDARY);
      reveal(
        cta,
        {
          autoAlpha: 0,
          yPercent: 4,
          scale: PHI_INVERSE + DURATION_SECONDARY,
        },
        DURATION_SECONDARY,
      );
    },
    {
      scope: root,
    },
  );

  return (
    <section
      ref={root}
      data-name="formulario-de-contato"
      className="
        bg-canvas
        px-page
        py-section
      "
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-content
          flex-col
          items-center
          gap-space-16
        "
      >
        <h2
          data-motion="heading"
          className="
            max-w-narrow
            text-center
            text-heading-2
            text-ink
          "
        >
          Se existe alguma coisa impedindo sua
          empresa de avançar, vale começar{" "}
          <span className="text-highlight">
            entendendo
          </span>{" "}
          o que é.
        </h2>

        <ContactForm />
      </div>
    </section>
  );
}
