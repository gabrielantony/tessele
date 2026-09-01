# Landing responsive fixes — plan

Repo: `tessele-site` (Next 16, static export to GitHub Pages under `/tessele/`).
Branch: `feat/landing-sections`. Written 2026-09-01.

Every number below was measured against `npm run build` output in Chromium, WebKit and an
iPhone 15 profile — not inferred from the source.

## The reported symptom, reproduced

Gabriel reported a horizontal scroll on Safari/iPhone. It reproduces, and it is **not static**:
the page gets wider and narrower on its own.

`ProblemSection.tsx` spins an orbit — a `[data-orbit-rotor]` rotating 360° over 21s, with five
absolutely positioned `[data-orbit-slot]` cards riding the circle. As each card swings through
the right-hand side of its arc, its box leaves the square container and the page grows.
Sampling every 400ms across the cycle:

| viewport | overflow min | overflow max |
|---|---|---|
| 390px | 4px | **148px** |
| 768px | 44px | 242px |
| 900px | 59px | **283px** |
| 1280px | 0px | 145px |
| 1600px | 0px | 6px |

Identical in Chromium, WebKit and the iPhone 15 profile, so it is not a Safari quirk — it was
always there, and a snapshot taken at the wrong moment reads as "no overflow". Bisecting by
hiding one section at a time: hiding this section alone takes the overflow to 0 at every width.

**Root cause.** The cards live in
`div.relative.aspect-square.w-full.max-w-narrow` (`ProblemSection.tsx:191`), which has no clip,
inside a section that has no clip either. A card centred on the orbit reaches
`radius + card/2` from the centre, while the container's half-width is only
`radius + space-8`. Every card is guaranteed to escape by `card/2 − space-8` at the extremes of
its arc; the only question is whether the page gutter happens to absorb it, which is why the
overflow vanishes at 1600px.

## The other measured defect

**The hero CTA label overflows its own button by 7px, at every width, in all three engines.**
`Hero.tsx:277-278` fixes the anchor at `h-[3.5rem] w-[18.125rem]` and the label inside is
`whitespace-nowrap`. 290px of box for 297px of text.

Worth naming plainly: the last three commits on `main` are
`fix: keep hero CTA visible on mobile`, `fix: correct the hero CTA clip and the problem section`
and `fix: stop the hero CTA label from pushing the icon out`. This has been fixed three times
and is still 7px out. A hard-coded width holding text that changes with the font is the reason
it keeps coming back — the fix is to stop pinning the width, not to pick a fourth number.

## What the review found that no measurement can catch

**Six of the thirteen sections on the page are still the untouched scaffold.**
`AboutUsSection`, `FAQSection`, `PlansSection`, `ContactUsSection`, `FooterSection` and
`ExampleMotionSection` all render the same three placeholder lines — *"Motion section /
Placeholder heading / Scroll down and these three elements rise into place, staggered."* That
includes the footer and the contact section. `page.tsx` says in its own comment that
`ExampleMotionSection` is scaffolding to delete, and it is still rendered last on the page.

`PlansSection` and `PricingSection` both exist and both render; only `PricingSection` has real
content. Whether Plans is a second real section or a leftover is a question for Gabriel.

The three sections written with GPT — `ServicesSection` (1492 lines), `PricingSection` (682),
`TestimonialsSection` (446) — use semantic `<button>`, `role` and `aria-*` attributes, and they
respect the token scale: only 13 arbitrary Tailwind values exist across the whole repo and none
of them are in these three. That part is in good shape.

## Phases

### Phase 1 — the orbit stops widening the page

**File.** `src/components/sections/ProblemSection.tsx`.

Contain the orbit so no rotation angle can reach past the page. Clipping the square is the
smallest change; sizing the cards against the orbit radius so they never leave it is the more
honest one, because a clip hides a card mid-sentence rather than preventing the escape. Prefer
the second where the design allows, and say which you chose.

Do not change the orbit's timing, its 21s period, the counter-rotation that keeps labels
upright, or the reduced-motion path that returns early before the timeline is built.

**Acceptance.** `the page never scrolls horizontally while motion runs at 390px` and `at 900px`
pass in all three browser projects, and `layout holds at <width>px` reports no document overflow
at any width.

### Phase 2 — the hero CTA fits its label

**File.** `src/components/sections/Hero.tsx`.

Stop pinning the anchor to `w-[18.125rem]`. Let it size to its content with padding from the
spacing scale, and keep the icon from being pushed out by making the label the flexible part
rather than a `whitespace-nowrap` block in a fixed box. `h-[3.5rem]` and `min-h-[48.75rem]`
should come from the token scale too — check `src/app/globals.css` for an existing step before
adding one, and stop and ask if none fits.

**Acceptance.** `elements wider than the box that is supposed to hold them` reports nothing at
any width, in all three projects.

### Phase 3 — the placeholder sections (needs Gabriel first)

Blocked on content, not code. The decision for each of the six: write it, or remove it from
`page.tsx` until it exists. Shipping a footer and a contact section that both say "Placeholder
heading" is worse than shipping neither. `ExampleMotionSection` is unambiguous — its own file
comment says to delete it once it is no longer a reference.

## Out of scope

- The Astro repo at `~/GitHub/Tessele`. Its own responsive work is finished and green on
  `feat/landing-figma-revamp`; nothing here touches it.
- Design fidelity to the Figma. Nothing in this plan claims a section does or does not match a
  design — these are cases where the page contradicts itself or the browser.
- `PlansSection` vs `PricingSection` — a product question.

## Rules for every phase

- Codex never edits anything under `tests/`. Claude writes the tests.
- No `@ts-ignore`, no `eslint-disable`, no `test.skip`, no entry added to the spec's `ALLOWED`
  object, no weakened assertion. If the only route to green passes through one of those, stop
  and say which check would have to be turned off and why.
- `npm run build`, `npm run lint` and `npx playwright test` all pass before a phase is handed
  back.
- Commits in English, small and semantic.
