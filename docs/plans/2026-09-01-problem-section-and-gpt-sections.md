# ProblemSection orbit + the GPT-written sections — plan

Repo: `tessele-site` (Next 16, static export to GitHub Pages under `/tessele/`).
Branch: `feat/landing-sections`. Written 2026-09-01.

Successor to `2026-09-01-landing-responsive-fixes.md`, whose phases 1 and 2 landed in
`b80ce76` and `005b111`. Read that document first: it explains the orbit and the hero CTA.
This one starts from what is measurably still wrong **after** those commits.

Every number below was measured against the static export (`out/`, what ships) in Chromium
and WebKit. Nothing here is inferred from reading the source.

## Starting state, measured

`npx playwright test` is **green: 30/30** across chromium, webkit and mobile-safari.

**The reported horizontal scroll of the document no longer reproduces.** Sampled
`documentElement.scrollWidth - clientWidth`:

- 184 widths from 320px to 1696px (8px steps, plus 639/640/767/768/1023/1024/1279/1280/1281),
  reduced motion, both engines → **0px at every width**;
- motion on, over the **full 21s orbit period** (115 samples at 200ms) at 320/390/768/1024/1280/1600,
  both engines → **0px at every width**;
- motion on, scrolling the whole page down and back up, clicking every services tab, toggling
  billing both ways, dragging the cases rail to its end → **0px**.

So `b80ce76` and `005b111` did fix the document overflow. What they did **not** fix is the
reason it existed, and the clip they added to contain it is now cutting content.

## The defect, in closed form

`ProblemSection.tsx:88-93` derives the card's inward offset from the card's **width**:

```ts
marginTop: (_index, card) =>
  card.offsetWidth / 2 - parseFloat(getComputedStyle(rotor).insetInlineStart)
```

The cards are counter-rotated (`ProblemSection.tsx:82-86`), so they stay axis-aligned as they
travel. An axis-aligned box on a circle of radius `r` reaches `r - offset + width/2`
horizontally and `r - offset + height/2` **vertically**. Substituting the formula above, the
horizontal reach lands exactly on the square's edge — by construction — and the vertical reach
overshoots it by exactly `(height − width) / 2`.

The cards are taller than they are wide below 1024px, so they always escape vertically:

| viewport | card | (h−w)/2 | measured escape top/bottom |
|---|---|---|---|
| 320px | 96×154 | 29px | **29 / 29** |
| 390px | 96×154 | 29px | **29 / 30** |
| 768px | 128×162 | 17px | **17 / 17** |
| 1024px+ | 160×130 | — (wider than tall) | 0 / 0 |

The prediction matches the measurement at every width, in both engines. `offsetWidth` is used
where the binding constraint is the height.

`ProblemSection.tsx:206` then wraps the square in `overflow-hidden`, so the escape is not a
page-widening bug any more — it is **content silently cut off**. Measured horizontal content
hidden inside that square, over the full cycle: 127px at 320px, 154px at 390px, 295px at 768px,
226px at 1600px. WebKit and Chromium agree.

This is visible without instruments. At 390px the top card is cut mid-sentence and the
side cards are cut at the page's left and right. The reduced-motion path
(`ProblemSection.tsx:108-110`) returns after positioning the slots, so a reduced-motion visitor
gets that clipped card **permanently**, not for a moment of the rotation.

## The second defect: the labels do not fit their own card

Below 640px the card is `w-space-24` (96px) with `px-space-3`, so 72px of content box. Measured
text width of the labels against it, WebKit:

| label | text width | content box | overflow |
|---|---|---|---|
| PERCEPÇÃO | 84px | 72px | **+12px** |
| CONFIANÇA | 84px | 72px | **+12px** |
| EXPERIÊNCIA | 92px | 72px | **+20px** |

At every width from 320px to 639px, in both engines. This is the section reading as
"not responsive": a 14px/700 uppercase word in a 72px box.

**The suite cannot see this and will not start seeing it for free.** The `parentOverflow` probe
in `tests/layout/landing-layout.spec.mjs` compares element boxes, and a text run is not an
element — the `<p>` box is 72px wide while its glyphs paint outside it. Catching it needs a
`Range.getClientRects()` measurement, which is new test code.

## Why the green suite missed all of this

Named plainly, because these are the holes the new tests have to close:

1. **The motion test samples 14×400ms = 5.6s of a 21s period** — 27% of the rotation. The
   remaining 73% was never measured.
2. **Nothing asserts the reduced-motion state.** Every `layout holds at Npx` test runs with
   `reducedMotion: "reduce"`, and the orbit's reduced-motion branch has its own geometry.
3. **Nothing asserts that content is not clipped.** `overflow-hidden` makes an element pass
   every overflow check by definition; the check that matters is `scrollWidth > clientWidth`
   on the clipping box itself.
