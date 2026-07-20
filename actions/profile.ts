"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function updateProfileAction(data: {
  name?: string;
  bio?: string;
  image?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name) {
    updates.name = data.name;
  }
  if (data.bio !== undefined) {
    updates.bio = data.bio;
  }
  if (data.image) {
    updates.image = data.image;
  }

  await db.update(user).set(updates).where(eq(user.id, session.user.id));

  revalidatePath("/dashboard/profile");
}
