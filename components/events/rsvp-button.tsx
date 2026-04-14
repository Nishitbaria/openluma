"use client";

import { Check, Clock, LogIn, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  type EventQuestion,
  RsvpQuestionsDialog,
} from "./rsvp-questions-dialog";

export function RsvpButton({
  eventId,
  eventSlug,
  requiresApproval,
  currentRsvpStatus,
  questions = [],
  waitlistPosition,
}: {
  eventId: string;
  eventSlug?: string;
  requiresApproval: boolean;
  currentRsvpStatus?: "pending" | "approved" | "rejected" | "waitlisted" | null;
  questions?: EventQuestion[];
  waitlistPosition?: number | null;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentRsvpStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const isLoggedIn = !!session?.user;

  const cancelConfirm = (label: string) =>
    confirmingCancel ? (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={() => { setConfirmingCancel(false); handleCancel(); }}
          disabled={loading}
        >
          {loading ? "Cancelling..." : "Yes, cancel"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setConfirmingCancel(false)}
          disabled={loading}
        >
          Never mind
        </Button>
      </div>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={() => setConfirmingCancel(true)}
        disabled={loading}
      >
        {label}
      </Button>
    );

  // Already RSVP'd - show status
  if (status === "approved") {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" size="lg" variant="outline">
          <Check className="mr-2 h-4 w-4 text-green-600" />
          You&apos;re Attending
        </Button>
        {cancelConfirm("Cancel RSVP")}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" size="lg" variant="outline">
          <Clock className="mr-2 h-4 w-4 text-yellow-600" />
          Pending Approval
        </Button>
        {cancelConfirm("Cancel RSVP")}
      </div>
    );
  }

  if (status === "waitlisted") {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" size="lg" variant="outline">
          <Clock className="mr-2 h-4 w-4 text-orange-600" />
          On Waitlist
          {waitlistPosition != null && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              #{waitlistPosition}
            </span>
          )}
        </Button>
        {waitlistPosition != null && (
          <p className="text-xs text-center text-muted-foreground">
            You&apos;re #{waitlistPosition} in line — we&apos;ll notify you if a spot opens.
          </p>
        )}
        {cancelConfirm("Leave Waitlist")}
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" size="lg" variant="outline">
          <X className="mr-2 h-4 w-4 text-red-600" />
          RSVP Declined
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => handleRsvp()}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Request Again"}
        </Button>
      </div>
    );
  }

  // Not logged in - show sign in prompt
  if (!isLoggedIn) {
    return (
      <Button
        onClick={() =>
          router.push(
            `/sign-in?callbackUrl=${eventSlug ? `/e/${eventSlug}` : `/events/${eventId}`}`,
          )
        }
        className="w-full"
        size="lg"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign in to RSVP
      </Button>
    );
  }

  // Logged in, not RSVP'd yet
  async function handleRsvp(customAnswers?: Record<string, string | boolean>) {
    // If there are questions and no answers yet, open the dialog
    if (questions.length > 0 && !customAnswers) {
      setDialogOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customAnswers }),
      });

      if (res.status === 401) {
        router.push(
          `/sign-in?callbackUrl=${eventSlug ? `/e/${eventSlug}` : `/events/${eventId}`}`,
        );
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message ?? "Failed to RSVP");
        return;
      }

      const newStatus = data.rsvp?.status ?? data.status;
      setStatus(newStatus);
      setDialogOpen(false);

      if (newStatus === "pending") {
        toast.success("RSVP submitted! Awaiting host approval.");
      } else if (newStatus === "waitlisted") {
        toast.success("You've been added to the waitlist.");
      } else {
        toast.success("You're attending this event!");
      }

      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setStatus(null);
        toast.success("RSVP cancelled");
        router.refresh();
      } else {
        toast.error("Failed to cancel RSVP");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => handleRsvp()}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading
          ? "Submitting..."
          : requiresApproval
            ? "Request to Attend"
            : "RSVP - I'm Going!"}
      </Button>
      {questions.length > 0 && (
        <RsvpQuestionsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          questions={questions}
          onSubmit={(answers) => handleRsvp(answers)}
          loading={loading}
          submitLabel={requiresApproval ? "Request to Attend" : "RSVP - I'm Going!"}
        />
      )}
    </>
  );
}