4. **Text overflow is invisible to an element-box probe** (above).
5. **Seven hard-coded widths.** The worst structural moment on the page is the 1023→1024
   transition, and neither 1023 nor the pair is sampled. At 1023px the square is 768px wide
   holding a 128px card (249px of slack); at 1024px `lg:grid-cols-2` halves the row and the
   square drops to 387px **while the card grows to 160px** — slack collapses to 59px. The
   container and the card step in opposite directions at the same breakpoint.

## Phases

Phases 1 and 2 are what Gabriel reported. Phases 3–6 are defects found while measuring; each
says whether it is safe for Codex or needs a decision from Gabriel first.

---

### Phase 1 — the orbit stops cutting its cards

**File.** `src/components/sections/ProblemSection.tsx`.

**Approach.** Fix the offset formula so it accounts for the dimension that actually binds, then
remove the clip that was hiding the consequence.

1. `updateOrbitCardOffset` must derive the offset from the card's larger dimension, not its
   width — `Math.max(card.offsetWidth, card.offsetHeight) / 2 - inset`. With that, both the
   horizontal and the vertical reach land on the square's edge instead of only the horizontal
   one.
2. Remove `overflow-hidden` from `ProblemSection.tsx:206`. It is load-bearing today, which is
   the problem: keeping it means the next geometry regression is invisible again. Step 1 has to
   be what holds the cards in, and the removed clip is what proves it does.

Do not change: the 21s period, the single-timeline structure and the comment at
`ProblemSection.tsx:112-117` explaining why the rotor and the counter-rotation share one
timeline, the `ScrollTrigger` gate that pauses the orbit off-screen, or the `ResizeObserver`.

**Acceptance.** All of these, in all three browser projects:
- `the orbit keeps its cards inside the square for a full rotation` — 0px escape on all four
  edges, sampled across the whole 21s period, at 320/390/768/1024/1280/1600.
- `the orbit clips nothing` — the square's `scrollWidth - clientWidth` and
  `scrollHeight - clientHeight` are both 0, with motion and with reduced motion.
- `the orbit keeps its cards inside the square with reduced motion` — the static state too.
- Every pre-existing test still passes, including the document-overflow ones. Removing a clip
  must not reintroduce the page-widening bug those tests guard.

**What actually landed, and where this plan was wrong.** `4835007` fixed the formula and
`8efeb79` finished the phase. The suite is 87/87 in all three projects.

The plan asserted that fixing the card geometry would be enough to contain the orbit once the
clip came off. It was not. Besides the cards there are the `[data-orbit-slot]` wrappers —
empty, `pointer-events-none`, sized to the whole orbit and rotated 120° and 240°. The bounding
box of a rotated square is `side · (|cos| + |sin|)`, so at 120° it is 1.366× the square: those
boxes always stuck out, and the old clip was hiding them too. Removing it widened the document
by 18px at 390, 21px at 430, 63px at 768 and 74px at 900, and 0px from 1024 up — the band where
the section is a single column. Bisecting confirmed it: `display: none` on the slots alone takes
the document to 0px at every width.

So the phase ends with a clip after all, and the rule below that "`overflow-hidden` and
`overflow-x-clip` are not fixes in this plan" is too broad. The distinction that matters is not
whether a clip exists but **whether a test would notice what it hides**:

- The old clip was on the **square** and it hid **content** — cards 29px outside it, cut
  mid-sentence — while nothing measured the cards. That is what made a real defect invisible.
- What landed is `overflow-x-clip` on the **section**, and the only thing it contains is a
  phantom box with no visual presence at all.
- The square stays unclipped. A card that escapes it again bleeds over the copy rather than
  disappearing, and `the orbit keeps its cards inside the square` fails — six widths, three
  engines, motion and reduced motion. That test did not exist when the old clip was added. Its
  existence, not the absence of a clip, is what makes this safe.

The alternative was restructuring the slot to be card-sized with `transformOrigin` at the orbit
centre, removing the phantom box at the root. Rejected: it rewrites the rotation mechanics the
file's comments exist to protect, and it moves the card centres inward off the dashed circle —
a visual change and real regression risk, in exchange for a box nobody can see.

---

### Phase 2 — the card labels fit the card

**File.** `src/components/sections/ProblemSection.tsx`.

**Approach.** The card is `w-space-24 / sm:w-space-32 / lg:w-space-40` — three absolute steps
against a radius that is fluid, which is the same mismatch as Phase 1 one level down. Prefer
making the card's width derive from the square (a percentage of the container, or a `clamp()`
whose floor is wide enough for the longest label) over adding a fourth absolute step.

The longest label is `EXPERIÊNCIA` at 92px rendered. Whatever width is chosen, its content box
must clear that with the webfont loaded — `document.fonts.ready`, not the fallback metrics.

Check `src/app/globals.css` for an existing token before introducing a value. If nothing in the
scale fits, stop and say so rather than adding an arbitrary `[...]` utility — there are only 13
arbitrary values in the whole repo and this file has 5 of them.

**Acceptance.** `no text paints outside the box that is supposed to hold it` reports nothing for
the orbit cards at any width from 320px to 1696px, in all three projects, measured with
`Range.getClientRects()` after the webfont has loaded.

