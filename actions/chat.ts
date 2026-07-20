"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatConversations } from "@/lib/db/schema";

export async function listConversationsAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return db.query.chatConversations.findMany({
    columns: { id: true, title: true, updatedAt: true },
    orderBy: desc(chatConversations.updatedAt),
    where: eq(chatConversations.userId, session.user.id),
  });
}

export async function deleteConversationAction(conversationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const conversation = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.id, conversationId),
  });
  if (!conversation || conversation.userId !== session.user.id) {
    throw new Error("Not authorized");
  }

  // Cascade FK removes the conversation's chatMessages rows
  await db
    .delete(chatConversations)
    .where(eq(chatConversations.id, conversationId));
  revalidatePath("/dashboard/chat");
}
