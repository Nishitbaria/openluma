"use client"

import { MetalIconButton } from "@/components/ui/metal-button"
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words"

const steps = [
  {
    step: "1",
    title: "Sign up for free",
    description: "Create your account in seconds with email or Google.",
    pixelWords: ["email or Google"],
  },
  {
    step: "2",
    title: "Create an event",
    description:
      "Use the AI chat or the form to set up your event with all the details.",
    pixelWords: ["AI chat"],
  },
  {
    step: "3",
    title: "Share & manage",
    description:
      "Share the link, manage RSVPs, send invites, and check in attendees on the day.",
    pixelWords: ["RSVPs", "check in"],
  },
]

export function HowItWorks() {
  return (
    <div className="relative mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
      {/* Dashed connector line — desktop only */}
      <div className="pointer-events-none absolute top-5 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] hidden h-px border-t border-dashed border-border md:block" />

      {steps.map((item, i) => (
        <div
          key={item.step}
          className="animate-in fade-in slide-in-from-bottom-4 text-center duration-500"
          style={{
            animationDelay: `${i * 150}ms`,
            animationFillMode: "both",
          }}
        >
          <MetalIconButton
            size="icon"
            aria-label={`Step ${item.step}`}
            className="mx-auto mb-4 text-base font-bold"
          >
            {item.step}
          </MetalIconButton>
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <PixelParagraph
            text={item.description}
            pixelWords={item.pixelWords}
            font="circle"
            pixelWordClassName="text-foreground"
            className="mt-2 text-sm text-muted-foreground"
          />
        </div>
      ))}
    </div>
  )
}
