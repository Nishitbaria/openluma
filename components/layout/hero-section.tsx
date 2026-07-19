"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { MetalButton } from "@/components/ui/metal-button";
import { PixelHeading } from "@/components/ui/pixel-heading-character";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const gridColor =
    resolvedTheme === "dark" ? "rgb(255,255,255)" : "rgb(0,0,0)";

  return (
    <section className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
      {/* Flickering grid background — fades out toward bottom */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      >
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.1}
          color={gridColor}
          maxOpacity={0.06}
          className="size-full"
        />
      </div>

      <div className="mx-auto max-w-4xl flex flex-col items-center">
        {/* Badge with AnimatedShinyText */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="size-3.5 shrink-0" />
          <AnimatedShinyText>
            Open source · Self-hostable · AI-powered
          </AnimatedShinyText>
        </div>

        {/* Pixel headings */}
        <div className="mb-3 flex flex-col items-center gap-1">
          <PixelHeading
            mode="wave"
            autoPlay
            cycleInterval={300}
            staggerDelay={120}
            showLabel={false}
            className="text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl leading-none"
          >
            Events,
          </PixelHeading>
          <PixelHeading
            mode="random"
            autoPlay
            cycleInterval={400}
            staggerDelay={80}
            showLabel={false}
            className="text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl leading-none text-primary"
          >
            simplified.
          </PixelHeading>
        </div>

        {/* Description */}
        <PixelParagraph
          text="OpenLuma is a free, open-source event management platform. Create events with AI, manage attendees, send invitations, and check in guests all without vendor lock-in."
          pixelWords={["open-source", "AI", "vendor lock-in"]}
          font="circle"
          pixelWordClassName="text-foreground"
          className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed"
        />

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MetalButton asChild size="lg">
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </MetalButton>
          <Button asChild variant="outline" size="lg">
            <Link href="/events">Browse Events</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
