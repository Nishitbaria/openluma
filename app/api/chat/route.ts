import { createAgentUIStreamResponse, generateId, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  createOrchestrator,
  type OrchestratorMessage,
} from "@/lib/ai/agents/orchestrator";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatConversations, chatMessages } from "@/lib/db/schema";

function deriveTitle(messages: UIMessage[]): string {
  const firstUserText = messages
    .find((m) => m.role === "user")
    ?.parts.find((p) => p.type === "text");
  const text =
    firstUserText && "text" in firstUserText
      ? firstUserText.text.trim()
      : undefined;
  if (!text) return "New conversation";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id, messages } = (await req.json()) as {
    id?: string;
    messages: OrchestratorMessage[];
  };
  if (!id) {
    return Response.json({ error: "Missing conversation id" }, { status: 400 });
  }

  const existing = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.id, id),
  });
  if (existing && existing.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!existing) {
    await db.insert(chatConversations).values({
      id,
      userId,
      title: deriveTitle(messages),
    });
  }

  const orchestrator = createOrchestrator(userId);

  return createAgentUIStreamResponse({
    agent: orchestrator,
    uiMessages: messages,
    sendReasoning: true,
    originalMessages: messages,
    generateMessageId: generateId,
    onEnd: async ({ messages: finalMessages }) => {
      // Full resync each turn: tool-approval continuations extend an
      // existing assistant message id, so per-row diffing can't be trusted.
      await db.transaction(async (tx) => {
        // Preserve original createdAt for messages that already exist —
        // otherwise the delete+reinsert below would reset every message's
        // timestamp to "now" on every turn.
        const existingRows = await tx
          .select({
            id: chatMessages.id,
            createdAt: chatMessages.createdAt,
          })
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, id));
        const existingCreatedAt = new Map(
          existingRows.map((row) => [row.id, row.createdAt]),
        );

        await tx
          .delete(chatMessages)
          .where(eq(chatMessages.conversationId, id));
        if (finalMessages.length > 0) {
          await tx.insert(chatMessages).values(
            finalMessages.map((message, index) => ({
              id: message.id,
              conversationId: id,
              role: message.role,
              parts: message.parts as Record<string, unknown>[],
              order: index,
              createdAt: existingCreatedAt.get(message.id) ?? new Date(),
            })),
          );
        }
        await tx
          .update(chatConversations)
          .set({ updatedAt: new Date() })
          .where(eq(chatConversations.id, id));
      });
    },
  });
}
