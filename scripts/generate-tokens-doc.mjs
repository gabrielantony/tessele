// Regenerates docs/TOKENS.md from the @theme block in src/app/globals.css.
//
// The point is the utility NAME. globals.css declares --color-canvas; what a
// section author (or a model) needs to type is bg-canvas. Anything that has to
// derive one from the other will sometimes derive it wrong, so this writes both.
//
// Run after changing a token, then re-upload docs/TOKENS.md wherever it is used
// as a reference — a stale copy is worse than none, because nothing announces it.

import { readFile, writeFile } from "node:fs/promises";

const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

const themeBlocks = [...css.matchAll(/@theme[^{]*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
const declarations = new Map();
for (const block of themeBlocks) {
  for (const [, name, value] of block.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    declarations.set(name, value.trim().replace(/\s+/g, " "));
  }
}

// Responsive overrides live in a media query outside @theme, so the type scale
// has a second value the section author never writes a breakpoint for.
const wide = new Map();
const mq = css.match(/@media \(min-width: 48rem\)\s*\{\s*:root\s*\{([\s\S]*?)\n\s*\}/);
if (mq) {
  for (const [, name, value] of mq[1].matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    wide.set(name, value.trim());
  }
}

// namespace -> how Tailwind builds the utility from the token name
const GROUPS = [
  { title: "Colour", prefix: "--color-", note: "Prefix each name with `bg-`, `text-`, `border-` or `ring-`.", utilities: (n) => n },
  { title: "Type", prefix: "--text-", note: "Use as `text-<name>`. See the modifier table below.", utilities: (n) => `text-${n}` },
  { title: "Spacing", prefix: "--spacing-", note: "Use with any spacing prefix: `p-`, `px-`, `py-`, `m-`, `mt-`, `gap-`, `size-`, `min-h-`.", utilities: (n) => n },
  { title: "Container width", prefix: "--container-", note: "Use as `max-w-<name>`.", utilities: (n) => `max-w-${n}` },
  { title: "Radius", prefix: "--radius-", note: "Use as `rounded-<name>`.", utilities: (n) => `rounded-${n}` },
  { title: "Shadow", prefix: "--shadow-", note: "Use as `shadow-<name>`.", utilities: (n) => `shadow-${n}` },
];

let out = `# Design tokens

Generated from \`src/app/globals.css\` by \`scripts/generate-tokens-doc.mjs\`. Do not
edit by hand — change the token in \`globals.css\` and re-run the script.

**The rule: every colour, size, space and radius comes from this table, through the
utility in the "Utility" column.** Never write a hex value, a raw \`px\`/\`rem\`, or a
class from Tailwind's default scale (\`text-sm\`, \`gap-4\`, \`rounded-lg\` as a bare
default, \`text-[16px]\`). If a value you need is not here, add the token to
\`globals.css\` and re-run this script — do not inline the number.

**A Figma frame describes one viewport.** It carries no breakpoints and no
line-break decisions. This scale already steps down on its own: the "≥48rem"
column is applied automatically, so a section never needs its own media query for
type size or page padding. Do not invent responsive values.

`;

for (const group of GROUPS) {
  const rows = [...declarations]
    .filter(([name]) => name.startsWith(group.prefix) && !name.includes("--", 2))
    .map(([name, value]) => {
      const short = name.slice(group.prefix.length);
      const wideValue = wide.get(name);
      return { short, value, wideValue, utility: group.utilities(short) };
    });
  if (!rows.length) continue;

  const anyWide = rows.some((r) => r.wideValue);
  out += `## ${group.title}\n\n${group.note}\n\n`;
  out += anyWide
    ? `| Name | Value | ≥48rem |\n|---|---|---|\n`
    : `| Name | Value |\n|---|---|\n`;
  for (const r of rows) {
    out += anyWide
      ? `| \`${r.utility}\` | ${r.value} | ${r.wideValue ?? "—"} |\n`
      : `| \`${r.utility}\` | ${r.value} |\n`;
  }
  out += "\n";
}

// The type tokens carry line-height, weight and tracking as modifiers, which is
// why a section must not add font-bold or leading-* next to a text-* utility.
out += `## What the type utilities already carry

Each \`text-*\` token sets font-size, line-height, font-weight and letter-spacing
together. Adding \`font-bold\`, \`font-medium\`, \`leading-*\` or \`tracking-*\` next to
one overrides the token and is always wrong.

| Utility | size / line-height / weight / tracking |
|---|---|
`;
for (const [name, value] of declarations) {
  if (!name.startsWith("--text-") || name.includes("--", 2)) continue;
  const short = name.slice("--text-".length);
  const get = (m) => declarations.get(`--text-${short}--${m}`) ?? "—";
  out += `| \`text-${short}\` | ${value} / ${get("line-height")} / ${get("font-weight")} / ${get("letter-spacing")} |\n`;
}

out += `
## Motion

| Token | Value |
|---|---|
`;
for (const [name, value] of declarations) {
  if (name.startsWith("--duration-") || name.startsWith("--ease-")) {
    out += `| \`var(${name})\` | ${value} |\n`;
  }
}

out += `
Read \`docs/failure-archetypes.md\` before writing any scroll sequence. Every
animated section also needs a \`prefers-reduced-motion\` path that restores the
static end state — the global CSS rule does not reach GSAP tweens.
`;

await writeFile(new URL("../docs/TOKENS.md", import.meta.url), out);
console.log("docs/TOKENS.md written");
