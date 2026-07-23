import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { updateProfileSchema } from "@/lib/validators/profile";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { errors: parsed.error.issues, message: "Invalid data" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.name) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.bio !== undefined) {
    updates.bio = parsed.data.bio;
  }
  if (parsed.data.image) {
    updates.image = parsed.data.image;
  }

  const [updated] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, session.user.id))
    .returning();

  return Response.json(updated);
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  return Response.json(profile);
}
