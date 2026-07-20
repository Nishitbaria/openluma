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
  endTime?: Date | null;
  location?: string | null;
  startTime: Date;
  timezone?: string;
}

interface RsvpStatusEmailProps {
  customMessage?: string;
  event?: EventInfo;
  eventTitle: string;
  eventUrl: string;
  status: RsvpStatus;
  ticketUrl?: string;
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
    body: "Your RSVP has been approved — you're all set to attend this event.",
    header: "You're attending!",
    pill: "Confirmed",
    tone: { bg: "#dcfce7", text: "#166534" },
  },
  pending: {
    body: "Your RSVP has been received and is waiting for the host to review it. You'll get a confirmation email once your registration is approved.",
    header: "RSVP received",
    pill: "Pending",
    tone: { bg: "#f4f4f5", text: "#3f3f46" },
  },
  rejected: {
    body: "Unfortunately the host was unable to approve your registration for this event. If you believe this was a mistake, please reach out to the event organizer directly.",
    header: "RSVP update",
    pill: "Not approved",
    tone: { bg: "#fee2e2", text: "#991b1b" },
  },
  waitlisted: {
    body: "This event is currently at capacity. You've been placed on the waitlist and will be promoted automatically if a spot opens up. We'll email you the moment your spot is confirmed.",
    header: "You're on the waitlist",
    pill: "Waitlisted",
    tone: { bg: "#fef3c7", text: "#92400e" },
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
    body: `Your RSVP status for this event has been updated to ${status}.`,
    header: "RSVP update",
    pill: status,
    tone: { bg: "#f4f4f5", text: "#3f3f46" },
  };

  const isApproved = status === "approved";
  const preview = isApproved
    ? `You're in! ${eventTitle}`
    : `${c.header} — ${eventTitle}`;

  return (
    <EmailLayout preview={preview}>
      <CardHeader subtitle={eventTitle} title={c.header} />

      <Section className="px-[32px] py-[28px]">
        <Section className="mb-[16px]">
          <StatusPill label={c.pill} tone={c.tone} />
        </Section>

        <Text className="m-0 text-[#3f3f46] text-[15px] leading-[24px]">
          {c.body}
        </Text>

        {customMessage ? (
          <Section className="mt-[16px] rounded-[10px] border-[#a1a1aa] border-l-[3px] border-solid border-none bg-[#f4f4f5] px-[16px] py-[12px]">
            <Text className="m-0 whitespace-pre-wrap text-[#3f3f46] text-[14px] leading-[22px]">
              {customMessage}
            </Text>
          </Section>
        ) : null}

        {event ? (
          <Section className="mt-[20px]">
            <EventDetails
              endTime={event.endTime}
              location={event.location}
              startTime={event.startTime}
              timezone={event.timezone}
            />
          </Section>
        ) : null}

        {isApproved && ticketUrl ? (
          <>
            <Section className="mt-[24px]">
              <Button
                className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center font-semibold text-[15px] text-white no-underline"
                href={ticketUrl}
              >
                View your ticket
              </Button>
            </Section>
            <Text className="m-0 mt-[12px] text-center text-[#71717a] text-[13px] leading-[20px]">
              Your ticket includes a QR code — show it at the door for check-in.
            </Text>
          </>
        ) : (
          <Section className="mt-[24px]">
            <Button
              className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center font-semibold text-[15px] text-white no-underline"
              href={eventUrl}
            >
              View event
            </Button>
          </Section>
        )}

        <CardDivider />

        <Section className="text-center">
          <Link
            className="text-[#71717a] text-[13px] underline"
            href={eventUrl}
          >
            View event details
          </Link>
          {isApproved && ticketUrl ? (
            <>
              <span className="mx-[8px] text-[#d4d4d8]">·</span>
              <Link
                className="text-[#71717a] text-[13px] underline"
                href={ticketUrl}
              >
                Download ticket
              </Link>
            </>
          ) : null}
        </Section>

        {isApproved ? (
          <Text className="m-0 mt-[16px] text-center text-[#a1a1aa] text-[12px] leading-[18px]">
            A calendar invite (.ics) is attached to this email.
          </Text>
        ) : null}
      </Section>
    </EmailLayout>
  );
}

RsvpStatusEmail.PreviewProps = {
  customMessage: "Can't wait to see you there! Doors open at 5:30pm.",
  event: {
    endTime: new Date("2026-08-14T21:00:00Z"),
    location: "The Grand Hall, San Francisco",
    startTime: new Date("2026-08-14T18:00:00Z"),
    timezone: "America/Los_Angeles",
  },
  eventTitle: "Summer Product Launch",
  eventUrl: "https://openluma.vercel.app/e/summer-launch",
  status: "approved",
  ticketUrl: "https://openluma.vercel.app/ticket/evt_123",
} satisfies RsvpStatusEmailProps;

export { RsvpStatusEmail };
