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
      {/* Dashed connector line — desktop only */}
      <div className="pointer-events-none absolute top-5 right-[calc(16.67%+2rem)] left-[calc(16.67%+2rem)] hidden h-px border-border border-t border-dashed md:block" />

      {steps.map((item, i) => (
        <div
          className="fade-in slide-in-from-bottom-4 animate-in text-center duration-500"
          key={item.step}
          style={{
            animationDelay: `${i * 150}ms`,
            animationFillMode: "both",
          }}
        >
          <MetalIconButton
            aria-label={`Step ${item.step}`}
            className="mx-auto mb-4 font-bold text-base"
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
