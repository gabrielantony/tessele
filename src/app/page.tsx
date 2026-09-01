import Hero from "@/components/sections/Hero";
import QuoteSection from "@/components/sections/QuoteSection";
import ProblemSection from "@/components/sections/ProblemSection";
import OurProcessSection from "@/components/sections/OurProcessSection";
import ServicesSection from "@/components/sections/ServicesSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import PricingSection from "@/components/sections/PricingSection";
import AboutUsSection from "@/components/sections/AboutUsSection";
import FAQSection from "@/components/sections/FAQSection";
import ContactUsSection from "@/components/sections/ContactUsSection";
import FooterSection from "@/components/sections/FooterSection";

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
      <QuoteSection />
      <ProblemSection />
      <OurProcessSection />
      <ServicesSection />
      <TestimonialsSection />
      <PricingSection />
      <AboutUsSection />
      <FAQSection />
      <ContactUsSection />
      <FooterSection />
    </main>
  );
}
