import {
  Bot,
  Calendar,
  Globe,
  QrCode,
  Mail,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Management",
    description:
      "Create events, manage RSVPs, and send invitations using natural language chat with an AI agent.",
  },
  {
    icon: Calendar,
    title: "Create & Manage Events",
    description:
      "Beautiful event pages with RSVP, approval workflows, waitlisting, and attendee management.",
  },
  {
    icon: Globe,
    title: "Public & Private Events",
    description:
      "Share events publicly or keep them invite-only with approval-based access control.",
  },
  {
    icon: QrCode,
    title: "QR Code Check-in",
    description:
      "Generate QR tickets for attendees and scan them at the door with built-in check-in.",
  },
  {
    icon: Mail,
    title: "Email Notifications",
    description:
      "Automated invitations, RSVP confirmations, and reminders with ICS calendar attachments.",
  },
  {
    icon: Users,
    title: "Co-host & Roles",
    description:
      "Invite co-hosts with granular permissions to help manage events and attendees.",
  },
];

export function FeatureCards() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(({ icon: Icon, title, description }) => (
        <Card
          key={title}
          className="border-transparent bg-background shadow-sm transition-shadow hover:shadow-md"
        >
          <CardContent className="pt-6">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
