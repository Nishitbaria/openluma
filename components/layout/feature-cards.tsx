import { Bot, Calendar, Globe, Mail, QrCode, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words";

const features = [
  {
    description:
      "Create events, manage RSVPs, and send invitations using natural language chat with an AI agent.",
    icon: Bot,
    pixelWords: ["natural language", "AI agent"],
    title: "AI-Powered Management",
  },
  {
    description:
      "Beautiful event pages with RSVP, approval workflows, waitlisting, and attendee management.",
    icon: Calendar,
    pixelWords: ["RSVP", "waitlisting"],
    title: "Create & Manage Events",
  },
  {
    description:
      "Share events publicly or keep them invite-only with approval-based access control.",
    icon: Globe,
    pixelWords: ["invite-only", "access control"],
    title: "Public & Private Events",
  },
  {
    description:
      "Generate QR tickets for attendees and scan them at the door with built-in check-in.",
    icon: QrCode,
    pixelWords: ["QR tickets", "check-in"],
    title: "QR Code Check-in",
  },
  {
    description:
      "Automated invitations, RSVP confirmations, and reminders with ICS calendar attachments.",
    icon: Mail,
    pixelWords: ["ICS calendar", "reminders"],
    title: "Email Notifications",
  },
  {
    description:
      "Invite co-hosts with granular permissions to help manage events and attendees.",
    icon: Users,
    pixelWords: ["co-hosts", "granular permissions"],
    title: "Co-host & Roles",
  },
];

export function FeatureCards() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(({ icon: Icon, title, description, pixelWords }) => (
        <Card
          className="border-transparent bg-background shadow-sm transition-shadow hover:shadow-md"
          key={title}
        >
          <CardContent className="pt-6">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <PixelParagraph
              className="mt-2 text-muted-foreground text-sm leading-relaxed"
              font="circle"
              pixelWordClassName="text-foreground"
              pixelWords={pixelWords}
              text={description}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
