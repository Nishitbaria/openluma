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
    columns: {
      coverImage: true,
      description: true,
      title: true,
      visibility: true,
    },
    where: eq(events.slug, slug),
  });
  if (!event) {
    return { title: "Event Not Found" };
  }
  if (event.visibility === "private") {
    return {
      description: "This event is invite-only.",
      title: "Private Event - OpenLuma",
    };
  }

  const ogImageUrl = `${appUrl}/api/og?slug=${slug}`;
  const description = event.description ?? `Join ${event.title} on OpenLuma`;

  return {
    description,
    openGraph: {
      description,
      images: [{ alt: event.title, height: 630, url: ogImageUrl, width: 1200 }],
      title: `${event.title} - OpenLuma`,
      type: "website",
    },
    title: `${event.title} - OpenLuma`,
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImageUrl],
      title: `${event.title} - OpenLuma`,
    },
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: top-level page component composing many conditional sections (auth state, RSVP status, event metadata); complexity is inherent to server-rendering the full page
export default async function PublicEventBySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ register?: string }>;
}) {
  const { slug } = await params;
  const { register } = await searchParams;

  const [event, session] = await Promise.all([
    db.query.events.findFirst({
      where: eq(events.slug, slug),
      with: {
        category: true,
        host: { columns: { id: true, image: true, name: true } },
        rsvps: {
          columns: { id: true, status: true },
          with: { user: { columns: { id: true, image: true, name: true } } },
        },
        tags: true,
      },
    }),
    getSession(await headers()).catch(() => null),
  ]);

  if (!event) {
    notFound();
  }
  let currentRsvpStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "waitlisted"
    | null = null;

  const [userRsvpResult, questions, invitationResult] = await Promise.all([
    session?.user
      ? db.query.rsvps.findFirst({
          columns: { createdAt: true, status: true },
          where: and(
            eq(rsvps.eventId, event.id),
            eq(rsvps.userId, session.user.id)
          ),
        })
      : Promise.resolve(undefined),
    db.query.eventQuestions.findMany({
      columns: {
        id: true,
        label: true,
        options: true,
        required: true,
        type: true,
      },
      orderBy: (q, { asc }) => [asc(q.order)],
      where: eq(eventQuestions.eventId, event.id),
    }),
    session?.user?.email && event.visibility === "private"
      ? db.query.invitations.findFirst({
          columns: { status: true, token: true },
          where: and(
            eq(invitations.eventId, event.id),
            eq(invitations.email, session.user.email)
          ),
        })
      : Promise.resolve(undefined),
  ]);

  currentRsvpStatus = userRsvpResult?.status ?? null;
  const pendingInvitation =
    invitationResult?.status === "pending" ? invitationResult : null;
  // An accepted invitation grants access so the invitee can still complete
  // registration (answering the event's questions) even before their RSVP.
  const hasAcceptedInvitation = invitationResult?.status === "accepted";

  // ── Non-blocking pageview tracking ──────────────────────────────────────────
  (async () => {
    try {
      const reqHeaders = await headers();
      const ip =
        reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const ipHash = Buffer.from(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))
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
        if (redis) {
          redis.set(dedupKey, "1", { ex: 3600 }).catch(() => {
            // ignore: best-effort dedup cache, safe to drop
          });
        }
        db.insert(eventPageviews)
          .values({ city, eventId: event.id, ipHash, referrer })
          .catch(() => {
            // ignore: best-effort analytics write, must not break page load
          });
      }
    } catch {
      // silently ignore — never break page load
    }
  })();

  // Waitlist position: count waitlisted RSVPs created at or before the user's
  let waitlistPosition: number | null = null;
  if (currentRsvpStatus === "waitlisted" && userRsvpResult?.createdAt) {
    const earlier = await db.query.rsvps.findMany({
      columns: { id: true },
      where: and(
        eq(rsvps.eventId, event.id),
        eq(rsvps.status, "waitlisted"),
        lte(rsvps.createdAt, userRsvpResult.createdAt)
      ),
    });
    waitlistPosition = earlier.length;
  }

  if (event.visibility === "private") {
    const isHost = session?.user?.id === event.host.id;
    const hasApprovedRsvp = currentRsvpStatus === "approved";

    if (!(isHost || hasApprovedRsvp || hasAcceptedInvitation)) {
      return (
        <div className="mx-auto w-full max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 font-bold text-2xl">Private Event</h1>
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
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {event.coverImage ? (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-xl">
          <Image
            alt={event.title}
            className="object-cover"
            fill
            src={event.coverImage}
          />
        </div>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
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
        {event.category ? (
          <Badge variant="outline">{event.category.name}</Badge>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="font-bold text-4xl tracking-tight">{event.title}</h1>
        <CopyLinkButton url={`${appUrl}/e/${slug}`} />
      </div>
      <HoverCard>
        <HoverCardTrigger asChild>
          <Link
            className="mt-2 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            href={`/u/${event.host.id}`}
          >
            <Avatar size="sm">
              <AvatarImage
                alt={event.host.name}
                src={event.host.image ?? undefined}
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
                alt={event.host.name}
                src={event.host.image ?? undefined}
              />
              <AvatarFallback>
                {event.host.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{event.host.name}</p>
              <Link
                className="text-primary text-sm hover:underline"
                href={`/u/${event.host.id}`}
              >
                View profile
              </Link>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {formatInTimeZone(
                      startTime,
                      event.timezone,
                      "EEEE, MMMM d, yyyy"
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatInTimeZone(startTime, event.timezone, "h:mm a")}
                    {endTime
                      ? ` - ${formatInTimeZone(endTime, event.timezone, "h:mm a")}`
                      : ""}{" "}
                    ({formatInTimeZone(startTime, event.timezone, "zzz")})
                  </p>
                </div>
              </div>

              {event.location ? (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{event.location}</p>
                    {event.locationDetails ? (
                      <p className="text-muted-foreground text-sm">
                        {event.locationDetails}
                      </p>
                    ) : null}
                    {showDirectionsLink ? (
                      <a
                        className="text-primary text-sm hover:underline"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Get directions →
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
                          className="ring-2 ring-background"
                          key={rsvp.id}
                          size="sm"
                        >
                          <AvatarImage
                            alt={rsvp.user.name}
                            src={rsvp.user.image ?? undefined}
                          />
                          <AvatarFallback>
                            {rsvp.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {remainingAttendeeCount > 0 && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs ring-2 ring-background">
                          +{remainingAttendeeCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {event.richDescription || event.description ? (
            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                {event.richDescription ? (
                  <RichTextRenderer content={event.richDescription} />
                ) : (
                  <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                    {event.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 md:sticky md:top-24">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {session?.user?.id === event.host.id ? (
                <p className="text-center text-muted-foreground text-sm">
                  You are the host of this event
                </p>
              ) : (
                <RsvpButton
                  autoRegister={register === "1"}
                  currentRsvpStatus={currentRsvpStatus}
                  eventId={event.id}
                  eventSlug={slug}
                  questions={questions}
                  requiresApproval={event.requiresApproval}
                  waitlistPosition={waitlistPosition}
                />
              )}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
