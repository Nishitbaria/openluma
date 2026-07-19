import { Button, Link, Section, Text } from "@react-email/components";
import {
  CardDivider,
  CardHeader,
  EmailLayout,
  StatusPill,
} from "./components/email-layout";
import { EventDetails } from "./components/event-details";

type RsvpStatus =
  | "approved"
  | "waitlisted"
  | "pending"
  | "rejected"
  | (string & {});

interface EventInfo {
  startTime: Date;
  endTime?: Date | null;
  location?: string | null;
  timezone?: string;
}

interface RsvpStatusEmailProps {
  eventTitle: string;
  status: RsvpStatus;
  eventUrl: string;
  ticketUrl?: string;
  event?: EventInfo;
  customMessage?: string;
}

const config: Record<
  string,
  {
    header: string;
    pill: string;
    tone: { bg: string; text: string };
    body: string;
  }
> = {
  approved: {
    header: "You're attending!",
    pill: "Confirmed",
    tone: { bg: "#dcfce7", text: "#166534" },
    body: "Your RSVP has been approved — you're all set to attend this event.",
  },
  waitlisted: {
    header: "You're on the waitlist",
    pill: "Waitlisted",
    tone: { bg: "#fef3c7", text: "#92400e" },
    body: "This event is currently at capacity. You've been placed on the waitlist and will be promoted automatically if a spot opens up. We'll email you the moment your spot is confirmed.",
  },
  pending: {
    header: "RSVP received",
    pill: "Pending",
    tone: { bg: "#f4f4f5", text: "#3f3f46" },
    body: "Your RSVP has been received and is waiting for the host to review it. You'll get a confirmation email once your registration is approved.",
  },
  rejected: {
    header: "RSVP update",
    pill: "Not approved",
    tone: { bg: "#fee2e2", text: "#991b1b" },
    body: "Unfortunately the host was unable to approve your registration for this event. If you believe this was a mistake, please reach out to the event organizer directly.",
  },
};

export default function RsvpStatusEmail({
  eventTitle,
  status,
  eventUrl,
  ticketUrl,
  event,
  customMessage,
}: RsvpStatusEmailProps) {
  const c = config[status] ?? {
    header: "RSVP update",
    pill: status,
    tone: { bg: "#f4f4f5", text: "#3f3f46" },
    body: `Your RSVP status for this event has been updated to ${status}.`,
  };

  const isApproved = status === "approved";
  const preview = isApproved
    ? `You're in! ${eventTitle}`
    : `${c.header} — ${eventTitle}`;

  return (
    <EmailLayout preview={preview}>
      <CardHeader title={c.header} subtitle={eventTitle} />

      <Section className="px-[32px] py-[28px]">
        <Section className="mb-[16px]">
          <StatusPill label={c.pill} tone={c.tone} />
        </Section>

        <Text className="m-0 text-[15px] leading-[24px] text-[#3f3f46]">
          {c.body}
        </Text>

        {customMessage ? (
          <Section className="mt-[16px] rounded-[10px] border-none border-l-[3px] border-solid border-[#a1a1aa] bg-[#f4f4f5] px-[16px] py-[12px]">
            <Text className="m-0 whitespace-pre-wrap text-[14px] leading-[22px] text-[#3f3f46]">
              {customMessage}
            </Text>
          </Section>
        ) : null}

        {event ? (
          <Section className="mt-[20px]">
            <EventDetails
              startTime={event.startTime}
              endTime={event.endTime}
              location={event.location}
              timezone={event.timezone}
            />
          </Section>
        ) : null}

        {isApproved && ticketUrl ? (
          <>
            <Section className="mt-[24px]">
              <Button
                href={ticketUrl}
                className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center text-[15px] font-semibold text-white no-underline"
              >
                View your ticket
              </Button>
            </Section>
            <Text className="m-0 mt-[12px] text-center text-[13px] leading-[20px] text-[#71717a]">
              Your ticket includes a QR code — show it at the door for check-in.
            </Text>
          </>
        ) : (
          <Section className="mt-[24px]">
            <Button
              href={eventUrl}
              className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center text-[15px] font-semibold text-white no-underline"
            >
              View event
            </Button>
          </Section>
        )}

        <CardDivider />

        <Section className="text-center">
          <Link
            href={eventUrl}
            className="text-[13px] text-[#71717a] underline"
          >
            View event details
          </Link>
          {isApproved && ticketUrl ? (
            <>
              <span className="mx-[8px] text-[#d4d4d8]">·</span>
              <Link
                href={ticketUrl}
                className="text-[13px] text-[#71717a] underline"
              >
                Download ticket
              </Link>
            </>
          ) : null}
        </Section>

        {isApproved ? (
          <Text className="m-0 mt-[16px] text-center text-[12px] leading-[18px] text-[#a1a1aa]">
            A calendar invite (.ics) is attached to this email.
          </Text>
        ) : null}
      </Section>
    </EmailLayout>
  );
}

RsvpStatusEmail.PreviewProps = {
  eventTitle: "Summer Product Launch",
  status: "approved",
  eventUrl: "https://openluma.vercel.app/e/summer-launch",
  ticketUrl: "https://openluma.vercel.app/ticket/evt_123",
  event: {
    startTime: new Date("2026-08-14T18:00:00Z"),
    endTime: new Date("2026-08-14T21:00:00Z"),
    location: "The Grand Hall, San Francisco",
    timezone: "America/Los_Angeles",
  },
  customMessage: "Can't wait to see you there! Doors open at 5:30pm.",
} satisfies RsvpStatusEmailProps;

export { RsvpStatusEmail };
