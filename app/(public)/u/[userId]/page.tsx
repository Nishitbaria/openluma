import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/events/event-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { events, user } from "@/lib/db/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await db.query.user.findFirst({
    columns: { name: true },
    where: eq(user.id, userId),
  });
  if (!profile) {
    return { title: "User Not Found" };
  }
  return { title: `${profile.name} - OpenLuma` };
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
