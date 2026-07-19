import { Button, Section, Text } from "@react-email/components";
import { CardHeader, EmailLayout } from "./components/email-layout";
import { EventDetails } from "./components/event-details";

interface EventReminderEmailProps {
  eventTitle: string;
  startTime: Date;
  endTime?: Date | null;
  location?: string | null;
  timezone: string;
  eventUrl: string;
  ticketUrl?: string;
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
      <CardHeader title="See you soon!" subtitle={eventTitle} />

      <Section className="px-[32px] py-[28px]">
        <Text className="m-0 text-[15px] leading-[24px] text-[#3f3f46]">
          This is a friendly reminder that{" "}
          <strong className="text-[#18181b]">{eventTitle}</strong> is coming up.
          Here are the details:
        </Text>

        <Section className="mt-[20px]">
          <EventDetails
            startTime={startTime}
            endTime={endTime}
            location={location}
            timezone={timezone}
          />
        </Section>

        <Section className="mt-[24px]">
          <Button
            href={ticketUrl ?? eventUrl}
            className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center text-[15px] font-semibold text-white no-underline"
          >
            {ticketUrl ? "View your ticket" : "View event"}
          </Button>
        </Section>

        <Text className="m-0 mt-[16px] text-center text-[13px] leading-[20px] text-[#71717a]">
          Looking forward to seeing you there.
        </Text>
      </Section>
    </EmailLayout>
  );
}

EventReminderEmail.PreviewProps = {
  eventTitle: "Summer Product Launch",
  startTime: new Date("2026-08-14T18:00:00Z"),
  endTime: new Date("2026-08-14T21:00:00Z"),
  location: "The Grand Hall, San Francisco",
  timezone: "America/Los_Angeles",
  eventUrl: "https://openluma.vercel.app/e/summer-launch",
  ticketUrl: "https://openluma.vercel.app/ticket/evt_123",
} satisfies EventReminderEmailProps;

export { EventReminderEmail };
