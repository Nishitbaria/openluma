import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { Calendar, Clock, Globe, Lock, MapPin, Users } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarExportButton } from "@/components/events/calendar-export-button";
import { RsvpButton } from "@/components/events/rsvp-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, rsvps } from "@/lib/db/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { title: true, description: true, visibility: true },
  });
  if (!event) return { title: "Event Not Found" };
  if (event.visibility === "private") {
    return {
      title: "Private Event - OpenLuma",
      description: "This event is invite-only.",
    };
  }
  return {
    title: `${event.title} - OpenLuma`,
    description: event.description ?? `Join ${event.title} on OpenLuma`,
  };
}

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      host: { columns: { id: true, name: true, image: true } },
      category: true,
      tags: true,
      rsvps: { columns: { id: true, status: true } },
    },
  });

  if (!event) notFound();

  // Check current user's session and RSVP status (needed before private gate)
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  let currentRsvpStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "waitlisted"
    | null = null;

  if (session?.user) {
    const userRsvp = await db.query.rsvps.findFirst({
      where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)),
      columns: { status: true },
    });
    currentRsvpStatus = userRsvp?.status ?? null;
  }

  if (event.visibility === "private") {
    const isHost = session?.user?.id === event.host.id;
    const hasApprovedRsvp = currentRsvpStatus === "approved";

    if (!isHost && !hasApprovedRsvp) {
      return (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Private Event</h1>
          <p className="mt-2 text-muted-foreground">
            This event is invite-only. You need an invitation to view it.
          </p>
        </div>
      );
    }
  }

  const approvedCount = event.rsvps.filter(
    (r) => r.status === "approved",
  ).length;
  const startTime = new Date(event.startTime);
  const endTime = event.endTime ? new Date(event.endTime) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      {event.coverImage && (
        <div className="aspect-video overflow-hidden rounded-xl mb-8">
          <img
            src={event.coverImage}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant={event.visibility === "public" ? "default" : "secondary"}
        >
          {event.visibility === "public" ? (
            <Globe className="mr-1 h-3 w-3" />
          ) : (
            <Lock className="mr-1 h-3 w-3" />
          )}
          {event.visibility === "public" ? "Public" : "Private"}
        </Badge>
        <Badge variant="outline">{event.type.replace("_", " ")}</Badge>
        {event.category && (
          <Badge variant="outline">{event.category.name}</Badge>
        )}
      </div>

      <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
      <p className="text-muted-foreground mt-2">Hosted by {event.host.name}</p>

      <div className="grid gap-8 md:grid-cols-3 mt-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {format(startTime, "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(startTime, "h:mm a")}
                    {endTime && ` - ${format(endTime, "h:mm a")}`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                    {event.locationDetails && (
                      <p className="text-sm text-muted-foreground">
                        {event.locationDetails}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <p className="font-medium">
                  {approvedCount} attending
                  {event.capacity && ` / ${event.capacity} spots`}
                </p>
              </div>
            </CardContent>
          </Card>

          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {event.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {event.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {session?.user?.id === event.host.id ? (
                <p className="text-sm text-center text-muted-foreground">
                  You are the host of this event
                </p>
              ) : (
                <RsvpButton
                  eventId={eventId}
                  requiresApproval={event.requiresApproval}
                  currentRsvpStatus={currentRsvpStatus}
                />
              )}
              <CalendarExportButton
                event={{
                  title: event.title,
                  description: event.description,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  location: event.location,
                  id: event.id,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
