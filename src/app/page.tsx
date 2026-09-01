import CurtainTransition from "@/components/CurtainTransition";
import Hero from "@/components/sections/Hero";
import QuoteSection from "@/components/sections/QuoteSection";
import ProblemSection from "@/components/sections/ProblemSection";
import OurProcessSection from "@/components/sections/OurProcessSection";
import ServicesSection from "@/components/sections/ServicesSection";
// import TestimonialsSection from "@/components/sections/TestimonialsSection";
import PricingSection from "@/components/sections/PricingSection";
import AboutUsSection from "@/components/sections/AboutUsSection";
import FAQSection from "@/components/sections/FAQSection";
import ContactUsSection from "@/components/sections/ContactUsSection";
import FooterSection from "@/components/sections/FooterSection";

/*
 * This file IS the page. It does nothing but stack sections in order.
 *
 * The one exception is CurtainTransition, which is not a section: it is the seam
 * between two of them, so it wraps the Hero rather than sitting beside it. Adding
 * a section is still one line here.
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
      <CurtainTransition>
        <Hero />
      </CurtainTransition>
      <QuoteSection />
      <ProblemSection />
      <OurProcessSection />
      <ServicesSection />
      {/*
        Hidden until the real cases are ready -- the section still carries
        "Nome do cliente / Cargo e empresa" placeholders and invented metrics,
        which is worse on a live page than not having the section at all.

        Left commented rather than deleted: the component, its styles and its
        tests are all intact. Bringing it back is uncommenting this line and its
        import above, then un-skipping tests/layout/sections/testimonials.spec.mjs.
      */}
      {/* <TestimonialsSection /> */}
      <PricingSection />
      <AboutUsSection />
      <FAQSection />
      <ContactUsSection />
      <FooterSection />
    </main>
  );
}
