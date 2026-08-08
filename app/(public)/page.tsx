import type { Metadata } from "next";
import { CtaSection } from "@/components/layout/cta-section";
import { FeatureCards } from "@/components/layout/feature-cards";
import { HeroSection } from "@/components/layout/hero-section";
import { HowItWorks } from "@/components/layout/how-it-works";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";
import { buildPageMetadata } from "@/lib/seo/metadata";

const HOME_DESCRIPTION =
  "Run events end to end on OpenLuma: create them with AI, share a public page, collect RSVPs, send invitations, and check attendees in — all open source.";

export const metadata: Metadata = buildPageMetadata({
  description: HOME_DESCRIPTION,
  // `app/opengraph-image.tsx` lives on an ancestor segment, so it is dropped by
  // this page's own `openGraph` unless pointed at explicitly.
  images: ["/opengraph-image"],
  path: "/",
  // Title is intentionally omitted: the root layout supplies the default
  // (untemplated) one, and setting it here would render "… · OpenLuma".
});

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <HeroSection />

      {/* Features — one job: capability catalog */}
      <section className="border-t bg-muted/30 py-24" id="features">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
              Everything you need to run events
            </h2>
            <PixelParagraph
              className="mt-4 text-muted-foreground"
              font="circle"
              pixelWordClassName="text-foreground"
              pixelWords={["creation to check-in"]}
              text="From creation to check-in — the full lifecycle, without renting someone else's stack."
            />
          </div>
          <FeatureCards />
        </div>
      </section>

      {/* How it works — one job: get started path */}
      <section className="py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
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
