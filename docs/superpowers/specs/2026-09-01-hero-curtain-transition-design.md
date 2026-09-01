# Curtain transition between the Hero and the Quote section

Date: 2026-09-01
Status: approved, ready for planning

## What we are building

A scroll-driven curtain that closes over the Hero as the reader leaves it, handing
the screen to `QuoteSection`.

Five full-height vertical panels in `--color-accent`, separated by hairlines, grow
downward from the top of the viewport in a staggered order that starts at the centre
column and spreads to the edges. By the time the last panel lands, the whole viewport
is accent -- which is also `QuoteSection`'s ground colour, so the two meet on the same
colour and the seam is not visible.

## Reference

`https://smart-site-282803.framer.app/` (measured 2026-09-01).

The mechanic there is a preloader, not a scroll transition, but the choreography is
what we are borrowing. Its DOM is five `position: absolute` panels at `width: 20%`,
`top: -20px; bottom: 0`, filled `rgb(255, 47, 0)`, each carrying
`border-left: 1px solid rgba(255, 255, 255, 0.2)`. Three CSS variants drive it:

- `framer-v-5jw241`: panel 3 collapsed
- `framer-v-cmjlsz`: panels 2, 3, 4 collapsed
- `framer-v-sbb5zo`: all five collapsed

Collapsing is `bottom: unset; height: 1%`, so panels retract upward from the top edge,
centre first, edges last. We run the same choreography in reverse -- panels growing
downward instead of retracting upward -- because our destination is the dark section:
the curtain should read as the dark ground arriving, not as something leaving.

## Decisions and why

**Direction: the curtain descends and covers.** The alternatives were panels rising
from the bottom (more literal to scroll, but loses the falling-curtain gesture) and
the reference's literal retract-to-reveal (which would need a flat cream screen
mid-page first, and that reads as a render bug rather than an effect).

**Scrubbed to scroll, not time-based.** The rest of the page is Lenis + `scrub`. An
animation with its own duration dropped into the middle of that fights whoever is
scrolling: they scroll, and it keeps going on its own clock.

**Costs one viewport of scroll.** The gesture needs room for the stagger to be read as
five panels rather than one blur. Riding `QuoteSection`'s existing 50dvh lead-in would
have been free but cramps the stagger on short screens.

**Hairlines stay.** Panels of the same colour touching each other read as one block,
and the stagger becomes nearly invisible. The hairlines are what make it legible as
five panels.

**Three columns below `md`.** At 375px, five columns are 75px each -- too narrow to
read as panels, and the centre-out stagger becomes noise. Three gives 125px each and
keeps the choreography.

**Hero content leaves along with the curtain.** Chosen against the recommendation to
freeze the Hero entirely; recorded here because the mitigation below exists only
because of it.

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

`page.tsx`'s header comment claims the file only stacks sections in order. It gains a
wrapper, so that comment is updated in the same change.

### Structure

```
<div>                                          -- the sticky containing block
  <div class="sticky bottom-0">
    {children}                                 -- the Hero, at its natural height
    <div class="absolute inset-x-0 bottom-0 h-dvh"> -- the five panels
  </div>
  <div class="h-[100dvh]" />                   -- the runway
</div>
```

### Why CSS sticky and not `pin: true`

The same reasoning already documented in `QuoteSection.tsx`: a GSAP pin swaps the
element to `position: fixed` and inserts a spacer, and that swap is the discontinuity
the eye catches. Sticky has no engage step and the browser composites it. Using the
same mechanism for both held sections also means one behaviour to maintain rather than
two.

### Why `bottom-0` and not `top-0`

The Hero is `min-h-[48.75rem]` (780px). On a phone with the URL bar showing, `dvh` is
around 745px -- so on mobile the Hero is taller than the viewport. With `top-0` it
would stick at the first pixel of scroll and the CTA would be permanently off-screen.

With `bottom-0` it scrolls normally until its own bottom edge reaches the bottom of
the viewport and only then freezes, showing the Hero's last viewport-full. On desktop,
where the Hero is exactly `100dvh`, that happens at scroll 0 and the result is
identical to `top-0`.

