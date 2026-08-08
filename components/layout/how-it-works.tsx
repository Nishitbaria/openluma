"use client";

import { MetalIconButton } from "@/components/ui/metal-button";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

const steps = [
  {
    description: "Create your account in seconds with email or Google.",
    pixelWords: ["email or Google"],
    step: "1",
    title: "Sign up for free",
  },
  {
    description:
      "Use the AI chat or the form to set up your event with all the details.",
    pixelWords: ["AI chat"],
    step: "2",
    title: "Create an event",
  },
  {
    description:
      "Share the link, manage RSVPs, send invites, and check in attendees on the day.",
    pixelWords: ["RSVPs", "check in"],
    step: "3",
    title: "Share & manage",
  },
];

export function HowItWorks() {
  return (
    <div className="relative mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
      {/*
        Desktop connector: span from col-1 center → col-3 center.
        With 3 equal tracks + gap-8 (2rem × 2), each center sits at (100% - 4rem) / 6 from the edge.
        Circles sit above (z-10) so the dashed line reads as joining into them.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-5 z-0 hidden h-px border-border border-t border-dashed md:right-[calc((100%-4rem)/6)] md:left-[calc((100%-4rem)/6)] md:block"
      />

      {steps.map((item, i) => (
        <div
          className="fade-in slide-in-from-bottom-4 relative z-10 animate-in text-center duration-500"
          key={item.step}
          style={{
            animationDelay: `${i * 150}ms`,
            animationFillMode: "both",
          }}
        >
          <MetalIconButton
            aria-label={`Step ${item.step}`}
            className="size-10! font-bold text-base"
            metalFxClassName="relative z-10 mx-auto mb-4 size-10!"
            size="icon"
          >
            {item.step}
          </MetalIconButton>
          <h3 className="font-semibold text-lg">{item.title}</h3>
          <PixelParagraph
            className="mt-2 text-muted-foreground text-sm"
            font="circle"
            pixelWordClassName="text-foreground"
            pixelWords={item.pixelWords}
            text={item.description}
          />
        </div>
      ))}
    </div>
  );
}
