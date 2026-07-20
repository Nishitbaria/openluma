"use client";

import { format, formatDistanceToNow } from "date-fns";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimelineEntry {
  changedByName: string | null;
  createdAt: string;
  fromStatus: string | null;
  id: string;
  toStatus: string | null;
  type: string;
}

interface Question {
  id: string;
  label: string;
  type: string;
}

interface Attendee {
  createdAt: string;
  customAnswers: Record<string, string | boolean> | null;
  id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "waitlisted";
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
  user: {
    id: string;
    name: string;
    image: string | null;
    email?: string;
  };
  userId: string;
}

interface Invitation {
  createdAt: string;
  email: string;
  expiresAt: string | null;
  id: string;
  role: "attendee" | "cohost";
  status: "pending" | "accepted" | "declined" | "expired";
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Going",
  pending: "Pending",
  rejected: "Declined",
  waitlisted: "Waitlist",
};

function statusBadgeClass(status: string) {
  if (status === "approved") {
    return "bg-primary/10 text-primary border-primary/20";
  }
  if (status === "rejected") {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
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
        body: JSON.stringify({ invitationId }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed");
      }
      toast.success("Invitation revoked");
      router.refresh();
    } catch {
      toast.error("Failed to revoke invitation");
    } finally {
      setLoading(null);
    }
  }

  async function removeCohost(userId: string) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/events/${eventId}/cohosts`, {
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed");
      }
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

    const attendeeAnswers = (entry: Attendee) =>
      questions
        .map((q) => {
          const ans = entry.customAnswers?.[q.id];
          if (ans === undefined || ans === null) {
            return `""`;
          }
          return `"${String(ans).replace(/"/g, '""')}"`;
        })
        .join(",");

    const rows = [
      header,
      ...cohosts.map(
        (c) =>
          `"${c.user.name}","${c.user.email ?? ""}","active","Co-host","—"${questions.length > 0 ? `,${questions.map(() => `""`).join(",")}` : ""}`
      ),
      ...attendees.map(
        (entry) =>
          `"${entry.user.name}","${entry.user.email}","${entry.status}","Attendee","${new Date(entry.createdAt).toLocaleDateString()}"${questions.length > 0 ? `,${attendeeAnswers(entry)}` : ""}`
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
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    const list = attendees.filter((a) => {
      if (filter !== "all" && a.status !== filter) {
        return false;
      }
      if (
        search &&
        !a.user.name.toLowerCase().includes(searchLower) &&
        !a.user.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
      return true;
    });

    if (sort === "name") {
      list.sort((a, b) => a.user.name.localeCompare(b.user.name));
    } else if (sort === "status") {
      list.sort((a, b) => a.status.localeCompare(b.status));
    }
    // default: time — already sorted by createdAt desc from server

    return list;
  }, [attendees, filter, search, sort]);

  const { pendingInvitations, otherInvitations } = useMemo(() => {
    const pending: Invitation[] = [];
    const other: Invitation[] = [];
    for (const i of invitations) {
      if (i.status === "accepted") {
        continue;
      }
      if (i.status === "pending") {
        pending.push(i);
      } else {
        other.push(i);
      }
    }
    return { otherInvitations: other, pendingInvitations: pending };
  }, [invitations]);

  const visibleInvitations = [...pendingInvitations, ...otherInvitations];

  const selectedAttendee = selectedIdx === null ? null : filtered[selectedIdx];

  return (
    <div className="space-y-6">
      {/* Co-hosts Section */}
      {cohosts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
            <Crown className="-mt-0.5 mr-1 inline h-4 w-4" />
            Co-hosts ({cohosts.length})
          </h3>
          <div className="divide-y rounded-lg border">
            {cohosts.map((cohost) => (
              <div
                className="flex items-center justify-between px-4 py-3"
                key={cohost.id}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={cohost.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {cohost.user.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {cohost.user.name}
                    </p>
                    {cohost.user.email ? (
                      <p className="truncate text-muted-foreground text-xs">
                        {cohost.user.email}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs" variant="default">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Co-host
                  </Badge>
                  {isHost ? (
                    <Button
                      className="h-7 text-muted-foreground text-xs hover:text-destructive"
                      disabled={loading === cohost.userId}
                      onClick={() => removeCohost(cohost.userId)}
                      size="sm"
                      variant="ghost"
                    >
                      <UserMinus className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  ) : null}
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
          <h3 className="font-semibold text-base">Guest List</h3>
          <Button
            className="h-8 w-8"
            onClick={exportCsv}
            size="icon"
            variant="ghost"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests..."
            value={search}
          />
        </div>

        {/* Filter + Sort */}
        <div className="flex items-center justify-between gap-2">
          <Select onValueChange={setFilter} value={filter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
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

          <Select onValueChange={setSort} value={sort}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
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
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-medium text-sm">
            {attendees.length === 0 ? "No RSVPs yet" : "No matching guests"}
          </p>
          <p className="text-muted-foreground text-xs">
            {attendees.length === 0
              ? "Share your event link to start collecting RSVPs."
              : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="divide-y rounded-lg border sm:hidden">
            {filtered.map((attendee, idx) => (
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                key={attendee.id}
                onClick={() => setSelectedIdx(idx)}
                type="button"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={attendee.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {attendee.user.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {attendee.user.name}
                  </p>
                </div>
                <span
                  className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 font-medium text-[10px] ${statusBadgeClass(attendee.status)}`}
                >
                  {STATUS_LABELS[attendee.status] ?? attendee.status}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((attendee, idx) => (
                  <TableRow
                    className="cursor-pointer"
                    key={attendee.id}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={attendee.user.image ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {attendee.user.name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">
                          {attendee.user.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {attendee.user.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[10px] ${statusBadgeClass(attendee.status)}`}
                      >
                        {STATUS_LABELS[attendee.status] ?? attendee.status}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatDistanceToNow(new Date(attendee.createdAt), {
                        addSuffix: false,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Guest detail drawer */}
      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIdx(null);
          }
        }}
        open={selectedAttendee !== null}
      >
        <SheetContent
          className="w-full overflow-y-auto p-6 sm:max-w-md"
          side="right"
        >
          {selectedAttendee ? (
            <GuestDrawer
              attendee={selectedAttendee}
              eventId={eventId}
              hasNext={(selectedIdx ?? 0) < filtered.length - 1}
              hasPrev={(selectedIdx ?? 0) > 0}
              isHost={isHost}
              onNext={() =>
                setSelectedIdx((i) =>
                  Math.min(filtered.length - 1, (i ?? 0) + 1)
                )
              }
              onPrev={() => setSelectedIdx((i) => Math.max(0, (i ?? 0) - 1))}
              onStatusChange={() => router.refresh()}
              questions={questions}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Invitations Section */}
      {visibleInvitations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
              <Mail className="-mt-0.5 mr-1 inline h-4 w-4" />
              Email Invitations ({visibleInvitations.length})
            </h3>
            <div className="divide-y rounded-lg border">
              {pendingInvitations.map((inv) => (
                <div
                  className="flex items-center justify-between px-4 py-3"
                  key={inv.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {inv.email}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Invited {format(new Date(inv.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs" variant="secondary">
                      invited
                    </Badge>
                    {inv.role === "cohost" && (
                      <Badge className="text-xs" variant="outline">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Co-host
                      </Badge>
                    )}
                    {isHost ? (
                      <Button
                        className="h-7 text-muted-foreground text-xs hover:text-destructive"
                        disabled={loading === inv.id}
                        onClick={() => revokeInvitation(inv.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {otherInvitations.map((inv) => (
                <div
                  className="flex items-center justify-between px-4 py-3 opacity-60"
                  key={inv.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {inv.email}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Invited {format(new Date(inv.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className="text-xs"
                      variant={
                        inv.status === "declined" || inv.status === "expired"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {inv.status}
                    </Badge>
                    {inv.role === "cohost" && (
                      <Badge className="text-xs" variant="outline">
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
