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
import CTAButton from "@/components/ui/CTAButton";
import { whatsappHref } from "@/lib/whatsapp";

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

/*
 * Each option needs its own sentence rather than a slot in one template: two of
 * the three complete "O que tenho em mente é...", and the third does not --
 * "é um ainda não sei" is not a thing anyone writes.
 */
const RELATIONSHIP_SENTENCES: Record<ContactType, string> = {
  "Acompanhamento mensal": "O que tenho em mente é um acompanhamento mensal.",
  "Projeto específico": "O que tenho em mente é um projeto específico.",
  "Ainda não sei": "Ainda não sei bem qual formato faz sentido.",
};

/*
 * The fields go into prose rather than `Nome: / Empresa: / Contato:` labels,
 * which read as a form dump forwarded by a robot instead of a person writing.
 *
 * The cost of prose is that every sentence has to survive its field being
 * empty on its own -- a missing label was one ugly line, but a missing name is
 * "Meu nome é  e sou da ." So each one is assembled and then dropped if it
 * came out empty, rather than interpolated blind.
 */
function buildWhatsappMessage(
  formData: ContactFormData,
  relationshipType: ContactType | null,
) {
  const name = formData.name.trim();
  const company = formData.company.trim();
  const contact = formData.contact.trim();
  const message = formData.message.trim();

  // "Meu nome é X" and not "Sou o X": the form has a single name field, and the
  // second form would need a gender the visitor never gave us.
  const who =
    name && company
      ? `Meu nome é ${name} e sou da ${company}.`
      : name
        ? `Meu nome é ${name}.`
        : company
          ? `Sou da ${company}.`
          : "";

  const introduction = [
    who,
    relationshipType ? RELATIONSHIP_SENTENCES[relationshipType] : "",
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * The contact field only makes the message when it holds an e-mail. They are
   * sending this from WhatsApp, so their number is already at the top of the
   * chat -- repeating it back is the most robotic line the message could carry.
   * An e-mail is the one case where the field says something new.
   */
  const email = looksLikeEmail(contact) ? `Meu e-mail é ${contact}.` : "";

  return [
    "Oi! Acabei de preencher o formulário no site.",
    introduction,
    message,
    email,
  ]
    .filter(Boolean)
    .join("\n\n");
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
          text-body
          text-muted

          transition-[top,font-size,line-height,font-weight,letter-spacing]
          duration-(--duration-base)
          ease-(--ease-out)
          motion-reduce:transition-none

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
      // The value may still carry parens from an earlier digits-only pass
      // through formatPhone (e.g. "(18) " before "2Antony@gmail.com" was
      // typed) — strip them now that it reads as an e-mail, not a phone.
      onChange(
        nextValue
          .replace(/[()]/g, "")
          .slice(0, MAX_EMAIL_LENGTH),
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
          text-body
          text-muted

          transition-[top,font-size,line-height,font-weight,letter-spacing]
          duration-(--duration-base)
          ease-(--ease-out)
          motion-reduce:transition-none

          peer-focus:top-space-2
          peer-focus:text-label

          peer-[:not(:placeholder-shown)]:top-space-2
          peer-[:not(:placeholder-shown)]:text-label
        "
      >
        E-mail ou WhatsApp
      </label>
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

        transition-[color,background-color,border-color,box-shadow,font-weight]
        duration-(--duration-base)
        ease-(--ease-out)
        motion-reduce:transition-none

        focus-visible:outline-highlight

        ${
          selected
            ? `
                border-accent
                bg-accent
                text-on-accent
                text-body-bold
                shadow-control
              `
            : `
                border-transparent
                bg-surface-sunken
                text-ink
                text-body

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
          text-body
          text-ink
          outline-none
          placeholder:text-muted
          selection:bg-highlight
          selection:text-accent
        "
      />
    </div>
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

    /*
     * Nome and the contact field gate the submit. Without them the message is a
     * bare "preenchi o formulário" with nothing in it, which costs them a reply
     * just to say who they are.
     *
     * Checked here rather than with the `required` attribute on purpose: native
     * validation scrolls the page to the invalid field, and this button is at the
     * bottom of the form, so the scroll pulls the button out from under the
     * cursor mid-press. That breaks the CTA's own interaction contract -- the one
     * assertCtaMechanics measures -- for every visitor, not just in the test.
     *
     * `preventScroll` is the same reason: the focus is the signal, the jump is
     * not. TODO: this deserves a visible inline message, which is a copy and
     * layout decision rather than something to invent here.
     */
    const missing = !formData.name.trim()
      ? 'input[name="name"]'
      : !formData.contact.trim()
        ? 'input[name="contact"]'
        : null;

    if (missing) {
      event.currentTarget
        .querySelector<HTMLInputElement>(missing)
        ?.focus({ preventScroll: true });
      return;
    }

    /*
     * A new tab, not a navigation: on desktop this is web.whatsapp.com, and
     * replacing the page would throw away everything they just typed if they
     * come back. The call is inside a submit handler that only a real click or
     * Enter can reach, which is what keeps popup blockers out of it.
     */
    window.open(
      whatsappHref(
        buildWhatsappMessage(formData, relationshipType),
      ),
      "_blank",
      "noopener,noreferrer",
    );
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

      <div
        data-motion="cta"
        className="
          flex
          w-full
          justify-center
        "
      >
        <CTAButton
          label="Quero falar do meu projeto"
          type="submit"
        />
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

      /*
       * One timeline per group, each triggered off its own first element, and
       * `top bottom` -- deliberately NOT the `top 75%` off the section root that
       * the other eight sections use.
       *
       * This section is taller than a phone screen. A single trigger high up
       * would run the CTA's entrance while the CTA is still most of a screen
       * below the fold, so the reader arrives to a button that finished arriving
       * without them -- which is what `each group still has its entrance left
       * when it comes into view` in tests/layout/sections/contact.spec.mjs
       * measures, and what it caught when this was rewritten as one timeline.
       *
       * So the heading here takes the shared entrance's distance and duration
       * but keeps this section's own trigger. It is the one heading on the page
       * that starts a quarter of a viewport earlier than the rest, and that is
       * the trade the test above forces.
       */
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
          y: 0,
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

      // The shared section-heading entrance: one `space-6` of rise, fixed rather
      // than a share of the heading's own height. See ProblemSection.
      reveal(
        heading,
        { autoAlpha: 0, y: "var(--spacing-space-6)" },
        DURATION_PRIMARY,
      );
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
