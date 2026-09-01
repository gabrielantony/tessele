# Curtain transition between the Hero and the Quote section

Date: 2026-09-01
Status: built

Sections marked **corrected** record where the design as approved turned out to be
wrong once measured. They are kept rather than rewritten away, because the wrong
version is the one someone will otherwise re-propose.

## What we are building

A scroll-driven curtain that closes over the Hero as the reader leaves it, handing
the screen to `QuoteSection`.

Five full-height vertical panels in `--color-accent`, separated by hairlines, grow
upward from the bottom of the viewport in a staggered order that starts at the
centre column and spreads to the edges. By the time the last panel lands, the whole
viewport is accent -- which is also `QuoteSection`'s ground colour, so the two meet
on the same colour and the seam is not visible.

## Reference

`https://smart-site-282803.framer.app/` (measured 2026-09-01).

The mechanic there is a preloader, not a scroll transition, but the choreography is
what we are borrowing. Its DOM is five `position: absolute` panels at `width: 20%`,
`top: -20px; bottom: 0`, filled `rgb(255, 47, 0)`, each carrying
`border-left: 1px solid rgba(255, 255, 255, 0.2)`. Three CSS variants drive it:

- `framer-v-5jw241`: panel 3 collapsed
- `framer-v-cmjlsz`: panels 2, 3, 4 collapsed
- `framer-v-sbb5zo`: all five collapsed

Collapsing is `bottom: unset; height: 1%`, so panels retract upward from the top
edge, centre first, edges last.

## Decisions and why

**Direction: the curtain rises from the bottom and covers.** This is the one place
the implementation departs from the reference, deliberately. That gesture is on a
timer and owes the scroll nothing; this one *is* the scroll, and the section it
hands over to arrives from below -- so dark rising from the bottom travels the way
the reader's own input is already pointing.

**Scrubbed to scroll, not time-based.** The rest of the page is Lenis + `scrub`. An
animation with its own duration dropped into the middle of that fights whoever is
scrolling: they scroll, and it keeps going on its own clock.

**Costs one viewport of scroll.** The gesture needs room for the stagger to be read
as five panels rather than one blur.

**Hairlines stay while the panels move, and go when they stop.** Panels of the same
colour touching each other read as one block and the stagger becomes nearly
invisible; the hairlines are what make it legible as five panels. Once the curtain
is shut they stop being structure and become debris on what is by then just the
Quote section's ground -- and they take a whole viewport to scroll up and off, which
is the only thing moving on screen at that point. So they fade across the hold beat,
which costs no scroll because that beat was already a hold.

**Three columns below `md`.** At 375px, five columns are 75px each -- too narrow to
read as panels, and the centre-out stagger becomes noise. Three gives 125px each.

**Hero content leaves along with the curtain.** Chosen against the recommendation to
freeze it; the mitigation below (front-loading the exit) exists only because of it.

## Architecture

New component `src/components/CurtainTransition.tsx`, wrapping the Hero in
`src/app/page.tsx`:

```tsx
<CurtainTransition>
  <Hero />
</CurtainTransition>
<QuoteSection />
```

The curtain is the seam *between* two sections and belongs to neither. Living inside
`Hero` would make the Hero know `QuoteSection`'s colour; living in `QuoteSection`'s
lead-in would make the Quote know a Hero sits above it. Wrapping keeps both sections
ignorant of each other, and `page.tsx` still reads as a stack.

### Structure

```
<div class="relative">                                  -- sticky containing block
  {children}                                            -- the Hero, in normal flow
  <div class="h-dvh bg-canvas" />                        -- the runway
  <div class="absolute inset-0 z-10">
    <div class="sticky top-0 h-dvh">                     -- the five panels
  </div>
</div>
```

### What is held — corrected

The approved design held the *Hero* with `position: sticky; bottom: 0`, on the
reasoning that `bottom-0` would let a Hero taller than the viewport scroll until its
own bottom edge reached the bottom of the screen and freeze it there. That reasoning
is wrong, and the code built from it did nothing at all.

Measured in isolation -- a 600px `sticky bottom-0` box as the first child of a
1200px wrapper, in a 600px viewport:

```
y=0 → bottom 600 | y=300 → bottom 300 | y=600 → bottom 0
```

It scrolls away like any static element. `bottom` sticky pulls a box *up* toward an
edge it is short of; it is for elements at the end of a container, and it never
pushes a box down to keep it on screen. The only sticky offset that holds something
while scrolling down is `top`, and `top-0` on the Hero would freeze it at the first
pixel of scroll -- which on a phone, where the Hero is `min-h-[48.75rem]` (780px)
against a ~745px `dvh`, puts its CTA permanently out of reach.

**What is held instead is the curtain.** It is exactly one viewport tall by
construction, so `sticky top-0` on a `h-dvh` box is the case sticky handles without
any caveat, at every screen size. The Hero scrolls out behind it.

Nothing is lost by letting the Hero go. Its content has already left by the time it
matters, and what scrolls behind the panels from then on is a flat canvas field --
which looks identical held or moving. That is also why the runway carries
`bg-canvas`: it is what the reader is looking at under the panels once the Hero has
passed, and it has to be the Hero's own ground or a seam appears mid-fall.

### Why CSS sticky and not `pin: true`

