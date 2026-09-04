# Design tokens

Generated from `src/app/globals.css` by `scripts/generate-tokens-doc.mjs`. Do not
edit by hand — change the token in `globals.css` and re-run the script.

**The rule: every colour, size, space and radius comes from this table, through the
utility in the "Utility" column.** Never write a hex value, a raw `px`/`rem`, or a
class from Tailwind's default scale (`text-sm`, `gap-4`, `rounded-lg` as a bare
default, `text-[16px]`). If a value you need is not here, add the token to
`globals.css` and re-run this script — do not inline the number.

**A Figma frame describes one viewport.** It carries no breakpoints and no
line-break decisions. This scale already steps down on its own: the "≥48rem"
column is applied automatically, so a section never needs its own media query for
type size or page padding. Do not invent responsive values.

## Colour

Prefix each name with `bg-`, `text-`, `border-` or `ring-`.

| Name | Value |
|---|---|
| `canvas` | #faf9f5 |
| `surface` | #ffffff |
| `surface-glass` | rgb(255 255 255 / 78%) |
| `ink` | #030a06 |
| `muted` | #575651 |
| `accent` | #112118 |
| `accent-hover` | #1a3224 |
| `on-accent` | #faf9f5 |
| `on-accent-muted` | #999e99 |
| `on-accent-border` | #4d594d |
| `on-accent-track` | #666a66 |
| `highlight` | #85d02d |
| `highlight-deep` | #5e9320 |
| `dark-canvas` | #030a06 |
| `accent-soft` | rgb(17 33 24 / 5%) |
| `highlight-soft` | rgb(133 208 45 / 10%) |
| `border` | #f2f0e8 |
| `hairline` | rgb(3 10 6 / 12.5%) |
| `surface-sunken` | #f2f0e8 |
| `surface-tint` | #f7f7f2 |
| `badge` | #fef9c3 |
| `border-strong` | #e5e5e0 |
| `control-disabled` | #c0c2c1 |

## Type

Use as `text-<name>`. See the modifier table below.

| Name | Value | ≥48rem |
|---|---|---|
| `text-display` | round(nearest, clamp(2.25rem, 1.5rem + 3.125vw, 3.5rem), 2px) | — |
| `text-display-2` | round(nearest, clamp(2.25rem, 1.5rem + 3.125vw, 3.5rem), 2px) | — |
| `text-heading-2` | 2rem | 2.5rem |
| `text-heading-3` | 1.5rem | 1.75rem |
| `text-heading-4` | 1.25rem | — |
| `text-lead` | 1.125rem | 1.25rem |
| `text-subtitle` | 1.125rem | — |
| `text-body` | 1rem | — |
| `text-body-medium` | 1rem | — |
| `text-body-bold` | 1rem | — |
| `text-small` | 0.875rem | — |
| `text-small-bold` | 0.875rem | — |
| `text-small-medium` | 0.875rem | — |
| `text-label` | 0.75rem | — |
| `text-action` | 1rem | — |
| `text-metric` | 2.25rem | — |

## Spacing

Use with any spacing prefix: `p-`, `px-`, `py-`, `m-`, `mt-`, `gap-`, `size-`, `min-h-`.

| Name | Value |
|---|---|
| `space-0` | 0px |
| `space-1` | 0.25rem |
| `space-1-5` | 0.375rem |
| `space-2` | 0.5rem |
| `space-2-5` | 0.625rem |
| `space-3` | 0.75rem |
| `space-4` | 1rem |
| `space-5` | 1.25rem |
| `space-6` | 1.5rem |
| `space-7` | 1.75rem |
| `space-8` | 2rem |
| `space-10` | 2.5rem |
| `space-12` | 3rem |
| `space-16` | 4rem |
| `space-20` | 5rem |
| `space-24` | 6rem |
| `space-32` | 8rem |
| `space-40` | 10rem |
| `page` | clamp(var(--spacing-space-5), 7.5vw, var(--spacing-space-24)) |
| `section` | clamp(var(--spacing-space-16), 7.5vw, var(--spacing-space-24)) |
| `bloom-far` | clamp(24rem, 46vw, 52rem) |
| `bloom-mid` | clamp(18rem, 34vw, 38rem) |
| `bloom-near` | clamp(9rem, 16vw, 17rem) |

## Container width

Use as `max-w-<name>`.

| Name | Value |
|---|---|
| `max-w-copy` | 42rem |
| `max-w-narrow` | 48rem |
| `max-w-content` | 68rem |
| `max-w-wide` | 70rem |
| `max-w-testimonial` | 58rem |
| `max-w-testimonial-compact` | 39rem |

