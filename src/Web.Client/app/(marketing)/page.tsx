import { HeroSection } from "@/components/marketing/HeroSection";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CtaSection } from "@/components/marketing/CtaSection";

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <Features />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
