import { format } from "date-fns";
import { eq } from "drizzle-orm";
import {
  CheckCircle,
  Clock,
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
  XCircle,
} from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendeeList } from "@/components/events/attendee-list";
import { CalendarExportButton } from "@/components/events/calendar-export-button";
import { CloneEventButton } from "@/components/events/clone-event-button";
import { QuestionBuilder } from "@/components/events/question-builder";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { EventEditDrawer } from "@/components/events/event-edit-drawer";
import { EventTabsNav } from "@/components/events/event-tabs-nav";
import { RichTextRenderer } from "@/components/events/rich-text-renderer";
import { InviteForm } from "@/components/events/invite-form";
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
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  attendeeCheckins,
  eventCohosts,
  eventQuestions,
  events,
  invitations,
  rsvps,
} from "@/lib/db/schema";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ eventId }, { tab = "overview" }, session] = await Promise.all([
    params,
    searchParams,
    getSession(await headers()),
  ]);

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      host: { columns: { id: true, name: true, image: true } },
      category: true,
      tags: true,
      rsvps: {
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      },
      cohosts: {
        with: {
          user: { columns: { id: true, name: true, image: true, email: true } },
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
    id: event.id,
    title: event.title,
    description: event.description,
    coverImage: event.coverImage,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime?.toISOString() ?? null,
    timezone: event.timezone,
    location: event.location,
    locationDetails: event.locationDetails,
    type: event.type,
    visibility: event.visibility,
    capacity: event.capacity,
    requiresApproval: event.requiresApproval,
    categoryId: event.categoryId,
    slug: event.slug,
    richDescription: event.richDescription,
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
    questions: Array<{ id: string; label: string }>;
  } | null = null;

  let analyticsData: {
    stats: Array<{ title: string; value: string | number; icon: typeof Users }>;
  } | null = null;

  if (tab === "guests" && canManage) {
    const [attendees, eventInvitations, cohostsList, questionsList] = await Promise.all([
      db.query.rsvps.findMany({
        where: eq(rsvps.eventId, eventId),
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: (rsvps, { desc }) => [desc(rsvps.createdAt)],
      }),
      db.query.invitations.findMany({
        where: eq(invitations.eventId, eventId),
        orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
      }),
      db.query.eventCohosts.findMany({
        where: eq(eventCohosts.eventId, eventId),
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      }),
      db.query.eventQuestions.findMany({
        where: eq(eventQuestions.eventId, eventId),
        orderBy: (q, { asc }) => [asc(q.order)],
        columns: { id: true, label: true },
      }),
    ]);

    attendeesData = {
      attendees: attendees.map((a) => ({
        ...a,
        customAnswers: (a.customAnswers as Record<string, string | boolean> | null) ?? null,
        createdAt: a.createdAt.toISOString(),
        user: { ...a.user, name: a.user.name ?? "Unknown" },
      })),
      eventInvitations: eventInvitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt?.toISOString() ?? null,
      })),
      cohostsList: cohostsList.map((c) => ({
        id: c.id,
        userId: c.userId,
        user: { ...c.user, name: c.user.name ?? "Unknown" },
      })),
      questions: questionsList,
    };
  }

  if (tab === "insights" && canManage) {
    const [eventRsvps, checkins] = await Promise.all([
      db.query.rsvps.findMany({
        where: eq(rsvps.eventId, eventId),
      }),
      db.query.attendeeCheckins.findMany({
        where: eq(attendeeCheckins.eventId, eventId),
      }),
    ]);

    const counts = { approved: 0, pending: 0, rejected: 0 };
    for (const r of eventRsvps) {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    }
    const { approved, pending, rejected } = counts;
    const checkedIn = checkins.length;
    const checkInRate =
      approved > 0 ? Math.round((checkedIn / approved) * 100) : 0;

    analyticsData = {
      stats: [
        { title: "Total RSVPs", value: eventRsvps.length, icon: Users },
        { title: "Approved", value: approved, icon: CheckCircle },
        { title: "Pending", value: pending, icon: Clock },
        { title: "Rejected", value: rejected, icon: XCircle },
        { title: "Checked In", value: checkedIn, icon: CheckCircle },
        { title: "Check-in Rate", value: `${checkInRate}%`, icon: Users },
      ],
    };
  }

  const publicEventUrl = `/e/${event.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
            <Link
              href="/dashboard/events"
              className="hover:text-foreground transition-colors"
            >
              Events
            </Link>
            <span>/</span>
            <span className="text-foreground">{event.title}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button asChild variant="outline" size="sm">
              <Link href={publicEventUrl}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Event Page
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <EventTabsNav eventId={eventId} canManage={canManage} activeTab={tab} />

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab
          event={event}
          serializedEvent={serializedEvent}
          startTime={startTime}
          endTime={endTime}
          approvedRsvps={approvedRsvps}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
          canManage={canManage}
          isHost={isHost}
          hasTicket={hasTicket}
          eventId={eventId}
          publicEventUrl={publicEventUrl}
        />
      )}

      {tab === "guests" && canManage && attendeesData && (
        <div className="space-y-6">
          <InviteForm eventId={eventId} />
          <AttendeeList
            attendees={attendeesData.attendees}
            cohosts={attendeesData.cohostsList}
            invitations={attendeesData.eventInvitations}
            questions={attendeesData.questions}
            eventId={eventId}
            isHost={isHost}
          />
        </div>
      )}

      {tab === "questions" && canManage && (
        <div className="max-w-xl space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Registration Questions</h2>
            <p className="text-sm text-muted-foreground">
              Attendees will answer these when they RSVP. Answers appear in the Guests tab and CSV export.
            </p>
          </div>
          <QuestionBuilder eventId={eventId} />
        </div>
      )}

      {tab === "insights" && canManage && analyticsData && (
        <div className="grid gap-4 md:grid-cols-3">
          {analyticsData.stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                variant="outline"
                className="w-full justify-start"
              >
                <Link href={`/dashboard/events/${eventId}/check-in`}>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan Tickets
                </Link>
              </Button>
              <CalendarExportButton
                event={{
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  description: event.description,
                  startTime: event.startTime.toISOString(),
                  endTime: event.endTime?.toISOString() ?? null,
                  location: event.location,
                }}
              />
              {hasTicket && (
                <Button
                  asChild
                  variant="outline"
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
                {event.requiresApproval && (
                  <Badge variant="outline">Approval Required</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {isHost && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <DeleteEventButton eventId={eventId} eventTitle={event.title} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// --- Overview Tab (extracted for readability) ---

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
  publicEventUrl,
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
  publicEventUrl: string;
}) {
  return (
    <div className="space-y-6">
      {/* Action buttons row */}
      {canManage && (
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/dashboard/events/${eventId}?tab=guests`}>
              <Users className="mr-2 h-4 w-4" />
              Invite Guests
            </Link>
          </Button>
          <EventEditDrawer event={serializedEvent} />
          {isHost && <CloneEventButton eventId={eventId} />}
          {isHost && (
            <DeleteEventButton eventId={eventId} eventTitle={event.title} />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Cover image */}
          {event.coverImage && (
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src={event.coverImage}
                alt={event.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Event info card */}
          <Card>
            <CardContent className="p-6 space-y-4">
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
                {event.requiresApproval && (
                  <Badge variant="outline">Approval Required</Badge>
                )}
              </div>

              {/* Host info */}
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  {event.host.image && (
                    <AvatarImage
                      src={event.host.image}
                      alt={event.host.name ?? ""}
                    />
                  )}
                  <AvatarFallback>
                    {event.host.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Hosted by</p>
                  <p className="text-sm font-medium">{event.host.name}</p>
                </div>
              </div>

              {/* Description */}
              {(event.richDescription || event.description) && (
                <>
                  <Separator />
                  {event.richDescription ? (
                    <RichTextRenderer content={event.richDescription} />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}
                </>
              )}

              {/* Tags */}
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

          {/* Attendees preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Attendees ({approvedCount})
                  {canManage && pendingCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {pendingCount} pending
                    </span>
                  )}
                </span>
                {canManage && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/events/${eventId}?tab=guests`}>
                      View All
                    </Link>
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedRsvps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No one has joined yet.
                </p>
              ) : (
                <AvatarGroup>
                  {approvedRsvps.slice(0, 8).map((rsvp) => (
                    <Avatar key={rsvp.id} size="sm">
                      {rsvp.user.image && (
                        <AvatarImage
                          src={rsvp.user.image}
                          alt={rsvp.user.name ?? ""}
                        />
                      )}
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
        <div className="lg:col-span-2 space-y-6">
          {/* When & Where */}
          <Card>
            <CardHeader>
              <CardTitle>When & Where</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-muted text-xs">
                  <span className="font-semibold uppercase text-primary">
                    {format(startTime, "MMM")}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {format(startTime, "d")}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {format(startTime, "EEEE, MMMM d")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(startTime, "h:mm a")}
                    {endTime && ` - ${format(endTime, "h:mm a")}`}{" "}
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
                            href={event.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Join Link
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Register to See Link
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{event.location}</p>
                        {event.locationDetails && (
                          <p className="text-sm text-muted-foreground">
                            {event.locationDetails}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <MapPin className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-600">
                      Location Missing
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please enter the location before it starts.
                    </p>
                  </div>
                </div>
              )}

              {event.capacity != null && event.capacity > 0 ? (
                <>
                  <Separator />
                  <div className="flex gap-3 items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {approvedCount} / {event.capacity}
                      </p>
                      <p className="text-sm text-muted-foreground">
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
            <CardContent className="flex items-center gap-3 p-4">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">Share Event</span>
              <CopyLinkButton url={publicEventUrl} />
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
                  {event.host.image && (
                    <AvatarImage
                      src={event.host.image}
                      alt={event.host.name ?? ""}
                    />
                  )}
                  <AvatarFallback>
                    {event.host.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.host.name}</p>
                  <p className="text-xs text-muted-foreground">Host</p>
                </div>
                <Badge variant="outline">
                  <Crown className="mr-1 h-3 w-3" />
                  Creator
                </Badge>
              </div>
              {event.cohosts.map((cohost) => (
                <div key={cohost.user.id} className="flex items-center gap-3">
                  <Avatar>
                    {cohost.user.image && (
                      <AvatarImage
                        src={cohost.user.image}
                        alt={cohost.user.name ?? ""}
                      />
                    )}
                    <AvatarFallback>
                      {cohost.user.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cohost.user.name}</p>
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
          {canManage && (
            <Card>
              <CardContent className="p-4 space-y-2">
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
                {hasTicket && (
                  <Button asChild className="w-full justify-start">
                    <Link href={`/ticket/${eventId}`}>
                      <Ticket className="mr-2 h-4 w-4" />
                      View My Ticket
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
