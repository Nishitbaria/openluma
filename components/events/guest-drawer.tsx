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

interface GuestDrawerProps {
  attendee: Attendee;
  questions: Question[];
  eventId: string;
  isHost: boolean;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onStatusChange: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  approved: "Going",
  pending: "Pending",
  waitlisted: "Waiting list",
  rejected: "Not going",
};

function statusBadgeClass(status: string) {
  if (status === "approved") return "bg-primary/10 text-primary border-primary/20";
  if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground";
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

  const initial = attendee.user.name?.[0]?.toUpperCase() ?? "?";
  const regDate = new Date(attendee.createdAt);

  async function changeStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvpId: attendee.id,
          status,
          notifyGuest,
          customMessage: customMessage.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
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

  const hasAnswers = attendee.customAnswers && questions.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header with nav arrows */}
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-base font-semibold">Guest Details</h3>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!hasPrev}
            onClick={onPrev}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!hasNext}
            onClick={onNext}
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
              <AvatarImage src={attendee.user.image ?? undefined} alt={attendee.user.name} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{attendee.user.name}</p>
                <button
                  type="button"
                  onClick={() => isHost && setStatusModalOpen(true)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(attendee.status)} ${isHost ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                >
                  {STATUS_LABELS[attendee.status] ?? attendee.status}
                  {isHost && <Pencil className="h-2.5 w-2.5" />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground truncate">{attendee.user.email}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Registration Time</p>
            <p className="text-sm font-medium">
              {format(regDate, "MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>

        <Separator />

        {/* Registration Questions */}
        {hasAnswers && (
          <>
            <div>
              <h4 className="text-sm font-semibold mb-3">Registration Questions</h4>
              <div className="space-y-3">
                {questions.map((q) => {
                  const ans = attendee.customAnswers?.[q.id];
                  if (ans === undefined || ans === null) return null;
                  return (
                    <div key={q.id}>
                      <p className="text-xs text-muted-foreground">{q.label}</p>
                      <p className="text-sm font-medium">
                        {typeof ans === "boolean" ? (ans ? "Yes" : "No") : String(ans)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Message */}
        {attendee.message && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Message</p>
              <p className="text-sm italic">"{attendee.message}"</p>
            </div>
            <Separator />
          </>
        )}

        {/* Timeline */}
        {attendee.timeline.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Timeline</h4>
            <div className="space-y-0">
              {attendee.timeline.map((entry, idx) => {
                const isLast = idx === attendee.timeline.length - 1;
                const entryDate = new Date(entry.createdAt);
                const isRegistered = entry.type === "registered";
                const Icon = isRegistered ? CheckSquare : UserCog;

                return (
                  <div key={entry.id} className="flex gap-3">
                    {/* Timeline line + icon */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border" />}
                    </div>

                    {/* Content */}
                    <div className="pb-4 min-w-0">
                      {isRegistered ? (
                        <>
                          <p className="text-sm font-medium">Registered</p>
                          <p className="text-xs text-muted-foreground">
                            {format(entryDate, "MMM d 'at' h:mm a")}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium">
                            {STATUS_LABELS[entry.fromStatus ?? ""] ?? entry.fromStatus} → {STATUS_LABELS[entry.toStatus ?? ""] ?? entry.toStatus}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status Updated
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(entryDate, "MMM d 'at' h:mm a")}
                            {entry.changedByName && ` · ${entry.changedByName}`}
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
          href={`/ticket/${eventId}?userId=${attendee.user.id}`}
          target="_blank"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Ticket className="h-3 w-3" />
          Ticket QR Code ↗
        </Link>
      </div>

      {/* Status change modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={attendee.user.image ?? undefined} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base truncate">{attendee.user.name}</DialogTitle>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${statusBadgeClass(attendee.status)}`}
                  >
                    {STATUS_LABELS[attendee.status] ?? attendee.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{attendee.user.email}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {attendee.status === "pending" ? (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notify-pending"
                    checked={notifyGuest}
                    onCheckedChange={(v) => setNotifyGuest(v === true)}
                  />
                  <Label htmlFor="notify-pending" className="text-sm">Notify Guest</Label>
                </div>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Add an optional, custom message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Any message you specified in the registration emails will always be included.
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
                    variant="destructive"
                    disabled={loading}
                    onClick={() => changeStatus("rejected")}
                  >
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">Change status to:</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
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
                    id="notify-change"
                    checked={notifyGuest}
                    onCheckedChange={(v) => setNotifyGuest(v === true)}
                  />
                  <Label htmlFor="notify-change" className="text-sm">Notify Guest</Label>
                </div>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Add an optional, custom message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Any message you specified in the registration emails will always be included.
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
