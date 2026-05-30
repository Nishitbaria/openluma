"use client"

import { ArrowRight, Code2 } from "lucide-react"
import Link from "next/link"

import { PixelParagraph } from "@/components/ui/pixel-paragraph-words"
import { PixelHeading } from "@/components/ui/pixel-heading-character"
import { MetalButton } from "@/components/ui/metal-button"
import { Button } from "@/components/ui/button"
import { GitHubIcon } from "@/components/icons"

export function CtaSection() {
  return (
    <section className="border-t bg-muted/30 py-24" id="about">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Code2 className="mx-auto mb-6 size-10 text-primary" />
          <PixelHeading
            as="h2"
            mode="wave"
            autoPlay
            cycleInterval={350}
            staggerDelay={100}
            showLabel={false}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Open source, forever
          </PixelHeading>
          <PixelParagraph
            text="OpenLuma is MIT-licensed and free to self-host. Inspect the code, contribute features, or deploy your own instance. No vendor lock-in, no surprise pricing."
            pixelWords={["MIT-licensed", "self-host", "vendor lock-in"]}
            font="circle"
            pixelWordClassName="text-foreground"
            className="mt-4 text-muted-foreground leading-relaxed"
          />
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MetalButton asChild size="lg">
              <Link href="/sign-up">
                Start for Free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </MetalButton>
            <Button asChild variant="outline" size="lg">
              <a
                href="https://github.com/Nishitbaria/openluma"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="mr-2 size-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