---

### Phase 3 — the missing media (needs Gabriel first, then safe for Codex)

**Measured.** `public/` is empty. `TestimonialsSection.tsx:64,103-104` reference
`images/bruno-pontes.webp` and `videos/bruno-pontes.mp4`; both return **404** from the served
export (verified over HTTP). The case card renders a broken-image icon — visible in the 390px
screenshot. `ServicesSection.tsx:151,197,243` hotlink three photos from
`https://images.unsplash.com/`.

**Blocked on Gabriel:** the actual asset files, and a decision on the Unsplash images (license
and a third-party request on every page load, on a page that is otherwise a self-contained
static export).

**Safe for Codex once the files exist:** the `src` values are relative (`images/…`), which
resolves correctly only from the root page. Under `basePath: "/tessele"` any nested route would
break. They should go through the same basePath the rest of the export uses.

---

### Phase 4 — the pricing grid's breakpoint gap (safe for Codex)

**File.** `src/components/sections/PricingSection.tsx`.

**Measured.** `PricingGrid` (`PricingSection.tsx:406-412`) goes `grid-cols-1` straight to
`lg:grid-cols-3`, so from 768px to 1023px the three plans stack in one ~500px-wide column with
the copy floating in it. Confirmed in a 768px screenshot.

In the same screenshot the `MAIS ESCOLHIDO` badge (`PricingSection.tsx:346-352`,
`absolute left-1/2 top-space-0 -translate-x-1/2 -translate-y-1/2`) sits half outside its card
and lands in the gap above it — reading as a label for the *previous* card when the cards are
stacked. It only works when the cards are side by side.

**Acceptance.** No sibling overlap and no orphaned badge at 768/900/1023px, and the existing
`layout holds at Npx` tests still pass.

---

### Phase 5 — the cases rail (needs a decision from Gabriel)

**Measured.** The rail at `TestimonialsSection.tsx:418` is `overflow-x-auto` holding two cards
that are `w-full max-w-wide shrink-0`. It therefore hides content at **every** width: 304px at
320px, 685px at 768px, 1120px at 1280px, still 768px at 1696px. It is the only thing on the
page that scrolls horizontally, and `lg:snap-none` removes even the snap on desktop. There is no
arrow, dot or visible barre — on macOS the overlay scrollbar is invisible until you gesture.

**The decision is Gabriel's,** because it is a design question, not a defect with one right
answer: two cases in a carousel with no affordance, or two cases side by side with no carousel.
The suite's `hiddenScrollers` check does not flag it (it only fires when the scrollbar is hidden
by CSS, and here it is hidden by macOS), which is a sixth blind spot worth closing either way.

---

### Phase 6 — `ServicesSection.tsx` formatting (safe for Codex, do last)

1492 lines, indented with 4 spaces, with **zero** lines starting at 2 spaces — the only file in
`src/` like that; every other section mixes both, at 2. The wrapping puts `service.tag` alone on
its own line inside its own braces, which is where the 1492 lines come from (roughly 400 lines
of actual code). The repo has no Prettier and ESLint has no formatting rules, so nothing catches
it and nothing will fix it automatically.

Behaviour-preserving reformat only, in its own commit, so the diff stays reviewable and never
mixes with a behaviour change. `npm run build`, `npm run lint` and the full Playwright suite
must be identical before and after.

---

## Out of scope

- **The six placeholder sections.** `AboutUsSection`, `FAQSection`, `PlansSection`,
  `ContactUsSection`, `FooterSection` and `ExampleMotionSection` still render the scaffold's
  three lines. Already recorded as Phase 3 of `2026-09-01-landing-responsive-fixes.md`; still
  blocked on content, not code.
- **`PlansSection` vs `PricingSection`** — a product question, unchanged from that document.
- **The hero CTA.** Its phase landed in `b80ce76`; nothing in this plan touches `Hero.tsx`.
- **Design fidelity to the Figma.** Nothing here claims a section does or does not match a
  design. Every item is a case where the page contradicts itself or the browser.

## Rules for every phase

- **Codex never edits anything under `tests/`.** Claude writes the tests, runs them, and shows
  them failing before Codex sees the phase.
- No `@ts-ignore`, no `eslint-disable`, no `test.skip`, no new entry in the spec's `ALLOWED`
  object, no weakened assertion, no widened `catch`. If the only route to green passes through
  one of those, **stop and say which check would have to be turned off and why.**
- A clip is not a fix **while nothing measures what it hides** — that is what turned a visible
  bug into an invisible one here. Adding one to make a check pass, with no assertion covering the
  content behind it, counts as silencing that check. Phase 1 revised this rule after hitting it;
  read its "What actually landed" note before reaching for a clip in a later phase.
- `npm run build`, `npm run lint` and `npx playwright test` all pass before a phase is handed
  back, with output shown.
- Commits in English, small and semantic. One phase per Codex invocation.
