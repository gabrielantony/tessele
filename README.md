# Tessele — landing page

Static single page: Next.js (static export), Tailwind 4, GSAP. Built to `out/` and
served by GitHub Pages under the `/tessele/` subpath.

## Commands

```sh
npm run dev     # dev server at http://localhost:3000
npm run build   # type-check + static export into out/
npm run lint    # eslint, including the React hooks rules
```

Node >= 22.

## Where you write each section

**One section per file, in `src/components/sections/`.** Each file is independent:
its own markup, its own classes, its own motion. Nothing outside it needs to know
how it works.

```
src/
  app/
    page.tsx        ← stacks the sections in order. This is the whole page.
    layout.tsx      ← <html>/<body>, fonts, metadata
    globals.css     ← design tokens (@theme) — colours, type, spacing, radius
    fonts.ts        ← Raleway + Fraunces
  components/
    sections/       ← ★ your sections go here, one file each
  fonts/            ← the two .woff2 files
docs/
  failure-archetypes.md   ← read before writing scroll motion
```

To add a section:

1. Create `src/components/sections/Hero.tsx`
2. Import it in `src/app/page.tsx`
3. Add `<Hero />` to the list, in the position you want

Reordering the page is moving one line in `page.tsx`.

## Two shapes of section

`ExampleStaticSection.tsx` and `ExampleMotionSection.tsx` are scaffolding — delete
both once you have written a real section. They exist to show the difference:

- **No motion:** a plain function, no `"use client"`. Renders to HTML at build
  time and ships zero JavaScript. Most sections are this.
- **With motion:** `"use client"` at the top, and `useGSAP({ scope })` instead of
  `useEffect`. `useGSAP` reverts its tweens and ScrollTriggers automatically, which
  is what stops triggers from stacking on re-render.

Forgetting `"use client"` on an animated section is the most common failure in
generated Next.js + GSAP code. The error message does not say so.

## Styling rule: utilities only, no hand-written CSS

Every colour, size and space comes from a token in `globals.css` and is used through
a Tailwind utility — `bg-canvas`, `px-page`, `py-section`, `text-heading-2`,
`mt-space-6`, `rounded-lg`.

Do not add a `<style>` block or a `.css` file next to a section. With no place to
hide a raw `1.5rem`, the design system cannot drift — which is why this project
carries no contract tests. If a value you need is missing, add the token to
`globals.css` rather than inlining the number.

The type scale steps up at `48rem` by redefining the tokens in one media query in
`globals.css`. Sections never need their own breakpoint for type size.

## Motion

GSAP with `@gsap/react`. Every animated section must also work with
`prefers-reduced-motion: reduce` — restore the static end state, do not just run a
faster animation.

`docs/failure-archetypes.md` carries 13 root-cause classes that already caused bugs
in this area on the previous build of this page. They are about GSAP, scroll and
lifecycle, not about any framework, so they all still apply. Read it before writing
a scroll sequence.

## Deploy

`.github/workflows/deploy.yml` builds on push to `main` and publishes `out/`.
`basePath` is set to `/tessele` for production builds only, in `next.config.ts` —
dev stays at the root. Change it there if the URL changes.
