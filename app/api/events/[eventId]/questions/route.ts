import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventQuestions, events } from "@/lib/db/schema";

const questionSchema = z.object({
  label: z.string().min(1).max(300),
  type: z.enum(["text", "paragraph", "checkbox", "dropdown"]),
  required: z.boolean().default(false),
  order: z.number().int().default(0),
  options: z.array(z.string()).optional(),
});

async function getHostOrCohost(eventId: string, userId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { cohosts: { columns: { userId: true } } },
    columns: { hostId: true },
  });
  if (!event) return null;
  const isHost = event.hostId === userId;
  const isCohost = event.cohosts.some((c) => c.userId === userId);
  return isHost || isCohost ? event : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const questions = await db.query.eventQuestions.findMany({
    where: eq(eventQuestions.eventId, eventId),
    orderBy: [asc(eventQuestions.order)],
  });

  return Response.json(questions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getHostOrCohost(eventId, session.user.id);
  if (!event) return Response.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Invalid data" }, { status: 400 });

  const [question] = await db
    .insert(eventQuestions)
    .values({ eventId, ...parsed.data })
    .returning();

  return Response.json(question, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getHostOrCohost(eventId, session.user.id);
  if (!event) return Response.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return Response.json({ message: "Missing id" }, { status: 400 });

  const parsed = questionSchema.partial().safeParse(rest);
  if (!parsed.success) return Response.json({ message: "Invalid data" }, { status: 400 });

  const [updated] = await db
    .update(eventQuestions)
    .set(parsed.data)
    .where(eq(eventQuestions.id, id))
    .returning();

  return Response.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getHostOrCohost(eventId, session.user.id);
  if (!event) return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return Response.json({ message: "Missing id" }, { status: 400 });

  await db.delete(eventQuestions).where(eq(eventQuestions.id, id));
  return Response.json({ message: "Deleted" });
}