## Radius

Use as `rounded-<name>`.

| Name | Value |
|---|---|
| `rounded-sm` | 0.25rem |
| `rounded-base` | 0.5rem |
| `rounded-md` | 0.75rem |
| `rounded-lg` | 1.5rem |
| `rounded-xl` | 2rem |
| `rounded-2xl` | 2.25rem |
| `rounded-3xl` | 3rem |
| `rounded-full` | 999px |

## Shadow

Use as `shadow-<name>`.

| Name | Value |
|---|---|
| `shadow-floating` | 0 1.25rem 3rem rgb(3 10 6 / 8%) |
| `shadow-card` | 0 0.5rem 0.75rem rgb(0 0 0 / 2%) |
| `shadow-control` | 0 0.25rem 0.375rem rgb(0 0 0 / 5%) |
| `shadow-plan` | -0.25rem 0.5rem 1rem rgb(133 208 45 / 0%), -0.75rem 1.25rem 2rem rgb(133 208 45 / 2%), -1.5rem 2.5rem 3.5rem rgb(133 208 45 / 3%) |
| `shadow-plan-lifted` | -0.25rem 0.5rem 1rem rgb(133 208 45 / 5%), -0.75rem 1.25rem 2rem rgb(133 208 45 / 8%), -1.5rem 2.5rem 3.5rem rgb(133 208 45 / 10%) |
| `shadow-lifted` | -4px 6px 16px rgb(137 130 103 / 8%), -15px 25px 29px rgb(137 130 103 / 7%), -34px 56px 39px rgb(137 130 103 / 4%), -61px 99px 47px rgb(137 130 103 / 1%) |

## What the type utilities already carry

Each `text-*` token sets font-size, line-height, font-weight and letter-spacing
together. Adding `font-bold`, `font-medium`, `leading-*` or `tracking-*` next to
one overrides the token and is always wrong.

| Utility | size / line-height / weight / tracking |
|---|---|
| `text-display` | round(nearest, clamp(2.25rem, 1.5rem + 3.125vw, 3.5rem), 2px) / round(nearest, 1.15em, 2px) / 700 / -0.02em |
| `text-display-2` | round(nearest, clamp(2.25rem, 1.5rem + 3.125vw, 3.5rem), 2px) / round(nearest, 1.15em, 2px) / 700 / -0.02em |
| `text-heading-2` | 2rem / round(nearest, 1.2em, 2px) / 700 / -0.015em |
| `text-heading-3` | 1.5rem / round(nearest, 1.28em, 2px) / 600 / -0.01em |
| `text-heading-4` | 1.25rem / round(nearest, 1.33em, 2px) / 700 / 0 |
| `text-lead` | 1.125rem / 1.75rem / 500 / — |
| `text-subtitle` | 1.125rem / round(nearest, 1.55em, 2px) / 400 / 0 |
| `text-body` | 1rem / 1.5rem / 400 / 0 |
| `text-body-medium` | 1rem / 1.5rem / 500 / 0 |
| `text-body-bold` | 1rem / 1.5rem / 700 / 0 |
| `text-small` | 0.875rem / 1.25rem / 400 / — |
| `text-small-bold` | 0.875rem / 1.25rem / 700 / 0 |
| `text-small-medium` | 0.875rem / 1.25rem / 500 / 0 |
| `text-label` | 0.75rem / 1rem / 600 / 0.06em |
| `text-action` | 1rem / round(nearest, 1.2em, 2px) / 600 / 0 |
| `text-metric` | 2.25rem / 2.25rem / 600 / -0.01em |

## Motion

| Token | Value |
|---|---|
| `var(--duration-fast)` | 160ms |
| `var(--duration-base)` | 320ms |
| `var(--duration-slow)` | 420ms |
| `var(--duration-editorial)` | 720ms |
| `var(--ease-enter)` | cubic-bezier(0.05, 0.7, 0.1, 1) |
| `var(--ease-exit)` | cubic-bezier(0.3, 0, 0.8, 0.15) |
| `var(--ease-out)` | cubic-bezier(0.16, 1, 0.3, 1) |
| `var(--ease-fluid)` | cubic-bezier(0.618, 0, 0.382, 1) |
| `var(--ease-lift)` | cubic-bezier(0.236, 1.236, 0.382, 1) |
| `var(--duration-lift)` | 400ms |

Read `docs/failure-archetypes.md` before writing any scroll sequence. Every
animated section also needs a `prefers-reduced-motion` path that restores the
static end state — the global CSS rule does not reach GSAP tweens.
