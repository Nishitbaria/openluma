"use client";

import {
  Check,
  Crown,
  Download,
  Mail,
  ShieldCheck,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Attendee {
  id: string;
  status: "pending" | "approved" | "rejected" | "waitlisted";
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface Cohost {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    email?: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "expired";
  role: "attendee" | "cohost";
  createdAt: string;
  expiresAt: string | null;
}

export function AttendeeList({
  attendees,
  cohosts = [],
  invitations = [],
  eventId,
  isHost,
}: {
  attendees: Attendee[];
  cohosts?: Cohost[];
  invitations?: Invitation[];
  eventId: string;
  isHost: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(rsvpId: string, status: string) {
    setLoading(rsvpId);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpId, status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`RSVP ${status}`);
      router.refresh();
    } catch {
      toast.error("Failed to update RSVP");
    } finally {
      setLoading(null);
    }
  }

  async function removeRsvp(rsvpId: string) {
    setLoading(rsvpId);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("RSVP removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove RSVP");
    } finally {
      setLoading(null);
    }
  }

  async function revokeInvitation(invitationId: string) {
    setLoading(invitationId);
    try {
      const res = await fetch(`/api/events/${eventId}/invitations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invitation revoked");
      router.refresh();
    } catch {
      toast.error("Failed to revoke invitation");
    } finally {
      setLoading(null);
    }
  }

  async function promoteToCohost(userId: string) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/cohosts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Promoted to co-host");
      router.refresh();
    } catch {
      toast.error("Failed to promote to co-host");
    } finally {
      setLoading(null);
    }
  }

  async function removeCohost(userId: string) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/cohosts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Co-host removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove co-host");
    } finally {
      setLoading(null);
    }
  }

  function exportCsv() {
    const rows = [
      "Name,Email,Status,Role,Date",
      ...cohosts.map(
        (c) =>
          `"${c.user.name}","${c.user.email ?? ""}","active","Co-host","—"`,
      ),
      ...attendees.map(
        (a) =>
          `"${a.user.name}","${a.user.email}","${a.status}","Attendee","${new Date(a.createdAt).toLocaleDateString()}"`,
      ),
      ...invitations.map(
        (inv) =>
          `"—","${inv.email}","${inv.status}","${inv.role === "cohost" ? "Co-host" : "Attendee"} (invited)","${new Date(inv.createdAt).toLocaleDateString()}"`,
      ),
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const cohostUserIds = new Set(cohosts.map((c) => c.userId));
  const visibleInvitations = invitations.filter((i) => i.status !== "accepted");
  const pendingInvitations = visibleInvitations.filter(
    (i) => i.status === "pending",
  );
  const otherInvitations = visibleInvitations.filter(
    (i) => i.status !== "pending",
  );

  const statusVariant = (status: string) => {
    switch (status) {
      case "approved":
      case "accepted":
        return "default";
      case "pending":
        return "secondary";
      case "declined":
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Co-hosts Section */}
      {cohosts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <Crown className="inline h-4 w-4 mr-1 -mt-0.5" />
            Co-hosts ({cohosts.length})
          </h3>
          <div className="divide-y rounded-lg border">
            {cohosts.map((cohost) => (
              <div
                key={cohost.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {cohost.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium">{cohost.user.name}</p>
                    {cohost.user.email && (
                      <p className="text-sm text-muted-foreground">
                        {cohost.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Co-host
                  </Badge>
                  {isHost && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground hover:text-destructive"
                      disabled={loading === cohost.userId}
                      onClick={() => removeCohost(cohost.userId)}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cohosts.length > 0 && <Separator />}

      {/* RSVPs Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          RSVPs ({attendees.length})
        </h3>
        {attendees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No RSVPs yet.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {attendees.map((attendee) => (
              <div
                key={attendee.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {attendee.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium">{attendee.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {attendee.user.email}
                    </p>
                    {attendee.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        &quot;{attendee.message}&quot;
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(attendee.status)}>
                    {attendee.status}
                  </Badge>
                  {isHost &&
                    attendee.status === "approved" &&
                    !cohostUserIds.has(attendee.user.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-muted-foreground"
                        disabled={loading === attendee.user.id}
                        onClick={() => promoteToCohost(attendee.user.id)}
                        title="Promote to co-host"
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Make Co-host
                      </Button>
                    )}
                  {isHost && attendee.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={loading === attendee.id}
                        onClick={() => updateStatus(attendee.id, "approved")}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={loading === attendee.id}
                        onClick={() => updateStatus(attendee.id, "rejected")}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                  {isHost && attendee.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground hover:text-destructive"
                      disabled={loading === attendee.id}
                      onClick={() => removeRsvp(attendee.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitations Section */}
      {visibleInvitations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <Mail className="inline h-4 w-4 mr-1 -mt-0.5" />
              Email Invitations ({visibleInvitations.length})
            </h3>
            <div className="divide-y rounded-lg border">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(inv.createdAt).toLocaleDateString()}
                        {inv.expiresAt &&
                          ` · Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">invited</Badge>
                    {inv.role === "cohost" && (
                      <Badge variant="outline">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Co-host
                      </Badge>
                    )}
                    {isHost && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-muted-foreground hover:text-destructive"
                        disabled={loading === inv.id}
                        onClick={() => revokeInvitation(inv.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {otherInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(inv.status)}>
                      {inv.status}
                    </Badge>
                    {inv.role === "cohost" && (
                      <Badge variant="outline">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Co-host
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
