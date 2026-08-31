/*
 * SCAFFOLDING — delete this file.
 *
 * Shape of a section with no motion. No "use client": it renders to plain HTML at
 * build time and ships zero JavaScript. Most sections should look like this.
 *
 * Every value below comes from a token in src/app/globals.css. Reach for a
 * utility (px-page, py-section, text-heading-2, text-muted) instead of a raw
 * value — that is what keeps the page one design system instead of nineteen.
 */
export default function ExampleStaticSection() {
  return (
    <section className="bg-canvas px-page py-section">
      <div className="mx-auto w-full max-w-(--container-content)">
        <p className="text-label text-muted uppercase">Static section</p>
        <h2 className="text-heading-2 font-display mt-space-4">
          Placeholder heading
        </h2>
        <p className="text-lead text-muted mt-space-6 max-w-[35rem]">
          Placeholder copy. Nothing here is design or content — it exists to show
          which utilities are wired up.
        </p>
      </div>
    </section>
  );
}
