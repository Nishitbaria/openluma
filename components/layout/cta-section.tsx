"use client";

import { ArrowRight, Code2 } from "lucide-react";
import Link from "next/link";
import { GitHubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MetalButton } from "@/components/ui/metal-button";
import { PixelHeading } from "@/components/ui/pixel-heading-character";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

export function CtaSection() {
  return (
    <section className="border-t bg-muted/30 py-24" id="about">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Code2 className="mx-auto mb-6 size-10 text-primary" />
          <PixelHeading
            as="h2"
            autoPlay
            className="font-bold text-3xl tracking-tight sm:text-4xl"
            cycleInterval={350}
            mode="wave"
            showLabel={false}
            staggerDelay={100}
          >
            Open source, forever
          </PixelHeading>
          <PixelParagraph
            className="mt-4 text-muted-foreground leading-relaxed"
            font="circle"
            pixelWordClassName="text-foreground"
            pixelWords={["MIT-licensed", "self-host", "vendor lock-in"]}
            text="OpenLuma is MIT-licensed and free to self-host. Inspect the code, contribute features, or deploy your own instance. No vendor lock-in, no surprise pricing."
          />
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MetalButton asChild size="lg">
              <Link href="/sign-up">
                Start for Free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </MetalButton>
            <Button asChild size="lg" variant="outline">
              <a
                href="https://github.com/Nishitbaria/openluma"
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitHubIcon className="mr-2 size-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
