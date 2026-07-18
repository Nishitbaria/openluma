import { render } from "@react-email/render";
import { Resend } from "resend";
import EventReminderEmail from "@/emails/event-reminder-email";
import InvitationEmail from "@/emails/invitation-email";
import RsvpStatusEmail from "@/emails/rsvp-status-email";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const fromEmail =
  process.env.EMAIL_FROM ?? "OpenLuma <noreply@openluma.nishitbaria.pro>";

function eventLink(event: { id: string; slug?: string }) {
  return `${appUrl}${event.slug ? `/e/${event.slug}` : `/events/${event.id}`}`;
}

function generateICS(event: {
  title: string;
  startTime: Date;
  endTime: Date | null;
  location: string | null;
  id: string;
  slug?: string;
}): string {
  const formatDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const end =
    event.endTime ?? new Date(event.startTime.getTime() + 60 * 60 * 1000);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenLuma//Event//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location ?? ""}`,
    `URL:${eventLink(event)}`,
    `DESCRIPTION:View your ticket: ${appUrl}/ticket/${event.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendInvitationEmail(
  to: string,
  eventTitle: string,
  inviteToken: string,
  role: "attendee" | "cohost" = "attendee",
) {
  if (!resend) {
    console.warn("Resend not configured, skipping invitation email");
    return;
  }

  const inviteUrl = `${appUrl}/api/invitations/${inviteToken}`;
  const isCohost = role === "cohost";

  const html = await render(
    InvitationEmail({
      eventTitle,
      acceptUrl: `${inviteUrl}?action=accept`,
      declineUrl: `${inviteUrl}?action=decline`,
      role,
    }),
  );

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: isCohost
      ? `You're invited to co-host ${eventTitle}`
      : `You're invited to ${eventTitle}`,
    html,
  });

  if (error) {
    console.error("Failed to send invitation email:", error);
  }
  return { data, error };
}

export async function sendRsvpConfirmationEmail(
  to: string,
  eventTitle: string,
  status: string,
  event?: {
    id: string;
    slug?: string;
    title: string;
    startTime: Date;
    endTime: Date | null;
    location: string | null;
    timezone?: string;
  },
  customMessage?: string,
) {
  if (!resend) return;

  const eventUrl = event ? eventLink(event) : appUrl;
  const ticketUrl = event ? `${appUrl}/ticket/${event.id}` : undefined;
  const isApproved = status === "approved";

  const subjectMap: Record<string, string> = {
    approved: `You're in! 🎉 ${eventTitle}`,
    waitlisted: `You're on the waitlist — ${eventTitle}`,
    pending: `RSVP received — ${eventTitle}`,
    rejected: `RSVP update — ${eventTitle}`,
  };

  const html = await render(
    RsvpStatusEmail({
      eventTitle,
      status,
      eventUrl,
      ticketUrl,
      event: event
        ? {
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            timezone: event.timezone,
          }
        : undefined,
      customMessage,
    }),
  );

  const attachments =
    isApproved && event
      ? [
          {
            filename: `${eventTitle.replace(/\s+/g, "-").toLowerCase()}.ics`,
            content: Buffer.from(generateICS(event)),
            contentType: "text/calendar",
          },
        ]
      : undefined;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: subjectMap[status] ?? `RSVP update — ${eventTitle}`,
    html,
    ...(attachments ? { attachments } : {}),
  });

  if (error) console.error("Failed to send RSVP email:", error);
  return { data, error };
}

export async function sendEventReminderEmail(
  to: string,
  eventTitle: string,
  startTime: Date,
  timezone: string,
  event?: {
    id: string;
    slug?: string;
    endTime?: Date | null;
    location?: string | null;
  },
) {
  if (!resend) return;

  const eventUrl = event ? eventLink(event) : appUrl;
  const ticketUrl = event ? `${appUrl}/ticket/${event.id}` : undefined;

  const html = await render(
    EventReminderEmail({
      eventTitle,
      startTime,
      endTime: event?.endTime,
      location: event?.location,
      timezone,
      eventUrl,
      ticketUrl,
    }),
  );

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: `Reminder: ${eventTitle} is coming up!`,
    html,
  });

  if (error) console.error("Failed to send reminder email:", error);
  return { data, error };
}
