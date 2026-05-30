import { CtaSection } from "@/components/layout/cta-section";
import { FeatureCards } from "@/components/layout/feature-cards";
import { HeroSection } from "@/components/layout/hero-section";
import { HowItWorks } from "@/components/layout/how-it-works";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <HeroSection />

      {/* Features */}
      <section className="border-t bg-muted/30 py-24" id="features">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run events
            </h2>
            <PixelParagraph
              text="From creation to check-in, OpenLuma handles the entire event lifecycle with modern tools and an AI assistant."
              pixelWords={["creation to check-in", "AI assistant"]}
              font="circle"
              pixelWordClassName="text-foreground"
              className="mt-4 text-muted-foreground"
            />
          </div>
          <FeatureCards />
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-muted-foreground">
              No complex setup. No credit card required.
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Open source CTA */}
      <CtaSection />
    </div>
  );
}
