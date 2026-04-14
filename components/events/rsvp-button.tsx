"use client";

import { Check, Clock, LogIn, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function RsvpButton({
  eventId,
  eventSlug,
  requiresApproval,
  currentRsvpStatus,
}: {
  eventId: string;
  eventSlug?: string;
  requiresApproval: boolean;
  currentRsvpStatus?: "pending" | "approved" | "rejected" | "waitlisted" | null;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentRsvpStatus);

  const isLoggedIn = !!session?.user;

  // Already RSVP'd - show status
  if (status === "approved") {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" size="lg" variant="outline">
          <Check className="mr-2 h-4 w-4 text-green-600" />
          You&apos;re Attending
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => handleCancel()}
          disabled={loading}
        >
          Cancel RSVP
        </Button>
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
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => handleCancel()}
          disabled={loading}
        >
          Cancel RSVP
        </Button>
      </div>
    );
  }

  if (status === "waitlisted") {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full" size="lg" variant="outline">
          <Clock className="mr-2 h-4 w-4 text-orange-600" />
          On Waitlist
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => handleCancel()}
          disabled={loading}
        >
          Leave Waitlist
        </Button>
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
  async function handleRsvp() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
    <Button
      onClick={handleRsvp}
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
  );
}
