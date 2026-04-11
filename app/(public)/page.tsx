import Link from "next/link";
import { ArrowRight, Calendar, Globe, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Create & Manage Events",
    description:
      "Beautiful event pages with RSVP, approval workflows, and attendee management.",
  },
  {
    icon: Globe,
    title: "Public & Private Events",
    description:
      "Share events publicly or keep them invite-only with approval-based access.",
  },
  {
    icon: Bot,
    title: "AI-Powered Management",
    description:
      "Create events, manage RSVPs, and send invitations using natural language chat.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Events, simplified.
          <br />
          <span className="text-primary">Open source.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          OpenLuma is a free, open-source event management platform with
          AI-powered tools. Create events, manage attendees, and send
          invitations - all without vendor lock-in.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/events">Browse Events</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <feature.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
