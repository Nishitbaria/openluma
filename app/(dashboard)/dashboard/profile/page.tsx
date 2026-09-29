import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await getSession(await headers());
  if (!session?.user) {
    redirect("/sign-in");
  }

  // Read from the database: the session doesn't carry the bio.
  const profile = await db.query.user.findFirst({
    columns: { bio: true, email: true, image: true, name: true },
    where: eq(user.id, session.user.id),
  });
  if (!profile) {
    redirect("/sign-in");
  }

  return <ProfileForm user={profile} />;
}
