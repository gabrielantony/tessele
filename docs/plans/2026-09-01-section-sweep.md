# Section sweep — master coordination plan

Repo: `tessele-site`. Base branch: `feat/landing-sections`. Written 2026-09-01, after
`67a008c` landed the last real sections (About, FAQ, Contact, Footer) and retired
`PlansSection`. Baseline: **87/87 green** in chromium, webkit and mobile-safari.

This document coordinates a per-section pass over the whole landing. Each section gets its own
short plan, its own failing tests, its own Codex handoff, its own branch — written at execution
time, exactly like phase 1 of `2026-09-01-problem-section-and-gpt-sections.md`. This file only
fixes the queue, the parallelism rules, and what was measured per section, so no front has to
re-derive it.

Checked per section, every time, even where nothing was reported: responsiveness (320–1696px),
animations (motion on, reduced motion, scroll down **and back up**), hover and press feedback,
rendering as intended (no 404s, no broken layout), and no unwanted line wraps.

## Execution model

- **Two fronts**, each a git worktree with its own branch cut from `feat/landing-sections`:
  `fix/sweep-front-a` and `fix/sweep-front-b`. Two branches total — a worktree mechanically
  requires its own branch (parallel Codex instances cannot share one tree), but sections do NOT
  get individual branches: they land as sequential commits on their front's branch, merged back
  into `feat/landing-sections` per approved section. One Codex instance per front, one section
  per handoff; `codex exec resume --last` filters by cwd, so each worktree keeps its own thread.
  Foundations (F1+F2) run before the fronts exist, directly on `feat/landing-sections`.
- **Claude writes the tests** (red first, committed), builds the handoff, reviews the diff
  against the recorded baseline SHA, merges back into `feat/landing-sections` — merges are
  **serial**, with the full suite run between merges.
- **Ports**: `PREVIEW_PORT` env var (landed in `c31cd4b`). Front A runs its checks with
  `PREVIEW_PORT=4620`, front B with `PREVIEW_PORT=4630`; the main tree keeps 4610.
- **Tests per section** go in `tests/layout/sections/<section>.spec.mjs` so parallel branches
  never edit the same spec file. The existing `landing-layout.spec.mjs` is shared and frozen:
  neither front touches it.
- Gabriel tests sections as they merge; nothing is claimed to "work", only ready to test.

## Foundations first (serial — blocks both fronts)

**F1. Shared CTA button.** Three button implementations exist today: the Hero's anchor with the
GSAP mechanics (hover scale 1.012, press 0.985/0.94, arrow nudge, `(hover: hover)` guard,
focus/blur parity), `CTAButton` inside `PricingSection.tsx:262`, and `CtaButton` inside
`ContactUsSection.tsx:479`. Extract the Hero's mechanics into `src/components/ui/CTAButton.tsx`
with colour variants (accent-on-light, on-dark, highlight) and adopt it in the Hero itself as
proof of extraction. **Scope decision (Gabriel): CTAs only** — the Services tab pills, the
billing toggle and the FAQ accordion triggers keep their own interactions; they are selection
controls, not actions.

**F2. Lining numerals.** Raleway ships old-style figures by default; nothing in the repo sets
`font-variant-numeric` (measured: `normal` on the metrics). That is the "numbers misaligned /
looks like wrong uppercasing" symptom, everywhere at once. Fix at the token level in
`globals.css` (`lining-nums` on the body), not per section.

Adoption of CTAButton in the *other* sections happens inside each section's own plan, so the
foundations diff stays small and the per-section diffs stay attributable.

## Progress

Merged into `feat/landing-sections`, suite **141/141** in chromium, webkit and mobile-safari,
lint 0 errors / 4 pre-existing warnings:

- **Foundations** — shared `CTAButton` (`src/components/ui/CTAButton.tsx`) with the Hero's
  mechanics, a discriminated anchor/button union, `ArrowIcon` extracted; `lining-nums` on the
  body. The extraction surfaced a real Chromium-only bug: Chromium focuses an anchor on
  mousedown, so the focus handler was overwriting the press tween. Gated on `:focus-visible`.
- **Services reformat** — 1492 → 1130 lines, 4-space → 2-space, via prettier and verified
  token-preserving (three inert divergences in 16.5k normalized characters).
- **Services** — intrinsic item columns replace `md:grid-cols-2`; two authorized spacing steps
  recover the last 4.5px at 390px; the three Unsplash hotlinks now serve from `public/images/`.
- **Testimonials** — native scrollbar hidden in both engine families, replaced by dots derived
  from `CASES.length` whose state follows the rail's scroll position (so a drag updates them, not
  just a click). `hiddenScrollers` now earns its exemption by finding visible controls rather
  than by an `ALLOWED` entry.