The same reasoning already documented in `QuoteSection.tsx`: a GSAP pin swaps the
element to `position: fixed` and inserts a spacer, and that swap is the
discontinuity the eye catches. Sticky has no engage step and the browser composites
it. Using the same mechanism for both held things also means one behaviour to
maintain rather than two.

### Where the ScrollTrigger starts and ends

The runway element is itself the trigger: `start: "top bottom"`, `end: "bottom
bottom"`. Its top edge is the Hero's bottom edge, and its own height is the runway,
so the timeline spans exactly the scroll the CSS allocates -- and the curtain's
`sticky top-0` starts and ends on the same two moments without either being told
about the other.

Writing the distance as `+=window.innerHeight` instead would state the runway's
length a second time, in a second language, and the two could drift: a timeline
shorter than the runway sits closed doing nothing before the release, a longer one
gets cut off mid-stagger. This way the length lives only in CSS and there is nothing
for a resize to recompute wrongly.

## Choreography

Mapped across the 100dvh runway, as a single scrubbed timeline:

| runway | what happens |
| --- | --- |
| 0 to 35% | Hero content rises (`y: -40`) and fades out |
| 15 to 90% | panels rise, `scaleY` 0 to 1, `transform-origin: bottom`, stagger `from: "center"` |
| 90 to 100% | curtain held shut, hairlines fading out |

The Hero content's exit is front-loaded rather than spread across the whole runway.
It overlaps the curtain's opening -- the "leaves along with it" that was asked for --
but the curtain runs alone for the final 55%, which is where the centre-out stagger
has to be read. Running both in parallel end to end is what makes neither of them
get seen whole. The `y` it travels is on top of the scroll the page is already
giving it, so the content leaves faster than the page moves; that difference is what
makes it read as departing rather than as the page merely scrolling.

Panels animate `scaleY`, not `height`. `height` is a layout property and forces
reflow every frame; `scaleY` runs on the compositor. On a solid fill the two are
visually identical, and a vertical hairline does not deform under a Y-only scale.

Per-panel ease `power2.inOut` with a stagger that overlaps heavily, so the rise
reads as one gesture with a leading centre rather than five separate strokes.

## When the sentence starts — added

`QuoteSection` was out of scope in the approved design. It could not stay that way.

Its reveal began at `start: "top top"`, and the half viewport between the sticky
engaging and that point was a breath: the sentence sat centred and blank while the
dark ground was still arriving behind it. The curtain now delivers that ground a
viewport earlier, so nothing was arriving any more -- it had already arrived.

Measured on a 900px-tall window: the curtain finished at y=852 and the first word
did not appear until y=1812. 960px, better than a full screen, of a flat field with
nothing happening in it.

Moving the start to `top center` -- the exact scroll position where `top-[50dvh]`
engages the sticky, so the words begin as the sentence lands where it is held --
brings that to 504px, and leaves 416px of beat holding the finished sentence, closer
to the ~300px the section's own comment says it wants than the ~0 it had before.

## Responsive

All five panels are `flex-1`. Indices 1 and 3 carry `hidden md:block`, so below `md`
the three remaining panels take a third each with no width branch in the markup.

`gsap.matchMedia()` selects which array to animate:

- `(min-width: 768px)`: all five panels
- `(max-width: 767px)`: panels 0, 2, 4

Selecting the array matters rather than letting GSAP pick up all five: a
`display: none` panel still occupies a slot in a `from: "center"` stagger, which
would insert a dead beat in the middle of the rise.

Hairlines are `border-l` of 1px in `--color-on-accent-border` on every panel except
the first. Hidden panels take no space, so below `md` panel 2's left border lands
exactly on the divider between the visible thirds.

## Reduced motion

`motion-reduce:hidden` on both the runway spacer and the panel overlay, and the GSAP
setup declines to build the timeline.

Handled in CSS rather than a mounted state flag so there is no hydration branch and
no flash. With the runway gone, the wrapper collapses to the Hero's own height and
the page is exactly as long as it was before this existed -- which the suite asserts
by measuring the two page heights and requiring the difference to be one viewport.

## Files touched

- `src/components/CurtainTransition.tsx` -- new
- `tests/layout/sections/curtain.spec.mjs` -- new
- `src/app/page.tsx` -- wrap `<Hero />`, update the header comment
- `src/components/sections/Hero.tsx` -- mark the two content blocks with
  `data-hero-content`. The CTA is wrapped in a marked `div` rather than marked
  itself, because `CTAButton` already owns `y` and `scale` for hover, press and
  focus, and a settle firing mid-scrub would stomp the curtain's exit tween.
- `src/components/sections/QuoteSection.tsx` -- `start: "top center"`, see above
- `tests/layout/sections/quote.spec.mjs` -- the walk now opens a viewport above the
  section, since the reveal starts half a viewport earlier than it used to
- `tests/layout/sections/foundations.spec.mjs` -- the hero CTA test scoped the Hero
  as `main > section:first-of-type`. Wrapping the Hero made that selector silently
  retarget the Quote section, so it now identifies the Hero as the section carrying
  the page's h1. The assertion is unchanged.

## Out of scope

Reusing the curtain at any other section seam. If a second seam wants it later, the
component is already a wrapper and can take one, but nothing is generalised for a
caller that does not exist.
