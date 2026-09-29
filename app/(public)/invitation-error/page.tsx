import {
  AlertCircle,
  ArrowLeft,
  Clock,
  MailCheck,
  MailX,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Invitation problem",
};

export default async function InvitationErrorPage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    event?: string;
    expected?: string;
    invite?: string;
  }>;
}) {
  const { reason, event, expected, invite } = await searchParams;

  const config = getErrorConfig(reason, expected);
  const session =
    reason === "unverified-email" ? await getSession(await headers()) : null;
  // After verifying, send the invitee straight back to accept the invitation.
  const verifyCallbackUrl = invite
    ? `/api/invitations/${encodeURIComponent(invite)}?action=accept`
    : "/dashboard";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-24 text-center">
      <config.icon className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 font-bold text-2xl">{config.title}</h1>
      <p className="mt-2 text-muted-foreground">{config.description}</p>
      <div className="mt-8 flex justify-center gap-3">
        {session && !session.user.emailVerified ? (
          <ResendVerificationButton
            callbackURL={verifyCallbackUrl}
            email={session.user.email}
          />
        ) : null}
        {event ? (
          <Button asChild variant="outline">
            <Link href={`/events/${event}`}>View Event</Link>
          </Button>
        ) : null}
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

function getErrorConfig(reason?: string, expected?: string) {
  switch (reason) {
    case "invalid":
      return {
        description:
          "This invitation link is invalid or no longer exists. Please ask the host to send a new one.",
        icon: XCircle,
        title: "Invalid Invitation",
      };
    case "expired":
      return {
        description:
          "This invitation has expired. Please ask the host to send a new invitation.",
        icon: Clock,
        title: "Invitation Expired",
      };
    case "already-accepted":
      return {
        description:
          "This invitation has already been accepted. You should be able to view the event.",
        icon: AlertCircle,
        title: "Already Accepted",
      };
    case "already-declined":
      return {
        description:
          "This invitation was previously declined. Please ask the host for a new invitation if you changed your mind.",
        icon: AlertCircle,
        title: "Already Declined",
      };
    case "already-expired":
      return {
        description:
          "This invitation has expired. Please ask the host to send a new invitation.",
        icon: Clock,
        title: "Invitation Expired",
      };
    case "wrong-email":
      return {
        description: expected
          ? `This invitation was sent to ${expected}. Please sign in with that email address to accept it.`
          : "This invitation was sent to a different email address. Please sign in with the correct account.",
        icon: MailX,
        title: "Wrong Account",
      };
    case "unverified-email":
      return {
        description:
          "Verify your email address to accept this invitation. We'll email you a link that brings you back here.",
        icon: MailCheck,
        title: "Verify Your Email",
      };
    default:
      return {
        description: "Something went wrong with this invitation.",
        icon: AlertCircle,
        title: "Invitation Error",
      };
  }
}
