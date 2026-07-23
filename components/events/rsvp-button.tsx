"use client";

import { Check, Clock, LogIn, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  autoRegister = false,
}: {
  eventId: string;
  eventSlug?: string;
  requiresApproval: boolean;
  currentRsvpStatus?: "pending" | "approved" | "rejected" | "waitlisted" | null;
  questions?: EventQuestion[];
  waitlistPosition?: number | null;
  autoRegister?: boolean;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentRsvpStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLabel, setCancelLabel] = useState("");

  const isLoggedIn = !!session?.user;

  // Invited guests arrive from the accept flow with ?register=1 — open the
  // questions dialog automatically so they complete registration before joining.
  useEffect(() => {
    if (autoRegister && isLoggedIn && questions.length > 0 && !status) {
      setDialogOpen(true);
    }
  }, [autoRegister, isLoggedIn, questions.length, status]);

  const openCancelModal = (label: string) => {
    setCancelLabel(label);
    setCancelModalOpen(true);
  };

  const cancelConfirm = (label: string) => (
    <Button
      className="w-full text-muted-foreground"
      disabled={loading}
      onClick={() => openCancelModal(label)}
      size="sm"
      variant="ghost"
    >
      {label}
    </Button>
  );

  const isLeavingWaitlist = cancelLabel === "Leave Waitlist";
  const cancelConfirmLabel = (() => {
    if (loading) {
      return "Cancelling...";
    }
    return isLeavingWaitlist ? "Leave Waitlist" : "Cancel RSVP";
  })();

  const cancelModal = (
    <Dialog onOpenChange={setCancelModalOpen} open={cancelModalOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isLeavingWaitlist ? "Leave Waitlist?" : "Cancel RSVP?"}
          </DialogTitle>
          <DialogDescription>
            {isLeavingWaitlist
              ? "You'll lose your spot in the waitlist. You can re-join later, but you'll be placed at the end of the line."
              : "Are you sure you want to cancel your RSVP? You can re-register later if spots are still available."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={loading}
            onClick={() => setCancelModalOpen(false)}
            variant="outline"
          >
            Keep my spot
          </Button>
          <Button
            disabled={loading}
            onClick={() => {
              setCancelModalOpen(false);
              handleCancel();
            }}
            variant="destructive"
          >
            {cancelConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Already RSVP'd - show status
  if (status === "approved") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-md border bg-primary/10 px-4 py-3 font-medium text-primary text-sm">
          <Check className="h-4 w-4" />
          You&apos;re In
        </div>
        <p className="text-center text-muted-foreground text-xs">
          See you there — add it to your calendar below.
        </p>
        {cancelConfirm("Cancel RSVP")}
        {cancelModal}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-md border bg-muted px-4 py-3 font-medium text-muted-foreground text-sm">
          <Clock className="h-4 w-4" />
          Pending Approval
        </div>
        {cancelConfirm("Cancel RSVP")}
        {cancelModal}
      </div>
    );
  }

  if (status === "waitlisted") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-md border bg-muted px-4 py-3 font-medium text-muted-foreground text-sm">
          <Clock className="h-4 w-4" />
          On Waitlist
          {waitlistPosition !== null && (
            <span className="font-normal text-xs">#{waitlistPosition}</span>
          )}
        </div>
        {waitlistPosition !== null && (
          <p className="text-center text-muted-foreground text-xs">
            You&apos;re #{waitlistPosition} in line — we&apos;ll notify you if a
            spot opens.
          </p>
        )}
        {cancelConfirm("Leave Waitlist")}
        {cancelModal}
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-medium text-destructive text-sm">
          <X className="h-4 w-4" />
          RSVP Declined
        </div>
        <Button
          className="w-full text-muted-foreground"
          disabled={loading}
          onClick={() => handleRsvp()}
          size="sm"
          variant="ghost"
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
        className="w-full"
        onClick={() =>
          router.push(
            `/sign-in?callbackUrl=${eventSlug ? `/e/${eventSlug}` : `/events/${eventId}`}`
          )
        }
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
        body: JSON.stringify({ customAnswers }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (res.status === 401) {
        router.push(
          `/sign-in?callbackUrl=${eventSlug ? `/e/${eventSlug}` : `/events/${eventId}`}`
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
        toast.success(
          "You're in! 🎉 Add it to your calendar so you don't miss it."
        );
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
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
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

  const rsvpActionLabel = requiresApproval
    ? "Request to Attend"
    : "RSVP - I'm Going!";
  const rsvpButtonLabel = loading ? "Submitting..." : rsvpActionLabel;

  return (
    <>
      <Button
        className="w-full"
        disabled={loading}
        onClick={() => handleRsvp()}
        size="lg"
      >
        {rsvpButtonLabel}
      </Button>
      {questions.length > 0 && (
        <RsvpQuestionsDialog
          loading={loading}
          onOpenChange={setDialogOpen}
          onSubmit={(answers) => handleRsvp(answers)}
          open={dialogOpen}
          questions={questions}
          submitLabel={rsvpActionLabel}
        />
      )}
    </>
  );
}