Open, carried forward:

- `TestimonialsSection.tsx` — `aria-label` on the role-less dots container is ignored by AT;
  fold the `role="group"` fix into front B's next handoff as a one-line rider.
- Services at 320px still wraps the longest label; 226px of text cannot fit a 162px column at
  this type size. Gabriel's call: leave it, shorten the item text, or reduce the type there.

## The queue

Issues below are measured (Chromium 1280×900 against the static export, plus the widths named),
not inferred. "Verify only" means no reported or measured defect yet — the standard checklist
still runs.

### Front A

1. **Pricing** — reported: wrong animations on the buttons and the cards. Adopt CTAButton
   (replaces the local `CTAButton`). Plus the two measured defects carried from the previous
   plan: `grid-cols-1` jumps straight to `lg:grid-cols-3`, so 768–1023px stacks three plans in
   one wide column; the `MAIS ESCOLHIDO` badge (`-translate-y-1/2`) floats into the gap above
   its card when stacked.
2. **Services** — reported: with the *Design & Desenvolvimento* tab selected,
   "Desenvolvimento e otimização" wraps to 2 lines (measured: 226px available at 1280px).
   Gabriel's direction: tighten the gap between the two item columns (`gap-x-space-8` in the
   items grid) so items hold one line. Also phase 6 of the previous plan: the file is 1492
   lines at 4-space indent, the only file in the repo like that — reformat in its own commit
   **before** the behaviour change, so the fix diff stays readable.
3. **Problem** — phase 2 of the previous plan, still open: below 640px the orbit card gives
   72px of content box while `PERCEPÇÃO`/`CONFIANÇA` need 84px and `EXPERIÊNCIA` 92px. Card
   width should derive from the square rather than adding a fourth absolute step.

### Front B

1. **Testimonials** — reported: the dark bar is the rail's **native scrollbar** (clarified by
   Gabriel); remove it. Hiding a scrollbar with nothing else signalling the overflow is exactly
   what the suite's `hiddenScrollers` check exists to catch, so the plan pairs hiding it with a
   minimal affordance (snap dots). Numerals fixed globally by F2 — this plan only verifies the
   metrics row afterwards.
2. **About** — reported: layout broken, photo too big, text container should stretch a bit,
   "Projetos internacionais" wraps. Measured additions: both photos 404 **and** use absolute
   `/images/...` paths that bypass `basePath` (`AboutUsSection.tsx:44,66`) — the img renders
   0×0. Path form gets fixed in the plan; the image files themselves are Gabriel's to provide.
3. **FAQ** — reported: title too big, section runs to the edge on wide screens. Measured: the
   inner grid is the only section container with no `max-w-*` (`FAQSection.tsx:259`), and the
   title is `text-display-2` (56px) where sibling sections use `text-heading-2`.
4. **Contact** — reported: styles too bold overall, entrance animation wrong, and its local
   `CtaButton` diverges from the Hero — adopt CTAButton. Plan measures the animation against
   the failure archetypes before prescribing the fix.
5. **Footer** — reported: the TESSELE wordmark is stretched. Measured root cause:
   `textLength="88%"` + `lengthAdjust="spacingAndGlyphs"` + `preserveAspectRatio="none"`
   (`FooterSection.tsx:229-238`) — glyphs are non-uniformly scaled to fill 88% of the row at
   every width. Replace with naturally-sized type (letter-spacing for the wide look, a clamp on
   font-size for scale).

### Verify only (fold into whichever front frees up first)

- **Hero** (after F1 adoption), **Quote**, **OurProcess** (its CTA anchor adopts CTAButton).

## Known blockers on Gabriel

- Media files: `images/bruno-pontes.webp`, `videos/bruno-pontes.mp4`, `images/gabriel-antony.jpg`,
  `images/thais-cuman.jpg` — all 404, `public/` is empty. Plans fix path *form*; files are his.
- The three Unsplash hotlinks in `ServicesSection.tsx` (external dependency on a static site) —
  decision pending.

## Rules (inherited from phase 1, binding on every front)

- Codex never edits `tests/**` or `playwright.config.mjs`. Claude writes tests red-first and
  shows the failure.
- No `@ts-ignore`, `eslint-disable`, `test.skip`, `ALLOWED` entries, weakened assertions,
  widened catches. A clip is not a fix while nothing measures what it hides (see the phase 1
  "What actually landed" note before reaching for one).
- `npm run build`, `npm run lint` (0 errors; warning count must not grow) and the full suite
  green before a phase is handed back, with output shown.
- Commits in English, small and semantic. One section per Codex invocation; a second failed
  correction round escalates to Gabriel instead of a third attempt.
