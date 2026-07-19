import { formatInTimeZone } from "date-fns-tz";
import { and, eq, lte } from "drizzle-orm";
import { Calendar, Globe, Lock, MapPin, Users } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarExportButton } from "@/components/events/calendar-export-button";
import { CopyLinkButton } from "@/components/events/copy-link-button";
import { RichTextRenderer } from "@/components/events/rich-text-renderer";
import { RsvpButton } from "@/components/events/rsvp-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  eventPageviews,
  eventQuestions,
  events,
  invitations,
  rsvps,
} from "@/lib/db/schema";
import { redis } from "@/lib/redis";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: {
      title: true,
      description: true,
      visibility: true,
      coverImage: true,
    },
  });
  if (!event) return { title: "Event Not Found" };
  if (event.visibility === "private") {
    return {
      title: "Private Event - OpenLuma",
      description: "This event is invite-only.",
    };
  }

  const ogImageUrl = `${appUrl}/api/og?slug=${slug}`;
  const description = event.description ?? `Join ${event.title} on OpenLuma`;

  return {
    title: `${event.title} - OpenLuma`,
    description,
    openGraph: {
      title: `${event.title} - OpenLuma`,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: event.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} - OpenLuma`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicEventBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [event, session] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.slug, slug),
      with: {
        host: { columns: { id: true, name: true, image: true } },
        category: true,
        tags: true,
        rsvps: {
          columns: { id: true, status: true },
          with: { user: { columns: { id: true, name: true, image: true } } },
        },
      },
    }),
    getSession(await headers()).catch(() => null),
  ]);

  if (!event) notFound();
  let currentRsvpStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "waitlisted"
    | null = null;

  const [userRsvpResult, questions, invitationResult] = await Promise.all([
    session?.user
      ? db.query.rsvps.findFirst({
          where: and(
            eq(rsvps.eventId, event.id),
            eq(rsvps.userId, session.user.id),
          ),
          columns: { status: true, createdAt: true },
        })
      : Promise.resolve(undefined),
    db.query.eventQuestions.findMany({
      where: eq(eventQuestions.eventId, event.id),
      orderBy: (q, { asc }) => [asc(q.order)],
      columns: {
        id: true,
        label: true,
        type: true,
        required: true,
        options: true,
      },
    }),
    session?.user?.email && event.visibility === "private"
      ? db.query.invitations.findFirst({
          where: and(
            eq(invitations.eventId, event.id),
            eq(invitations.email, session.user.email),
          ),
          columns: { token: true, status: true },
        })
      : Promise.resolve(undefined),
  ]);

  currentRsvpStatus = userRsvpResult?.status ?? null;
  const pendingInvitation =
    invitationResult?.status === "pending" ? invitationResult : null;

  // ── Non-blocking pageview tracking ──────────────────────────────────────────
  void (async () => {
    try {
      const reqHeaders = await headers();
      const ip =
        reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const ipHash = Buffer.from(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)),
      ).toString("hex");
      const city = reqHeaders.get("x-vercel-ip-city") ?? null;
      const rawRef = reqHeaders.get("referer") ?? null;
      const referrer = rawRef
        ? (() => {
            try {
              return new URL(rawRef).hostname || "direct";
            } catch {
              return "direct";
            }
          })()
        : "direct";

      const dedupKey = `pv:${event.id}:${ipHash}`;
      const already = redis ? await redis.get(dedupKey) : null;
      if (!already) {
        if (redis) redis.set(dedupKey, "1", { ex: 3600 }).catch(() => {});
        db.insert(eventPageviews)
          .values({ eventId: event.id, ipHash, referrer, city })
          .catch(() => {});
      }
    } catch {
      // silently ignore — never break page load
    }
  })();

  // Waitlist position: count waitlisted RSVPs created at or before the user's
  let waitlistPosition: number | null = null;
  if (currentRsvpStatus === "waitlisted" && userRsvpResult?.createdAt) {
    const earlier = await db.query.rsvps.findMany({
      where: and(
        eq(rsvps.eventId, event.id),
        eq(rsvps.status, "waitlisted"),
        lte(rsvps.createdAt, userRsvpResult.createdAt),
      ),
      columns: { id: true },
    });
    waitlistPosition = earlier.length;
  }

  if (event.visibility === "private") {
    const isHost = session?.user?.id === event.host.id;
    const hasApprovedRsvp = currentRsvpStatus === "approved";

    if (!isHost && !hasApprovedRsvp) {
      return (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Private Event</h1>
          {pendingInvitation ? (
            <>
              <p className="mt-2 text-muted-foreground">
                You have a pending invitation to this event.
              </p>
              <Button asChild className="mt-6">
                <Link
                  href={`/api/invitations/${pendingInvitation.token}?action=accept`}
                >
                  Accept invitation
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-muted-foreground">
                This event is invite-only. You need an invitation to view it.
              </p>
              {!session?.user && (
                <Button asChild className="mt-6">
                  <Link href={`/sign-in?callbackUrl=/e/${slug}`}>
                    Sign in to view invitation
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      );
    }
  }

  const approvedRsvps = event.rsvps.filter((r) => r.status === "approved");
  const approvedCount = approvedRsvps.length;
  const visibleAttendees = approvedRsvps.slice(0, 5);
  const remainingAttendeeCount = approvedCount - visibleAttendees.length;
  const startTime = new Date(event.startTime);
  const endTime = event.endTime ? new Date(event.endTime) : null;
  const showDirectionsLink =
    !!event.location && (event.type === "in_person" || event.type === "hybrid");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      {event.coverImage ? (
        <div className="relative aspect-video overflow-hidden rounded-xl mb-8">
          <Image
            src={event.coverImage}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
      ) : null}

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

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
        <CopyLinkButton url={`${appUrl}/e/${slug}`} />
      </div>
      <HoverCard>
        <HoverCardTrigger asChild>
          <Link
            href={`/u/${event.host.id}`}
            className="mt-2 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Avatar size="sm">
              <AvatarImage
                src={event.host.image ?? undefined}
                alt={event.host.name}
              />
              <AvatarFallback>
                {event.host.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>Hosted by {event.host.name}</span>
          </Link>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage
                src={event.host.image ?? undefined}
                alt={event.host.name}
              />
              <AvatarFallback>
                {event.host.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{event.host.name}</p>
              <Link
                href={`/u/${event.host.id}`}
                className="text-sm text-primary hover:underline"
              >
                View profile
              </Link>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <div className="grid gap-8 md:grid-cols-3 mt-8 items-start">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {formatInTimeZone(
                      startTime,
                      event.timezone,
                      "EEEE, MMMM d, yyyy",
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatInTimeZone(startTime, event.timezone, "h:mm a")}
                    {endTime &&
                      ` - ${formatInTimeZone(endTime, event.timezone, "h:mm a")}`}{" "}
                    ({formatInTimeZone(startTime, event.timezone, "zzz")})
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
                    {showDirectionsLink && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Get directions →
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-3">
                  <p className="font-medium">
                    {approvedCount} attending
                    {event.capacity ? ` / ${event.capacity} spots` : null}
                  </p>
                  {visibleAttendees.length > 0 && (
                    <div className="flex -space-x-2">
                      {visibleAttendees.map((rsvp) => (
                        <Avatar
                          key={rsvp.id}
                          size="sm"
                          className="ring-2 ring-background"
                        >
                          <AvatarImage
                            src={rsvp.user.image ?? undefined}
                            alt={rsvp.user.name}
                          />
                          <AvatarFallback>
                            {rsvp.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {remainingAttendeeCount > 0 && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground ring-2 ring-background">
                          +{remainingAttendeeCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {(event.richDescription || event.description) && (
            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                {event.richDescription ? (
                  <RichTextRenderer content={event.richDescription} />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                )}
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

        <div className="md:sticky md:top-24 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {session?.user?.id === event.host.id ? (
                <p className="text-sm text-center text-muted-foreground">
                  You are the host of this event
                </p>
              ) : (
                <RsvpButton
                  eventId={event.id}
                  eventSlug={slug}
                  requiresApproval={event.requiresApproval}
                  currentRsvpStatus={currentRsvpStatus}
                  questions={questions}
                  waitlistPosition={waitlistPosition}
                />
              )}
              <CalendarExportButton
                event={{
                  title: event.title,
                  description: event.description,
                  startTime: event.startTime.toISOString(),
                  endTime: event.endTime?.toISOString() ?? null,
                  location: event.location,
                  id: event.id,
                  slug: event.slug,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
