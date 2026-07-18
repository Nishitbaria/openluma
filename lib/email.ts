import { formatInTimeZone } from "date-fns-tz";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const fromEmail =
  process.env.EMAIL_FROM ?? "OpenLuma <noreply@openluma.nishitbaria.pro>";

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
    `URL:${appUrl}${event.slug ? `/e/${event.slug}` : `/events/${event.id}`}`,
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
  const subject = isCohost
    ? `You're invited to co-host ${eventTitle}`
    : `You're invited to ${eventTitle}`;
  const heading = isCohost
    ? "You've been invited as a Co-host!"
    : "You've been invited!";
  const description = isCohost
    ? `You've been invited to co-host <strong>${eventTitle}</strong> on OpenLuma. As a co-host, you'll be able to manage attendees and event details.`
    : `You've been invited to <strong>${eventTitle}</strong> on OpenLuma.`;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${heading}</h2>
        <p>${description}</p>
        <div style="margin: 24px 0;">
          <a href="${inviteUrl}?action=accept" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Accept Invitation</a>
          <a href="${inviteUrl}?action=decline" style="color: #666; padding: 12px 24px; text-decoration: none; display: inline-block;">Decline</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you don't have an OpenLuma account, one will be created for you when you accept.</p>
      </div>
    `,
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
  },
  customMessage?: string,
) {
  if (!resend) return;

  const eventUrl = event
    ? `${appUrl}${event.slug ? `/e/${event.slug}` : `/events/${event.id}`}`
    : appUrl;
  const customBlock = customMessage
    ? `<div style="background: #f3f4f6; border-left: 3px solid #9ca3af; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${customMessage}</p>
      </div>`
    : "";

  if (status === "approved" && event) {
    const icsContent = generateICS(event);
    const ticketUrl = `${appUrl}/ticket/${event.id}`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `You're in! 🎉 ${eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #000; color: #fff; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">You're Attending!</h1>
            <p style="margin: 8px 0 0; opacity: 0.8; font-size: 16px;">${eventTitle}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Your RSVP has been approved! You're all set to attend this event.
            </p>
            ${customBlock}
            <div style="margin: 24px 0; text-align: center;">
              <a href="${ticketUrl}" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                View Your Ticket
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Your ticket includes a QR code — show it at the door for check-in.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <div style="text-align: center;">
              <a href="${eventUrl}" style="color: #6b7280; font-size: 13px; text-decoration: underline;">View Event Details</a>
              <span style="color: #d1d5db; margin: 0 8px;">·</span>
              <a href="${ticketUrl}" style="color: #6b7280; font-size: 13px; text-decoration: underline;">Download Ticket</a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
              A calendar invite (.ics) is attached to this email.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${eventTitle.replace(/\s+/g, "-").toLowerCase()}.ics`,
          content: Buffer.from(icsContent),
          contentType: "text/calendar",
        },
      ],
    });

    if (error) console.error("Failed to send approval email:", error);
    return { data, error };
  }

  // Status-specific content
  const statusConfig: Record<
    string,
    { subject: string; heading: string; body: string; color: string }
  > = {
    waitlisted: {
      subject: `You're on the waitlist — ${eventTitle}`,
      heading: "You're on the Waitlist",
      body: "The event is currently at capacity. You've been placed on the waitlist and will be automatically promoted if a spot opens up. We'll send you an email as soon as your spot is confirmed.",
      color: "#d97706",
    },
    pending: {
      subject: `RSVP received — ${eventTitle}`,
      heading: "RSVP Pending Approval",
      body: "Your RSVP has been received and is waiting for the host to review it. You'll receive a confirmation email once your registration is approved.",
      color: "#6b7280",
    },
    rejected: {
      subject: `RSVP update — ${eventTitle}`,
      heading: "RSVP Not Approved",
      body: "Unfortunately, the host was unable to approve your registration for this event. If you believe this was a mistake, please reach out to the event organizer directly.",
      color: "#dc2626",
    },
  };

  const config = statusConfig[status] ?? {
    subject: `RSVP update — ${eventTitle}`,
    heading: `Status: ${status}`,
    body: `Your RSVP status for this event has been updated to ${status}.`,
    color: "#6b7280",
  };

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: config.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #000; color: #fff; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${config.heading}</h1>
          <p style="margin: 8px 0 0; opacity: 0.8; font-size: 16px;">${eventTitle}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="display: inline-block; background: ${config.color}15; color: ${config.color}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
              ${config.heading}
            </span>
          </div>
          <p style="color: #374151; font-size: 15px; line-height: 1.6; text-align: center;">
            ${config.body}
          </p>
          ${customBlock}
          <div style="margin: 24px 0; text-align: center;">
            <a href="${eventUrl}" style="background: #000; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
              View Event
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated message from OpenLuma. If you have questions, please contact the event organizer.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendEventReminderEmail(
  to: string,
  eventTitle: string,
  startTime: Date,
  timezone: string,
) {
  if (!resend) return;

  const when = formatInTimeZone(
    startTime,
    timezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a zzz",
  );

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: `Reminder: ${eventTitle} is coming up!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Event Reminder</h2>
        <p><strong>${eventTitle}</strong> is starting soon!</p>
        <p>When: ${when}</p>
        <a href="${appUrl}" style="color: #000;">View Event</a>
      </div>
    `,
  });
}
