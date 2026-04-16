import { format } from "date-fns";
import { Calendar, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface TimelineEvent {
  id: string;
  slug?: string | null;
  title: string;
  startTime: Date | string;
  coverImage: string | null;
  location: string | null;
  type: "in_person" | "virtual" | "hybrid";
  host?: { name: string | null; image: string | null } | null;
  rsvpStatus?: string | null;
}

interface EventTimelineProps {
  events: TimelineEvent[];
  href?: (event: TimelineEvent) => string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}

function groupByDate(events: TimelineEvent[]) {
  const groups: { dateKey: string; date: Date; events: TimelineEvent[] }[] = [];
  for (const event of events) {
    const d =
      typeof event.startTime === "string"
        ? new Date(event.startTime)
        : event.startTime;
    const key = format(d, "yyyy-MM-dd");
    const existing = groups.find((g) => g.dateKey === key);
    if (existing) existing.events.push(event);
    else groups.push({ dateKey: key, date: d, events: [event] });
  }
  return groups;
}

function rsvpBadgeStyle(status: string) {
  if (status === "approved") return "bg-primary/10 text-primary border-primary/20";
  if (status === "waitlisted") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground"; // pending, rejected
}

function rsvpLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "waitlisted") return "Waitlisted";
  if (status === "pending") return "Pending";
  if (status === "rejected") return "Declined";
  return status;
}

export function EventTimeline({
  events,
  href,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground" />
        <h3 className="mt-4 text-base font-semibold">{emptyTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        {emptyAction}
      </div>
    );
  }

  const groups = groupByDate(events);

  return (
    <div className="space-y-0">
      {groups.map((group) => (
        <div key={group.dateKey} className="flex gap-6">
          {/* Date label */}
          <div className="w-20 flex-shrink-0 pt-4 text-right">
            <p className="text-sm font-semibold leading-tight">
              {format(group.date, "d MMM")}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(group.date, "EEEE")}
            </p>
          </div>

          {/* Timeline line + dot */}
          <div className="flex flex-shrink-0 flex-col items-center">
            <div className="mt-5 h-2 w-2 rounded-full bg-muted-foreground/50" />
            <div className="mt-1 flex-1 w-px bg-border" />
          </div>

          {/* Events for this date */}
          <div className="flex-1 space-y-2 pb-6 pt-3">
            {group.events.map((event) => {
              const startTime =
                typeof event.startTime === "string"
                  ? new Date(event.startTime)
                  : event.startTime;
              const eventHref =
                href?.(event) ??
                (event.slug ? `/e/${event.slug}` : `/events/${event.id}`);
              const isVirtual = event.type === "virtual";
              const hostInitial =
                event.host?.name?.charAt(0).toUpperCase() ?? "?";

              return (
                <Link key={event.id} href={eventHref} className="block">
                  <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50">
                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {format(startTime, "h:mm a")}
                      </p>
                      <p className="truncate text-sm font-semibold leading-snug">
                        {event.title}
                      </p>

                      {event.host?.name && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage
                              src={event.host.image ?? undefined}
                              alt={event.host.name}
                            />
                            <AvatarFallback className="text-[8px]">
                              {hostInitial}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            By {event.host.name}
                          </span>
                        </div>
                      )}

                      {(event.location ?? isVirtual) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {isVirtual ? (
                            <Video className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {isVirtual ? event.location ?? "Online" : event.location}
                          </span>
                        </div>
                      )}

                      {event.rsvpStatus && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${rsvpBadgeStyle(event.rsvpStatus)}`}
                        >
                          {rsvpLabel(event.rsvpStatus)}
                        </span>
                      )}
                    </div>

                    {/* Cover image / placeholder */}
                    <div className="flex-shrink-0">
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-muted">
                          <span className="text-lg font-bold leading-none text-muted-foreground">
                            {format(startTime, "d")}
                          </span>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {format(startTime, "MMM")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
