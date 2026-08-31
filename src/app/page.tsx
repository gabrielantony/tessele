import ExampleMotionSection from "@/components/sections/ExampleMotionSection";
import Hero from "@/components/sections/Hero";

/*
 * This file IS the page. It does nothing but stack sections in order.
 *
 * To add a section:
 *   1. create src/components/sections/YourSection.tsx
 *   2. import it above
 *   3. drop <YourSection /> in the list below, where you want it to appear
 *
 * Reordering the page = moving one line here.
 *
 * ExampleMotionSection is scaffolding — delete the file and its import once you
 * no longer need it as a reference.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <ExampleMotionSection />
    </main>
  );
}
