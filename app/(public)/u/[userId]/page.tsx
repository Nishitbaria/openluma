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
    where: eq(user.id, userId),
    columns: { name: true },
  });
  if (!profile) return { title: "User Not Found" };
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
      where: eq(user.id, userId),
      columns: { id: true, name: true, image: true, bio: true, createdAt: true },
    }),
    db.query.events.findMany({
      where: and(eq(events.hostId, userId), eq(events.visibility, "public")),
      with: {
        host: { columns: { id: true, name: true, image: true } },
        rsvps: { columns: { id: true } },
      },
      orderBy: [desc(events.startTime)],
      limit: 12,
    }),
  ]);

  if (!profile) notFound();

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col items-center text-center mb-12">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src={profile.image ?? undefined} alt={profile.name} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold">{profile.name}</h1>
        {profile.bio && (
          <p className="mt-2 max-w-md text-muted-foreground">{profile.bio}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Member since{" "}
          {new Date(profile.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6">
          Events ({hostedEvents.length})
        </h2>
        {hostedEvents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No public events yet.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hostedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  _count: { rsvps: event.rsvps.length },
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
