import { formatInTimeZone } from "date-fns-tz";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  Crown,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  ScanLine,
  Share2,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendeeList } from "@/components/events/attendee-list";
import { CalendarExportButton } from "@/components/events/calendar-export-button";
import { CloneEventButton } from "@/components/events/clone-event-button";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { EventAnalytics } from "@/components/events/event-analytics";
import { EventEditDrawer } from "@/components/events/event-edit-drawer";
import { EventTabsNav } from "@/components/events/event-tabs-nav";
import { InviteForm } from "@/components/events/invite-form";
import { QuestionBuilder } from "@/components/events/question-builder";
import { RichTextRenderer } from "@/components/events/rich-text-renderer";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAppUrl } from "@/lib/app-url";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  attendeeCheckins,
  eventCohosts,
  eventPageviews,
  eventQuestions,
  events,
  invitations,
  rsvps,
} from "@/lib/db/schema";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: top-level page component orchestrating auth/host/cohost access checks and many conditional sections; complexity is inherent to server-rendering the full page
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const [{ eventId }, { tab = "overview", dateFrom, dateTo }, session] =
    await Promise.all([params, searchParams, getSession(await headers())]);

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      category: true,
      cohosts: {
        with: {
          user: { columns: { email: true, id: true, image: true, name: true } },
        },
      },
      host: { columns: { id: true, image: true, name: true } },
      rsvps: {
        with: {
          user: {
            columns: { email: true, id: true, image: true, name: true },
          },
        },
      },
      tags: true,
    },
  });

  if (!event) {
    notFound();
  }

  const userId = session?.user?.id;
  const isHost = event.hostId === userId;
  const isCohost = event.cohosts.some((c) => c.userId === userId);
  const canManage = isHost || isCohost;

  if (event.visibility === "private" && !canManage) {
    notFound();
  }

  const userRsvp = userId
    ? event.rsvps.find((r) => r.user.id === userId)
    : null;
  const hasTicket = userRsvp?.status === "approved";

  const approvedRsvps = event.rsvps.filter((r) => r.status === "approved");
  const pendingCount = event.rsvps.filter((r) => r.status === "pending").length;
  const approvedCount = approvedRsvps.length;
  const startTime = new Date(event.startTime);
  const endTime = event.endTime ? new Date(event.endTime) : null;

  // Serialized event for client components
  const serializedEvent = {
    capacity: event.capacity,
    categoryId: event.categoryId,
    coverImage: event.coverImage,
    description: event.description,
    endTime:
      event.endTime && Number.isFinite(event.endTime.getTime())
        ? event.endTime.toISOString()
        : null,
    id: event.id,
    location: event.location,
    locationDetails: event.locationDetails,
    requiresApproval: event.requiresApproval,
    richDescription: event.richDescription,
    slug: event.slug,
    startTime: Number.isFinite(event.startTime.getTime())
      ? event.startTime.toISOString()
      : new Date().toISOString(),
    timezone: event.timezone,
    title: event.title,
    type: event.type,
    visibility: event.visibility,
  };

  // --- Tab-specific data fetching ---
  let attendeesData: {
    attendees: Array<{
      id: string;
      eventId: string;
      userId: string;
      status: "pending" | "approved" | "rejected" | "waitlisted";
      message: string | null;
      customAnswers: Record<string, string | boolean> | null;
      createdAt: string;
      timeline: Array<{
        id: string;
        type: string;
        fromStatus: string | null;
        toStatus: string | null;
        changedByName: string | null;
        createdAt: string;
      }>;
      user: { id: string; name: string; email: string; image: string | null };
    }>;
    eventInvitations: Array<{
      id: string;
      email: string;
      role: "attendee" | "cohost";
      status: "pending" | "accepted" | "declined" | "expired";
      createdAt: string;
      expiresAt: string | null;
    }>;
    cohostsList: Array<{
      id: string;
      userId: string;
      user: { id: string; name: string; email: string; image: string | null };
    }>;
    questions: Array<{ id: string; label: string; type: string }>;
  } | null = null;

  let analyticsData: {
    funnel: {
      totalViews: number;
      uniqueViews: number;
      totalRsvps: number;
      approved: number;
      checkedIn: number;
    };
    viewsByDay: { date: string; views: number }[];
    referrers: { name: string; count: number }[];
    dateFrom: string;
    dateTo: string;
  } | null = null;

  if (tab === "guests" && canManage) {
    const [attendees, eventInvitations, cohostsList, questionsList] =
      await Promise.all([
        db.query.rsvps.findMany({
          orderBy: (rsvpRows, { desc }) => [desc(rsvpRows.createdAt)],
          where: eq(rsvps.eventId, eventId),
          with: {
            timeline: { orderBy: (t, { desc }) => [desc(t.createdAt)] },
            user: {
              columns: { email: true, id: true, image: true, name: true },
            },
          },
        }),
        db.query.invitations.findMany({
          orderBy: (invitationRows, { desc }) => [
            desc(invitationRows.createdAt),
          ],
          where: eq(invitations.eventId, eventId),
        }),
        db.query.eventCohosts.findMany({
          where: eq(eventCohosts.eventId, eventId),
          with: {
            user: {
              columns: { email: true, id: true, image: true, name: true },
            },
          },
        }),
        db.query.eventQuestions.findMany({
          columns: { id: true, label: true, type: true },
          orderBy: (q, { asc }) => [asc(q.order)],
          where: eq(eventQuestions.eventId, eventId),
        }),
      ]);

    attendeesData = {
      attendees: attendees.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        customAnswers:
          (a.customAnswers as Record<string, string | boolean> | null) ?? null,
        timeline: a.timeline.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        })),
        user: { ...a.user, name: a.user.name ?? "Unknown" },
      })),
      cohostsList: cohostsList.map((c) => ({
        id: c.id,
        user: { ...c.user, name: c.user.name ?? "Unknown" },
        userId: c.userId,
      })),
      eventInvitations: eventInvitations.map((inv) => ({
        createdAt: inv.createdAt.toISOString(),
        email: inv.email,
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        id: inv.id,
        role: inv.role,
        status: inv.status,
      })),
      questions: questionsList,
    };
  }

  if (tab === "insights" && canManage) {
    const resolvedFrom = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const resolvedTo = dateTo ? new Date(dateTo) : new Date();

    const [eventRsvps, checkins, views] = await Promise.all([
      db.query.rsvps.findMany({
        columns: { createdAt: true, status: true },
        where: eq(rsvps.eventId, eventId),
      }),
      db.query.attendeeCheckins.findMany({
        columns: { checkedInAt: true },
        where: eq(attendeeCheckins.eventId, eventId),
      }),
      db.query.eventPageviews.findMany({
        columns: { createdAt: true, ipHash: true, referrer: true },
        where: and(
          eq(eventPageviews.eventId, eventId),
          gte(eventPageviews.createdAt, resolvedFrom),
          lte(eventPageviews.createdAt, resolvedTo)
        ),
      }),
    ]);

    // Funnel counts
    const approved = eventRsvps.filter((r) => r.status === "approved").length;
    const totalRsvps = eventRsvps.length;
    const checkedIn = checkins.length;
    const totalViews = views.length;
    const uniqueViews = new Set(views.map((v) => v.ipHash)).size;

    // Views by day — fill every day in range with 0 if no data
    const dayMap = new Map<string, number>();
    const cursor = new Date(resolvedFrom);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(resolvedTo);
    end.setHours(23, 59, 59, 999);
    while (cursor <= end) {
      dayMap.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const v of views) {
      const day = new Date(v.createdAt).toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const viewsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      }),
      views: count,
    }));

    // Top 5 referrers
    const refMap = new Map<string, number>();
    for (const v of views) {
      const ref = v.referrer ?? "direct";
      refMap.set(ref, (refMap.get(ref) ?? 0) + 1);
    }
    const referrers = Array.from(refMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ count, name }));

    analyticsData = {
      dateFrom: resolvedFrom.toISOString(),
      dateTo: resolvedTo.toISOString(),
      funnel: { approved, checkedIn, totalRsvps, totalViews, uniqueViews },
      referrers,
      viewsByDay,
    };
  }

  const publicEventUrl = `/e/${event.slug}`;
  const shareUrl = `${getAppUrl()}/e/${event.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-muted-foreground text-sm">
            <Link
              className="transition-colors hover:text-foreground"
              href="/dashboard/events"
            >
              Events
            </Link>
            <span>/</span>
            <span className="text-foreground">{event.title}</span>
          </div>
          <h1 className="font-bold text-2xl tracking-tight">{event.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <Button asChild size="sm" variant="outline">
              <Link href={publicEventUrl}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Event Page
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <EventTabsNav activeTab={tab} canManage={canManage} eventId={eventId} />

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab
          approvedCount={approvedCount}
          approvedRsvps={approvedRsvps}
          canManage={canManage}
          endTime={endTime}
          event={event}
          eventId={eventId}
          hasTicket={hasTicket}
          isHost={isHost}
          pendingCount={pendingCount}
          serializedEvent={serializedEvent}
          shareUrl={shareUrl}
          startTime={startTime}
        />
      )}

      {tab === "guests" && canManage && attendeesData && (
        <div className="space-y-6">
          <InviteForm eventId={eventId} />
          <AttendeeList
            attendees={attendeesData.attendees}
            cohosts={attendeesData.cohostsList}
            eventId={eventId}
            invitations={attendeesData.eventInvitations}
            isHost={isHost}
            questions={attendeesData.questions}
          />
        </div>
      )}

      {tab === "questions" && canManage && (
        <div className="max-w-xl space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Registration Questions</h2>
            <p className="text-muted-foreground text-sm">
              Attendees will answer these when they RSVP. Answers appear in the
              Guests tab and CSV export.
            </p>
          </div>
          <QuestionBuilder eventId={eventId} />
        </div>
      )}

      {tab === "insights" && canManage && analyticsData && (
        <EventAnalytics {...analyticsData} eventId={eventId} />
      )}

      {tab === "more" && canManage && (
        <div className="max-w-md space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href={`/dashboard/events/${eventId}/check-in`}>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan Tickets
                </Link>
              </Button>
              <CalendarExportButton
                event={{
                  description: event.description,
                  endTime: event.endTime?.toISOString() ?? null,
                  id: event.id,
                  location: event.location,
                  slug: event.slug,
                  startTime: event.startTime.toISOString(),
                  title: event.title,
                }}
              />
              {hasTicket && (
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href={`/ticket/${eventId}`}>
                    <Ticket className="mr-2 h-4 w-4" />
                    View My Ticket
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visibility & Discovery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {event.visibility === "public" ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm capitalize">{event.visibility}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.type.replace("_", " ")}</Badge>
                {event.requiresApproval ? (
                  <Badge variant="outline">Approval Required</Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {isHost ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <DeleteEventButton eventId={eventId} eventTitle={event.title} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

// --- Overview Tab (extracted for readability) ---

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: presentational tab rendering many optional event fields as conditional blocks; the branches are flat JSX guards, not deep logic
function OverviewTab({
  event,
  serializedEvent,
  startTime,
  endTime,
  approvedRsvps,
  approvedCount,
  pendingCount,
  canManage,
  isHost,
  hasTicket,
  eventId,
  shareUrl,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    type: "in_person" | "virtual" | "hybrid";
    visibility: "public" | "private";
    requiresApproval: boolean;
    timezone: string;
    location: string | null;
    locationDetails: string | null;
    capacity: number | null;
    tags: Array<{ id: string; tag: string }>;
    host: { id: string; name: string | null; image: string | null };
    cohosts: Array<{
      user: { id: string; name: string | null; image: string | null };
    }>;
    richDescription: string | null;
    rsvps: Array<{
      id: string;
      status: string;
      user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
      };
    }>;
  };
  serializedEvent: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    startTime: string;
    endTime: string | null;
    timezone: string;
    location: string | null;
    locationDetails: string | null;
    type: "in_person" | "virtual" | "hybrid";
    visibility: "public" | "private";
    capacity: number | null;
    requiresApproval: boolean;
    categoryId: string | null;
  };
  startTime: Date;
  endTime: Date | null;
  approvedRsvps: Array<{
    id: string;
    user: { id: string; name: string | null; image: string | null };
  }>;
  approvedCount: number;
  pendingCount: number;
  canManage: boolean;
  isHost: boolean;
  hasTicket: boolean;
  eventId: string;
  shareUrl: string;
}) {
  return (
    <div className="space-y-6">
      {/* Action buttons row */}
      {canManage ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/events/${eventId}?tab=guests`}>
              <Users className="mr-2 h-4 w-4" />
              Invite Guests
            </Link>
          </Button>
          <EventEditDrawer event={serializedEvent} />
          {isHost ? <CloneEventButton eventId={eventId} /> : null}
          {isHost ? (
            <DeleteEventButton eventId={eventId} eventTitle={event.title} />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-3">
          {/* Cover image */}
          {event.coverImage ? (
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                alt={event.title}
                className="object-cover"
                fill
                src={event.coverImage}
              />
            </div>
          ) : null}

          {/* Event info card */}
          <Card>
            <CardContent className="space-y-4 p-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    event.visibility === "public" ? "default" : "secondary"
                  }
                >
                  {event.visibility === "public" ? (
                    <Globe className="mr-1 h-3 w-3" />
                  ) : (
                    <Lock className="mr-1 h-3 w-3" />
                  )}
                  {event.visibility}
                </Badge>
                <Badge variant="outline">{event.type.replace("_", " ")}</Badge>
                {event.requiresApproval ? (
                  <Badge variant="outline">Approval Required</Badge>
                ) : null}
              </div>

              {/* Host info */}
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  {event.host.image ? (
                    <AvatarImage
                      alt={event.host.name ?? ""}
                      src={event.host.image}
                    />
                  ) : null}
                  <AvatarFallback>
                    {event.host.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-muted-foreground text-xs">Hosted by</p>
                  <p className="font-medium text-sm">{event.host.name}</p>
                </div>
              </div>

              {/* Description */}
              {event.richDescription || event.description ? (
                <>
                  <Separator />
                  {event.richDescription ? (
                    <RichTextRenderer content={event.richDescription} />
                  ) : (
                    <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                      {event.description}
                    </p>
                  )}
                </>
              ) : null}

              {/* Tags */}
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendees preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Attendees ({approvedCount})
                  {canManage && pendingCount > 0 && (
                    <span className="ml-2 font-normal text-muted-foreground text-sm">
                      {pendingCount} pending
                    </span>
                  )}
                </span>
                {canManage ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/events/${eventId}?tab=guests`}>
                      View All
                    </Link>
                  </Button>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedRsvps.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No one has joined yet.
                </p>
              ) : (
                <AvatarGroup>
                  {approvedRsvps.slice(0, 8).map((rsvp) => (
                    <Avatar key={rsvp.id} size="sm">
                      {rsvp.user.image ? (
                        <AvatarImage
                          alt={rsvp.user.name ?? ""}
                          src={rsvp.user.image}
                        />
                      ) : null}
                      <AvatarFallback>
                        {rsvp.user.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {approvedCount > 8 && (
                    <AvatarGroupCount>+{approvedCount - 8}</AvatarGroupCount>
                  )}
                </AvatarGroup>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* When & Where */}
          <Card>
            <CardHeader>
              <CardTitle>When & Where</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-muted text-xs">
                  <span className="font-semibold text-primary uppercase">
                    {formatInTimeZone(startTime, event.timezone, "MMM")}
                  </span>
                  <span className="font-bold text-lg leading-none">
                    {formatInTimeZone(startTime, event.timezone, "d")}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {formatInTimeZone(
                      startTime,
                      event.timezone,
                      "EEEE, MMMM d"
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatInTimeZone(startTime, event.timezone, "h:mm a")}
                    {endTime
                      ? ` - ${formatInTimeZone(endTime, event.timezone, "h:mm a")}`
                      : ""}{" "}
                    {event.timezone}
                  </p>
                </div>
              </div>

              <Separator />

              {event.location ? (
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {event.type === "virtual" ? (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    {event.type === "virtual" ? (
                      <>
                        <p className="font-medium">Virtual Event</p>
                        {canManage || hasTicket ? (
                          <a
                            className="text-primary text-sm hover:underline"
                            href={event.location}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Join Link
                          </a>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            Register to See Link
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{event.location}</p>
                        {event.locationDetails ? (
                          <p className="text-muted-foreground text-sm">
                            {event.locationDetails}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <MapPin className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-600">
                      Location Missing
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Please enter the location before it starts.
                    </p>
                  </div>
                </div>
              )}

              {event.capacity !== null && event.capacity > 0 ? (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {approvedCount} / {event.capacity}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Spots filled
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Share */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-medium text-sm">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                Share Event
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CopyLinkButton url={shareUrl} variant="pill" />
            </CardContent>
          </Card>

          {/* Hosts */}
          <Card>
            <CardHeader>
              <CardTitle>Hosts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  {event.host.image ? (
                    <AvatarImage
                      alt={event.host.name ?? ""}
                      src={event.host.image}
                    />
                  ) : null}
                  <AvatarFallback>
                    {event.host.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.host.name}</p>
                  <p className="text-muted-foreground text-xs">Host</p>
                </div>
                <Badge variant="outline">
                  <Crown className="mr-1 h-3 w-3" />
                  Creator
                </Badge>
              </div>
              {event.cohosts.map((cohost) => (
                <div className="flex items-center gap-3" key={cohost.user.id}>
                  <Avatar>
                    {cohost.user.image ? (
                      <AvatarImage
                        alt={cohost.user.name ?? ""}
                        src={cohost.user.image}
                      />
                    ) : null}
                    <AvatarFallback>
                      {cohost.user.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{cohost.user.name}</p>
                  </div>
                  <Badge variant="outline">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Co-host
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions */}
          {canManage ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href={`/dashboard/events/${eventId}/check-in`}>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan Tickets
                  </Link>
                </Button>
                {hasTicket ? (
                  <Button asChild className="w-full justify-start">
                    <Link href={`/ticket/${eventId}`}>
                      <Ticket className="mr-2 h-4 w-4" />
                      View My Ticket
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
