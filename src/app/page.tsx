import ExampleMotionSection from "@/components/sections/ExampleMotionSection";
import ExampleStaticSection from "@/components/sections/ExampleStaticSection";

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
 * The two Example* sections are scaffolding. Delete both files and their imports
 * once you have written a real section.
 */
export default function Home() {
  return (
    <main>
      <ExampleStaticSection />
      <ExampleMotionSection />
    </main>
  );
}