One declaration covers both cases without measuring anything in JS, which matters:
`QuoteSection` deliberately owns no geometry so a resize has nothing to recompute
wrongly, and this component holds to the same rule.

The panel overlay is anchored `bottom-0 h-dvh` inside the same sticky box, so it
covers exactly the frozen viewport in both cases.

### Where the ScrollTrigger starts and ends

Trigger on the Hero element, `start: "bottom bottom"` -- the moment sticky engages --
and `end: () => "+=" + window.innerHeight`. Expressed as a function so it is
recomputed on refresh, matching `QuoteSection`'s `revealDistance()` shape. The trigger
owns no geometry of its own; the runway height is CSS.

The end distance and the runway are the same quantity written twice, in two languages:
`100dvh` in CSS and `window.innerHeight` in JS. They have to stay equal, because if the
timeline is shorter than the runway the curtain sits closed doing nothing before the
release, and if it is longer the fall gets cut off mid-stagger. `dvh` tracks the
dynamic viewport, which is what `innerHeight` reports, so they agree at any given
moment -- including on mobile, where a hiding URL bar changes both at once.
`invalidateOnRefresh: true` re-reads the JS side when that happens.

## Choreography

Mapped across the 100dvh runway, as a single scrubbed timeline:

| runway | what happens |
| --- | --- |
| 0 to 35% | Hero content rises (`y: -40`) and fades out |
| 15 to 90% | panels fall, `scaleY` 0 to 1, `transform-origin: top`, stagger `from: "center"` |
| 90 to 100% | curtain held closed, a beat before release |

The Hero content's exit is front-loaded rather than spread across the whole runway.
It overlaps the curtain's opening -- the "leaves along with it" that was asked for --
but the curtain runs alone for the final 55%, which is where the centre-out stagger
has to be read. Running both in parallel end to end is what makes neither of them get
seen whole.

Panels animate `scaleY`, not `height`. `height` is a layout property and forces reflow
every frame; `scaleY` runs on the compositor. On a solid fill the two are visually
identical, and a vertical hairline does not deform under a Y-only scale.

Per-panel ease `power2.inOut` with a stagger that overlaps heavily, so the fall reads
as one gesture with a leading centre rather than five separate drops.

## Responsive

All five panels are `flex-1`. Indices 1 and 3 carry `hidden md:block`, so below `md`
the three remaining panels take a third each with no width branch in the markup.

`gsap.matchMedia()` selects which array to animate:

- `(min-width: 768px)`: all five panels
- `(max-width: 767px)`: panels 0, 2, 4

Selecting the array matters rather than letting GSAP pick up all five: a `display: none`
panel still occupies a slot in a `from: "center"` stagger, which would insert a dead
beat in the middle of the fall.

Hairlines are `border-l` of 1px in `--color-on-accent-border` on every panel except the
first. Hidden panels take no space, so below `md` panel 2's left border lands exactly
on the divider between the visible thirds.

## Reduced motion

`motion-reduce:hidden` on both the runway spacer and the panel overlay, and the GSAP
setup bails on `prefers-reduced-motion: reduce`.

Handled in CSS rather than a mounted state flag so there is no hydration branch and no
flash. With the runway gone, the wrapper collapses to the Hero's own height and the
page behaves exactly as it does today. `sticky bottom-0` with no runway below it has
nothing to stick over, so it is inert.

## Files touched

- `src/components/CurtainTransition.tsx` -- new
- `src/app/page.tsx` -- wrap `<Hero />`, update the header comment
- `src/components/sections/Hero.tsx` -- mark the two content blocks with
  `data-hero-content`, so the curtain animates them explicitly instead of reaching for
  `children` by position

## Out of scope

- Any change to `QuoteSection`. It already ends where it needs to and shares the
  colour the curtain lands on.
- Reusing the curtain at any other section seam. If a second seam wants it later, the
  component is already a wrapper and can take one, but nothing is generalised for a
  caller that does not exist.
