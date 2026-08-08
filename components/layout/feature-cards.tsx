import { Bot, Calendar, Globe, Mail, QrCode, Users } from "lucide-react";
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
    <ul className="divide-y border-y">
      {features.map(({ icon: Icon, title, description, pixelWords }, index) => (
        <li
          className="grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-8 md:grid-cols-2 md:gap-12"
          key={title}
        >
          <div className="flex items-start gap-3 sm:max-w-xs">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center border border-border text-primary">
              <Icon aria-hidden className="size-4" />
            </span>
            <div>
              <p className="font-mono text-muted-foreground text-xs tracking-wide">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 font-semibold text-lg tracking-tight">
                {title}
              </h3>
            </div>
          </div>
          <PixelParagraph
            className="text-muted-foreground text-sm leading-relaxed md:pt-6"
            font="circle"
            pixelWordClassName="text-foreground"
            pixelWords={pixelWords}
            text={description}
          />
        </li>
      ))}
    </ul>
  );
}
