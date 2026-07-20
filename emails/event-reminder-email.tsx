import { Button, Section, Text } from "@react-email/components";
import { CardHeader, EmailLayout } from "./components/email-layout";
import { EventDetails } from "./components/event-details";

interface EventReminderEmailProps {
  endTime?: Date | null;
  eventTitle: string;
  eventUrl: string;
  location?: string | null;
  startTime: Date;
  ticketUrl?: string;
  timezone: string;
}

export default function EventReminderEmail({
  eventTitle,
  startTime,
  endTime,
  location,
  timezone,
  eventUrl,
  ticketUrl,
}: EventReminderEmailProps) {
  return (
    <EmailLayout preview={`Reminder: ${eventTitle} is coming up`}>
      <CardHeader subtitle={eventTitle} title="See you soon!" />

      <Section className="px-[32px] py-[28px]">
        <Text className="m-0 text-[#3f3f46] text-[15px] leading-[24px]">
          This is a friendly reminder that{" "}
          <strong className="text-[#18181b]">{eventTitle}</strong> is coming up.
          Here are the details:
        </Text>

        <Section className="mt-[20px]">
          <EventDetails
            endTime={endTime}
            location={location}
            startTime={startTime}
            timezone={timezone}
          />
        </Section>

        <Section className="mt-[24px]">
          <Button
            className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center font-semibold text-[15px] text-white no-underline"
            href={ticketUrl ?? eventUrl}
          >
            {ticketUrl ? "View your ticket" : "View event"}
          </Button>
        </Section>

        <Text className="m-0 mt-[16px] text-center text-[#71717a] text-[13px] leading-[20px]">
          Looking forward to seeing you there.
        </Text>
      </Section>
    </EmailLayout>
  );
}

EventReminderEmail.PreviewProps = {
  endTime: new Date("2026-08-14T21:00:00Z"),
  eventTitle: "Summer Product Launch",
  eventUrl: "https://openluma.vercel.app/e/summer-launch",
  location: "The Grand Hall, San Francisco",
  startTime: new Date("2026-08-14T18:00:00Z"),
  ticketUrl: "https://openluma.vercel.app/ticket/evt_123",
  timezone: "America/Los_Angeles",
} satisfies EventReminderEmailProps;

export { EventReminderEmail };
