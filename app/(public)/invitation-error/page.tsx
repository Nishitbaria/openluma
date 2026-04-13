import { AlertCircle, ArrowLeft, Clock, MailX, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function InvitationErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; event?: string; expected?: string }>;
}) {
  const { reason, event, expected } = await searchParams;

  const config = getErrorConfig(reason, expected);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-24 text-center">
      <config.icon className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">{config.title}</h1>
      <p className="mt-2 text-muted-foreground">{config.description}</p>
      <div className="mt-8 flex justify-center gap-3">
        {event && (
          <Button asChild variant="outline">
            <Link href={`/events/${event}`}>View Event</Link>
          </Button>
        )}
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
        icon: XCircle,
        title: "Invalid Invitation",
        description:
          "This invitation link is invalid or no longer exists. Please ask the host to send a new one.",
      };
    case "expired":
      return {
        icon: Clock,
        title: "Invitation Expired",
        description:
          "This invitation has expired. Please ask the host to send a new invitation.",
      };
    case "already-accepted":
      return {
        icon: AlertCircle,
        title: "Already Accepted",
        description:
          "This invitation has already been accepted. You should be able to view the event.",
      };
    case "already-declined":
      return {
        icon: AlertCircle,
        title: "Already Declined",
        description:
          "This invitation was previously declined. Please ask the host for a new invitation if you changed your mind.",
      };
    case "already-expired":
      return {
        icon: Clock,
        title: "Invitation Expired",
        description:
          "This invitation has expired. Please ask the host to send a new invitation.",
      };
    case "wrong-email":
      return {
        icon: MailX,
        title: "Wrong Account",
        description: expected
          ? `This invitation was sent to ${expected}. Please sign in with that email address to accept it.`
          : "This invitation was sent to a different email address. Please sign in with the correct account.",
      };
    default:
      return {
        icon: AlertCircle,
        title: "Invitation Error",
        description: "Something went wrong with this invitation.",
      };
  }
}
