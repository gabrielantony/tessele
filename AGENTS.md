# Tessele — landing page

Institutional single page for Tessele: Next.js static export, Tailwind 4, GSAP,
served by GitHub Pages at the root of `tessele.com.br`. The README explains how
to write a section; this file is the map and the rules.

## Repo map

| Path | What lives there |
|---|---|
| `src/app/page.tsx` | Stacks the sections in order — the whole page |
| `src/app/globals.css` | The design tokens (`@theme`) every utility is built from |
| `src/components/sections/` | One section per file, self-contained |
| `src/fonts/` | The two `.woff2` files (Raleway, Fraunces) |
| `scripts/generate-tokens-doc.mjs` | Generates `docs/TOKENS.md` |
| `scripts/serve-export.mjs` | Serves `out/` for the test suite |
| `tests/layout/` | Playwright: measures the built export, not the dev server |
| `public/CNAME` | The custom domain (`tessele.com.br`) the export ships with |
| `.github/workflows/deploy.yml` | Builds on push to `main`, publishes `out/` |

## Commands

```sh
npm ci                 # install from the lockfile (Node >= 22)
npm run dev            # dev server at http://localhost:3000
npm run build          # type-check + static export into out/
npm run lint           # eslint, including the React hooks rules
npm test               # playwright; builds and serves the export itself
npm run tokens:doc     # regenerate docs/TOKENS.md after changing a token
```

One spec, one engine: `npx playwright test tests/layout/sections/about.spec.mjs --project=chromium`.

## Project rules

- **Static export, no runtime.** No route handlers, no server actions, no image
  optimizer (`images.unoptimized`). Anything that needs a server does not ship.
- **Asset paths are relative.** `images/foo.jpg`, never `/images/foo.jpg` —
  the whole export follows this, so a page resolves its assets next to itself
  wherever the export is served from. `tests/layout/sections/about.spec.mjs`
  asserts the form.
- **Utilities only, from tokens.** No `<style>` block, no `.css` file next to a
  section. A value with no token means adding the token to `globals.css`, never
  inlining the number.
- **No per-section breakpoint for type or spacing scale.** The scale steps up at
  `48rem` by redefining the tokens in one media query in `globals.css`.
- **A Figma frame is one viewport.** Translate its values into tokens, not into
  pixels — the token carries the step down to mobile the frame never described.
- **Animated sections need `"use client"` and `useGSAP({ scope })`**, plus a
  reduced-motion path that restores the static end state rather than animating
  faster. Read `docs/failure-archetypes.md` before writing a scroll sequence.
- **Width-dependent layout queries the container, not the viewport.** Section
  widths are not monotonic in viewport width — a column appearing beside a card
  makes it narrower as the window grows.
- **Never weaken a layout test to make it pass.** Every assertion in
  `tests/layout/` is a measurement; loosening a threshold or skipping a width
  removes the only evidence the page is correct. Fix the layout, or say which
  check would have to be turned off and why.

## Docs

- `docs/TOKENS.md` — the token list as a section author types it. Generated.
- `docs/failure-archetypes.md` — root-cause classes that already caused bugs in
  this page's scroll and lifecycle code. Read before planning motion.
- `docs/plans/` — implementation plans. `docs/superpowers/specs/` — designs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
