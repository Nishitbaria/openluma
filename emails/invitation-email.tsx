import { Button, Section, Text } from "@react-email/components";
import { CardHeader, EmailLayout } from "./components/email-layout";

interface InvitationEmailProps {
  eventTitle: string;
  acceptUrl: string;
  declineUrl: string;
  role?: "attendee" | "cohost";
}

export default function InvitationEmail({
  eventTitle,
  acceptUrl,
  declineUrl,
  role = "attendee",
}: InvitationEmailProps) {
  const isCohost = role === "cohost";
  const preview = isCohost
    ? `You're invited to co-host ${eventTitle}`
    : `You're invited to ${eventTitle}`;

  return (
    <EmailLayout preview={preview}>
      <CardHeader
        title={isCohost ? "You're invited to co-host" : "You're invited!"}
        subtitle={eventTitle}
      />

      <Section className="px-[32px] py-[28px]">
        <Text className="m-0 text-[15px] leading-[24px] text-[#3f3f46]">
          {isCohost ? (
            <>
              You've been invited to co-host{" "}
              <strong className="text-[#18181b]">{eventTitle}</strong> on
              OpenLuma. As a co-host, you'll be able to manage attendees and
              event details.
            </>
          ) : (
            <>
              You've been invited to{" "}
              <strong className="text-[#18181b]">{eventTitle}</strong> on
              OpenLuma. Let the host know if you can make it.
            </>
          )}
        </Text>

        <Section className="mt-[28px]">
          <Button
            href={acceptUrl}
            className="box-border block w-full rounded-[10px] bg-[#18181b] px-[24px] py-[14px] text-center text-[15px] font-semibold text-white no-underline"
          >
            Accept invitation
          </Button>
          <Button
            href={declineUrl}
            className="box-border mt-[12px] block w-full rounded-[10px] border border-solid border-[#e4e4e7] bg-white px-[24px] py-[14px] text-center text-[15px] font-semibold text-[#3f3f46] no-underline"
          >
            Decline
          </Button>
        </Section>

        <Text className="m-0 mt-[24px] text-[13px] leading-[20px] text-[#71717a]">
          If you don't have an OpenLuma account, one will be created for you
          when you accept.
        </Text>
      </Section>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  eventTitle: "Summer Product Launch",
  acceptUrl: "https://openluma.vercel.app/api/invitations/abc?action=accept",
  declineUrl: "https://openluma.vercel.app/api/invitations/abc?action=decline",
  role: "attendee",
} satisfies InvitationEmailProps;

export { InvitationEmail };
