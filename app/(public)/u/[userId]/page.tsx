import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/events/event-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { events, user } from "@/lib/db/schema";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildPersonJsonLd } from "@/lib/seo/structured-data";

// Profiles change rarely; serving them from ISR keeps crawler traffic off the
// database. Nothing here reads the session, so caching is safe.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const profile = await db.query.user.findFirst({
    columns: { bio: true, image: true, name: true },
    where: eq(user.id, userId),
  });
  if (!profile) {
    return { robots: { follow: false, index: false }, title: "User Not Found" };
  }

  const description =
    profile.bio ?? `Events hosted by ${profile.name} on OpenLuma.`;

  // Avatars are square, so they get the small card; profiles without one fall
  // back to the branded 1200×630 site card rather than shipping no image.
  return buildPageMetadata({
    description,
    images: [profile.image ?? "/opengraph-image"],
    ogType: "profile",
    path: `/u/${userId}`,
    title: profile.name,
    twitterCard: profile.image ? "summary" : "summary_large_image",
  });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [profile, hostedEvents] = await Promise.all([
    db.query.user.findFirst({
      columns: {
        bio: true,
        createdAt: true,
        id: true,
        image: true,
        name: true,
      },
      where: eq(user.id, userId),
    }),
    db.query.events.findMany({
      limit: 12,
      orderBy: [desc(events.startTime)],
      where: and(eq(events.hostId, userId), eq(events.visibility, "public")),
      with: {
        host: { columns: { id: true, image: true, name: true } },
        rsvps: { columns: { id: true } },
      },
    }),
  ]);

  if (!profile) {
    notFound();
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <JsonLd data={buildPersonJsonLd(profile)} id="ld-person" />
      <div className="mb-12 flex flex-col items-center text-center">
        <Avatar className="mb-4 h-24 w-24">
          <AvatarImage alt={profile.name} src={profile.image ?? undefined} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <h1 className="font-bold text-3xl">{profile.name}</h1>
        {profile.bio ? (
          <p className="mt-2 max-w-md text-muted-foreground">{profile.bio}</p>
        ) : null}
        <p className="mt-1 text-muted-foreground text-sm">
          Member since{" "}
          {new Date(profile.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div>
        <h2 className="mb-6 font-semibold text-xl">
          Events ({hostedEvents.length})
        </h2>
        {hostedEvents.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No public events yet.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hostedEvents.map((event) => (
              <EventCard
                event={{
                  ...event,
                  _count: { rsvps: event.rsvps.length },
                }}
                key={event.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
