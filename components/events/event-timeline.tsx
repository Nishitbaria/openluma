import { formatInTimeZone } from "date-fns-tz";
import { Calendar, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface TimelineEvent {
  coverImage: string | null;
  host?: { name: string | null; image: string | null } | null;
  id: string;
  location: string | null;
  rsvpStatus?: string | null;
  slug?: string | null;
  startTime: Date | string;
  timezone?: string;
  title: string;
  type: "in_person" | "virtual" | "hybrid";
}

interface EventTimelineProps {
  emptyAction?: React.ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  events: TimelineEvent[];
  href?: (event: TimelineEvent) => string;
}

function groupByDate(events: TimelineEvent[]) {
  const groups: {
    dateKey: string;
    date: Date;
    timezone: string;
    events: TimelineEvent[];
  }[] = [];
  for (const event of events) {
    const d =
      typeof event.startTime === "string"
        ? new Date(event.startTime)
        : event.startTime;
    const timezone = event.timezone ?? "UTC";
    // Group by the event's own local day, so the day header matches the
    // time printed on each card (rather than the server's local day).
    const key = formatInTimeZone(d, timezone, "yyyy-MM-dd");
    const existing = groups.find((g) => g.dateKey === key);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({ date: d, dateKey: key, events: [event], timezone });
    }
  }
  return groups;
}

function rsvpBadgeStyle(status: string) {
  if (status === "approved") {
    return "bg-primary/10 text-primary border-primary/20";
  }
  if (status === "waitlisted") {
    return "bg-muted text-muted-foreground";
  }
  return "bg-muted text-muted-foreground"; // pending, rejected
}

function rsvpLabel(status: string) {
  if (status === "approved") {
    return "Approved";
  }
  if (status === "waitlisted") {
    return "Waitlisted";
  }
  if (status === "pending") {
    return "Pending";
  }
  if (status === "rejected") {
    return "Declined";
  }
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
        <h3 className="mt-4 font-semibold text-base">{emptyTitle}</h3>
        <p className="mt-1 text-muted-foreground text-sm">{emptyDescription}</p>
        {emptyAction}
      </div>
    );
  }

  const groups = groupByDate(events);

  return (
    <div className="space-y-0">
      {groups.map((group) => (
        <div className="flex gap-6" key={group.dateKey}>
          {/* Date label */}
          <div className="w-20 flex-shrink-0 pt-4 text-right">
            <p className="font-semibold text-sm leading-tight">
              {formatInTimeZone(group.date, group.timezone, "d MMM")}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatInTimeZone(group.date, group.timezone, "EEEE")}
            </p>
          </div>

          {/* Timeline line + dot */}
          <div className="flex flex-shrink-0 flex-col items-center">
            <div className="mt-5 h-2 w-2 rounded-full bg-muted-foreground/50" />
            <div className="mt-1 w-px flex-1 bg-border" />
          </div>

          {/* Events for this date */}
          <div className="flex-1 space-y-2 pt-3 pb-6">
            {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: per-event render callback conditionally formats time, location, and status badges; the branches are flat presentational guards */}
            {group.events.map((event) => {
              const startTime =
                typeof event.startTime === "string"
                  ? new Date(event.startTime)
                  : event.startTime;
              const eventTimezone = event.timezone ?? "UTC";
              const eventHref =
                href?.(event) ??
                (event.slug ? `/e/${event.slug}` : `/events/${event.id}`);
              const isVirtual = event.type === "virtual";
              const hostInitial =
                event.host?.name?.charAt(0).toUpperCase() ?? "?";

              return (
                <Link className="block" href={eventHref} key={event.id}>
                  <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50">
                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-muted-foreground text-xs">
                        {formatInTimeZone(startTime, eventTimezone, "h:mm a")}
                      </p>
                      <p className="truncate font-semibold text-sm leading-snug">
                        {event.title}
                      </p>

                      {event.host?.name ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage
                              alt={event.host.name}
                              src={event.host.image ?? undefined}
                            />
                            <AvatarFallback className="text-[8px]">
                              {hostInitial}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground text-xs">
                            By {event.host.name}
                          </span>
                        </div>
                      ) : null}

                      {event.location || isVirtual ? (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          {isVirtual ? (
                            <Video className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {isVirtual
                              ? (event.location ?? "Online")
                              : event.location}
                          </span>
                        </div>
                      ) : null}

                      {event.rsvpStatus ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[10px] ${rsvpBadgeStyle(event.rsvpStatus)}`}
                        >
                          {rsvpLabel(event.rsvpStatus)}
                        </span>
                      ) : null}
                    </div>

                    {/* Cover image / placeholder */}
                    <div className="flex-shrink-0">
                      {event.coverImage ? (
                        <img
                          alt={event.title}
                          className="h-14 w-14 rounded-lg object-cover"
                          height={56}
                          src={event.coverImage}
                          width={56}
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-muted">
                          <span className="font-bold text-lg text-muted-foreground leading-none">
                            {formatInTimeZone(startTime, eventTimezone, "d")}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {formatInTimeZone(startTime, eventTimezone, "MMM")}
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
