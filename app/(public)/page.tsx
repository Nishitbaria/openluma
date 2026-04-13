import { ArrowRight, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { GitHubIcon } from "@/components/icons";
import { FeatureCards } from "@/components/layout/feature-cards";
import { Button } from "@/components/ui/button";

const steps = [
  {
    step: "1",
    title: "Sign up for free",
    description: "Create your account in seconds with email or Google.",
  },
  {
    step: "2",
    title: "Create an event",
    description:
      "Use the AI chat or the form to set up your event with all the details.",
  },
  {
    step: "3",
    title: "Share & manage",
    description:
      "Share the link, manage RSVPs, send invites, and check in attendees on the day.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-3.5" />
            Open source &middot; Self-hostable &middot; AI-powered
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Events, simplified.
            <br />
            <span className="text-primary">Open source.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            OpenLuma is a free, open-source event management platform. Create
            events with AI, manage attendees, send invitations, and check in
            guests — all without vendor lock-in.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/events">Browse Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-24" id="features">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run events
            </h2>
            <p className="mt-4 text-muted-foreground">
              From creation to check-in, OpenLuma handles the entire event
              lifecycle with modern tools and an AI assistant.
            </p>
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
          <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open source CTA */}
      <section className="border-t bg-muted/30 py-24" id="about">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Shield className="mx-auto mb-6 size-10 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Open source, forever
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              OpenLuma is MIT-licensed and free to self-host. Inspect the code,
              contribute features, or deploy your own instance. No vendor
              lock-in, no surprise pricing.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Start for Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
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
    </div>
  );
}
