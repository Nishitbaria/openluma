"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Crown,
  Download,
  Mail,
  Search,
  ShieldCheck,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GuestDrawer } from "@/components/events/guest-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface TimelineEntry {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface Question {
  id: string;
  label: string;
  type: string;
}

interface Attendee {
  id: string;
  status: "pending" | "approved" | "rejected" | "waitlisted";
  message: string | null;
  customAnswers: Record<string, string | boolean> | null;
  createdAt: string;
  timeline: TimelineEntry[];
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

const STATUS_LABELS: Record<string, string> = {
  approved: "Going",
  pending: "Pending",
  waitlisted: "Waitlist",
  rejected: "Declined",
};

function statusBadgeClass(status: string) {
  if (status === "approved") return "bg-primary/10 text-primary border-primary/20";
  if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground";
}

export function AttendeeList({
  attendees,
  cohosts = [],
  invitations = [],
  questions = [],
  eventId,
  isHost,
}: {
  attendees: Attendee[];
  cohosts?: Cohost[];
  invitations?: Invitation[];
  questions?: Question[];
  eventId: string;
  isHost: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("time");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // ── Actions ─────────────────────────────────────────────────────────────
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

  // ── CSV Export ──────────────────────────────────────────────────────────
  function exportCsv() {
    const questionHeaders = questions
      .map((q) => `"${q.label.replace(/"/g, '""')}"`)
      .join(",");
    const header = `Name,Email,Status,Role,Date${questions.length > 0 ? `,${questionHeaders}` : ""}`;

    const attendeeAnswers = (a: Attendee) =>
      questions
        .map((q) => {
          const ans = a.customAnswers?.[q.id];
          if (ans === undefined || ans === null) return `""`;
          return `"${String(ans).replace(/"/g, '""')}"`;
        })
        .join(",");

    const rows = [
      header,
      ...cohosts.map(
        (c) =>
          `"${c.user.name}","${c.user.email ?? ""}","active","Co-host","—"${questions.length > 0 ? `,${questions.map(() => `""`).join(",")}` : ""}`,
      ),
      ...attendees.map(
        (a) =>
          `"${a.user.name}","${a.user.email}","${a.status}","Attendee","${new Date(a.createdAt).toLocaleDateString()}"${questions.length > 0 ? `,${attendeeAnswers(a)}` : ""}`,
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

  // ── Filtering + sorting ────────────────────────────────────────────────
  const cohostUserIds = useMemo(
    () => new Set(cohosts.map((c) => c.userId)),
    [cohosts],
  );

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    const list = attendees.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (
        search &&
        !a.user.name.toLowerCase().includes(searchLower) &&
        !a.user.email.toLowerCase().includes(searchLower)
      )
        return false;
      return true;
    });

    if (sort === "name") list.sort((a, b) => a.user.name.localeCompare(b.user.name));
    else if (sort === "status") list.sort((a, b) => a.status.localeCompare(b.status));
    // default: time — already sorted by createdAt desc from server

    return list;
  }, [attendees, filter, search, sort]);

  const { pendingInvitations, otherInvitations } = useMemo(() => {
    const pending: Invitation[] = [];
    const other: Invitation[] = [];
    for (const i of invitations) {
      if (i.status === "accepted") continue;
      if (i.status === "pending") pending.push(i);
      else other.push(i);
    }
    return { pendingInvitations: pending, otherInvitations: other };
  }, [invitations]);

  const visibleInvitations = [...pendingInvitations, ...otherInvitations];

  const selectedAttendee = selectedIdx !== null ? filtered[selectedIdx] : null;

  return (
    <div className="space-y-6">
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
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={cohost.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {cohost.user.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cohost.user.name}</p>
                    {cohost.user.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {cohost.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Co-host
                  </Badge>
                  {isHost && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      disabled={loading === cohost.userId}
                      onClick={() => removeCohost(cohost.userId)}
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1" />
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

      {/* Guest List Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Guest List</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportCsv}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter + Sort */}
        <div className="flex items-center justify-between gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guests</SelectItem>
              <SelectItem value="approved">Going</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="waitlisted">Waitlist</SelectItem>
              <SelectItem value="rejected">Declined</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Register Time</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Guest rows */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center border rounded-lg border-dashed">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">
            {attendees.length === 0 ? "No RSVPs yet" : "No matching guests"}
          </p>
          <p className="text-xs text-muted-foreground">
            {attendees.length === 0
              ? "Share your event link to start collecting RSVPs."
              : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((attendee, idx) => (
            <button
              key={attendee.id}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={attendee.user.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {attendee.user.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{attendee.user.name}</p>
              </div>
              <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">
                {attendee.user.email}
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${statusBadgeClass(attendee.status)}`}
              >
                {STATUS_LABELS[attendee.status] ?? attendee.status}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0 w-12 text-right hidden sm:block">
                {formatDistanceToNow(new Date(attendee.createdAt), { addSuffix: false })}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Guest detail drawer */}
      <Sheet
        open={selectedAttendee !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIdx(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
          {selectedAttendee && (
            <GuestDrawer
              attendee={selectedAttendee}
              questions={questions}
              eventId={eventId}
              isHost={isHost}
              onPrev={() =>
                setSelectedIdx((i) => Math.max(0, (i ?? 0) - 1))
              }
              onNext={() =>
                setSelectedIdx((i) =>
                  Math.min(filtered.length - 1, (i ?? 0) + 1),
                )
              }
              hasPrev={(selectedIdx ?? 0) > 0}
              hasNext={(selectedIdx ?? 0) < filtered.length - 1}
              onStatusChange={() => router.refresh()}
            />
          )}
        </SheetContent>
      </Sheet>

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
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">invited</Badge>
                    {inv.role === "cohost" && (
                      <Badge variant="outline" className="text-xs">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Co-host
                      </Badge>
                    )}
                    {isHost && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        disabled={loading === inv.id}
                        onClick={() => revokeInvitation(inv.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {otherInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-4 py-3 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={inv.status === "declined" || inv.status === "expired" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {inv.status}
                    </Badge>
                    {inv.role === "cohost" && (
                      <Badge variant="outline" className="text-xs">
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
