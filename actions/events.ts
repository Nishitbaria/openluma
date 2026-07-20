"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export async function deleteEventAction(eventId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event || event.hostId !== session.user.id) {
    throw new Error("Not authorized");
  }

  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}
