"use client";

import { format } from "date-fns";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Pencil,
  Ticket,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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

interface GuestDrawerProps {
  attendee: Attendee;
  eventId: string;
  hasNext: boolean;
  hasPrev: boolean;
  isHost: boolean;
  onNext: () => void;
  onPrev: () => void;
  onStatusChange: () => void;
  questions: Question[];
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Going",
  pending: "Pending",
  rejected: "Not going",
  waitlisted: "Waiting list",
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

function formatAnswer(ans: string | boolean) {
  if (typeof ans === "boolean") {
    return ans ? "Yes" : "No";
  }
  return String(ans);
}

export function GuestDrawer({
  attendee,
  questions,
  eventId,
  isHost,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onStatusChange,
}: GuestDrawerProps) {
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [notifyGuest, setNotifyGuest] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const initial = attendee.user.name[0]?.toUpperCase() ?? "?";
  const regDate = new Date(attendee.createdAt);

  async function changeStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        body: JSON.stringify({
          customMessage: customMessage.trim() || undefined,
          notifyGuest,
          rsvpId: attendee.id,
          status,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error("Failed");
      }
      toast.success(`Status updated to ${STATUS_LABELS[status] ?? status}`);
      setStatusModalOpen(false);
      setNewStatus("");
      setCustomMessage("");
      onStatusChange();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  const hasAnswers = Boolean(attendee.customAnswers) && questions.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header with nav arrows */}
      <div className="flex items-center justify-between pb-4">
        <h3 className="font-semibold text-base">Guest Details</h3>
        <div className="flex items-center gap-1">
          <Button
            className="h-7 w-7"
            disabled={!hasPrev}
            onClick={onPrev}
            size="icon"
            variant="ghost"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            className="h-7 w-7"
            disabled={!hasNext}
            onClick={onNext}
            size="icon"
            variant="ghost"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto">
        {/* Profile */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                alt={attendee.user.name}
                src={attendee.user.image ?? undefined}
              />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{attendee.user.name}</p>
                <button
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs ${statusBadgeClass(attendee.status)} ${isHost ? "cursor-pointer transition-opacity hover:opacity-80" : ""}`}
                  onClick={() => isHost && setStatusModalOpen(true)}
                  type="button"
                >
                  {STATUS_LABELS[attendee.status] ?? attendee.status}
                  {isHost ? <Pencil className="h-2.5 w-2.5" /> : null}
                </button>
              </div>
              <p className="truncate text-muted-foreground text-sm">
                {attendee.user.email}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Registration Time</p>
            <p className="font-medium text-sm">
              {format(regDate, "MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>

        <Separator />

        {/* Registration Questions */}
        {hasAnswers ? (
          <>
            <div>
              <h4 className="mb-3 font-semibold text-sm">
                Registration Questions
              </h4>
              <div className="space-y-3">
                {questions.map((q) => {
                  const ans = attendee.customAnswers?.[q.id];
                  if (ans === undefined || ans === null) {
                    return null;
                  }
                  return (
                    <div key={q.id}>
                      <p className="text-muted-foreground text-xs">{q.label}</p>
                      <p className="font-medium text-sm">{formatAnswer(ans)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        ) : null}

        {/* Message */}
        {attendee.message ? (
          <>
            <div>
              <p className="mb-1 text-muted-foreground text-xs">Message</p>
              <p className="text-sm italic">"{attendee.message}"</p>
            </div>
            <Separator />
          </>
        ) : null}

        {/* Timeline */}
        {attendee.timeline.length > 0 && (
          <div>
            <h4 className="mb-3 font-semibold text-sm">Timeline</h4>
            <div className="space-y-0">
              {attendee.timeline.map((entry, idx) => {
                const isLast = idx === attendee.timeline.length - 1;
                const entryDate = new Date(entry.createdAt);
                const isRegistered = entry.type === "registered";
                const Icon = isRegistered ? CheckSquare : UserCog;

                return (
                  <div className="flex gap-3" key={entry.id}>
                    {/* Timeline line + icon */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border" />}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 pb-4">
                      {isRegistered ? (
                        <>
                          <p className="font-medium text-sm">Registered</p>
                          <p className="text-muted-foreground text-xs">
                            {format(entryDate, "MMM d 'at' h:mm a")}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-sm">
                            {STATUS_LABELS[entry.fromStatus ?? ""] ??
                              entry.fromStatus}{" "}
                            →{" "}
                            {STATUS_LABELS[entry.toStatus ?? ""] ??
                              entry.toStatus}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Status Updated
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {format(entryDate, "MMM d 'at' h:mm a")}
                            {entry.changedByName
                              ? ` · ${entry.changedByName}`
                              : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <Separator className="my-3" />
      <div className="flex items-center justify-between text-xs">
        <Link
          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          href={`/ticket/${eventId}?userId=${attendee.user.id}`}
          target="_blank"
        >
          <Ticket className="h-3 w-3" />
          Ticket QR Code ↗
        </Link>
      </div>

      {/* Status change modal */}
      <Dialog onOpenChange={setStatusModalOpen} open={statusModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={attendee.user.image ?? undefined} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate text-base">
                    {attendee.user.name}
                  </DialogTitle>
                  <span
                    className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 font-medium text-[10px] ${statusBadgeClass(attendee.status)}`}
                  >
                    {STATUS_LABELS[attendee.status] ?? attendee.status}
                  </span>
                </div>
                <p className="truncate text-muted-foreground text-sm">
                  {attendee.user.email}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {attendee.status === "pending" ? (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={notifyGuest}
                    id="notify-pending"
                    onCheckedChange={(v) => setNotifyGuest(v === true)}
                  />
                  <Label className="text-sm" htmlFor="notify-pending">
                    Notify Guest
                  </Label>
                </div>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add an optional, custom message..."
                  value={customMessage}
                />
                <p className="text-muted-foreground text-xs">
                  Any message you specified in the registration emails will
                  always be included.
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={loading}
                    onClick={() => changeStatus("approved")}
                  >
                    {loading ? "Updating..." : "Admit"}
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={loading}
                    onClick={() => changeStatus("rejected")}
                    variant="destructive"
                  >
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">Change status to:</Label>
                  <Select onValueChange={setNewStatus} value={newStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {attendee.status !== "approved" && (
                        <SelectItem value="approved">Going</SelectItem>
                      )}
                      <SelectItem value="pending">Pending</SelectItem>
                      {attendee.status !== "waitlisted" && (
                        <SelectItem value="waitlisted">Waiting list</SelectItem>
                      )}
                      {attendee.status !== "rejected" && (
                        <SelectItem value="rejected">Not going</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={notifyGuest}
                    id="notify-change"
                    onCheckedChange={(v) => setNotifyGuest(v === true)}
                  />
                  <Label className="text-sm" htmlFor="notify-change">
                    Notify Guest
                  </Label>
                </div>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add an optional, custom message..."
                  value={customMessage}
                />
                <p className="text-muted-foreground text-xs">
                  Any message you specified in the registration emails will
                  always be included.
                </p>
                <Button
                  className="w-full"
                  disabled={loading || !newStatus}
                  onClick={() => newStatus && changeStatus(newStatus)}
                >
                  {loading ? "Updating..." : "Update Status"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
