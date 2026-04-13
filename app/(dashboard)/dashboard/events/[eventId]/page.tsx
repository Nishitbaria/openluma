import { format } from "date-fns";
import { eq } from "drizzle-orm";
import {
  Calendar,
  Crown,
  Edit,
  Globe,
  Lock,
  MapPin,
  ScanLine,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      host: { columns: { id: true, name: true, image: true } },
      category: true,
      tags: true,
      rsvps: {
        with: {
          user: { columns: { id: true, name: true, email: true, image: true } },
        },
      },
      cohosts: {
        with: {
          user: { columns: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const userId = session?.user?.id;
  const isHost = event.hostId === userId;
  const isCohost = event.cohosts.some((c) => c.userId === userId);
  const canManage = isHost || isCohost;

  // Block access to private events for non-host/cohost users
  if (event.visibility === "private" && !canManage) {
    notFound();
  }

  // Check if current user has an approved RSVP (for ticket link)
  const userRsvp = userId
    ? event.rsvps.find((r) => r.user.id === userId)
    : null;
  const hasTicket = userRsvp?.status === "approved";

  const approvedRsvps = event.rsvps.filter((r) => r.status === "approved");
  const pendingCount = event.rsvps.filter((r) => r.status === "pending").length;
  const waitlistedCount = event.rsvps.filter(
    (r) => r.status === "waitlisted",
  ).length;
  const approvedCount = approvedRsvps.length;
  const startTime = new Date(event.startTime);
  const endTime = event.endTime ? new Date(event.endTime) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={event.visibility === "public" ? "default" : "secondary"}
            >
              {event.visibility === "public" ? (
                <Globe className="mr-1 h-3 w-3" />
              ) : (
                <Lock className="mr-1 h-3 w-3" />
              )}
              {event.visibility}
            </Badge>
            <Badge variant="outline">{event.type.replace("_", " ")}</Badge>
            {event.requiresApproval && (
              <Badge variant="outline">Approval Required</Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-muted-foreground mt-1">
            Hosted by {event.host.name}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/events/${eventId}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            {isHost && (
              <DeleteEventButton eventId={eventId} eventTitle={event.title} />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {event.coverImage && (
            <div className="aspect-video overflow-hidden rounded-lg">
              <img
                src={event.coverImage}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {format(startTime, "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(startTime, "h:mm a")}
                    {endTime && ` - ${format(endTime, "h:mm a")}`} (
                    {event.timezone})
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
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

              {event.capacity && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium">
                    {approvedCount} / {event.capacity} spots filled
                  </p>
                </div>
              )}

              {event.description && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                </>
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {canManage ? "Attendees" : "Who's Going"}
                {canManage && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/events/${eventId}/attendees`}>
                      View All
                    </Link>
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {canManage
                  ? `${approvedCount} approved, ${pendingCount} pending`
                  : `${approvedCount} attending${waitlistedCount > 0 ? `, ${waitlistedCount} waitlisted` : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canManage ? (
                /* Host/Cohost view: all RSVPs with emails and statuses */
                event.rsvps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No RSVPs yet.</p>
                ) : (
                  <div className="space-y-3">
                    {event.rsvps.slice(0, 5).map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {rsvp.user.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {rsvp.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rsvp.user.email}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            rsvp.status === "approved"
                              ? "default"
                              : rsvp.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {rsvp.status}
                        </Badge>
                      </div>
                    ))}
                    {event.rsvps.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{event.rsvps.length - 5} more
                      </p>
                    )}
                  </div>
                )
              ) : /* Attendee view: only approved names, no emails */
              approvedRsvps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No one has joined yet. Be the first!
                </p>
              ) : (
                <div className="space-y-3">
                  {approvedRsvps.slice(0, 5).map((rsvp) => (
                    <div key={rsvp.id} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {rsvp.user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <p className="text-sm font-medium">{rsvp.user.name}</p>
                    </div>
                  ))}
                  {approvedRsvps.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{approvedRsvps.length - 5} more attending
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {event.cohosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Co-hosts ({event.cohosts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.cohosts.map((cohost) => (
                    <div
                      key={cohost.user.id}
                      className="flex items-center gap-2"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {cohost.user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {cohost.user.name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Co-host
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManage && (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link href={`/dashboard/events/${eventId}/attendees`}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Attendees
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link href={`/dashboard/events/${eventId}/check-in`}>
                      <ScanLine className="mr-2 h-4 w-4" />
                      Scan Tickets
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link href={`/dashboard/events/${eventId}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Event
                    </Link>
                  </Button>
                </>
              )}
              {hasTicket && (
                <Button
                  asChild
                  variant="default"
                  className="w-full justify-start"
                >
                  <Link href={`/ticket/${eventId}`}>
                    <Ticket className="mr-2 h-4 w-4" />
                    View My Ticket
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
