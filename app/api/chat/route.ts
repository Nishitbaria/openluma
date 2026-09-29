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
import { checkRateLimit } from "@/lib/rate-limit";
import { chatRatelimit } from "@/lib/redis";

// The client resends the whole conversation each turn, and all of it becomes
// paid LLM input, so bound it.
const MAX_BODY_BYTES = 1024 * 1024;

/** Reads the body as text, stopping as soon as it exceeds `maxBytes`. */
async function readBodyWithLimit(
  req: Request,
  maxBytes: number
): Promise<string | null> {
  if (!req.body) {
    return "";
  }
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    // biome-ignore lint/performance/noAwaitInLoops: stream chunks arrive in order; each read depends on the previous one
    const { done, value } = await reader.read();
    if (done) {
      return Buffer.concat(chunks).toString("utf8");
    }
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUserText = messages
    .find((m) => m.role === "user")
    ?.parts.find((p) => p.type === "text");
  const text =
    firstUserText && "text" in firstUserText
      ? firstUserText.text.trim()
      : undefined;
  if (!text) {
    return "New conversation";
  }
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // LLM calls cost money per turn — throttle to prevent a single user from
  // driving unbounded spend.
  const limited = await checkRateLimit(req, "chat", {
    limiter: chatRatelimit,
    userId,
  });
  if (limited) {
    return limited;
  }

  const raw = await readBodyWithLimit(req, MAX_BODY_BYTES);
  if (raw === null) {
    return Response.json(
      { error: "Conversation is too long. Start a new chat." },
      { status: 413 }
    );
  }
  let body: { id?: unknown; messages?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id } = body;
  if (typeof id !== "string" || !id) {
    return Response.json({ error: "Missing conversation id" }, { status: 400 });
  }
  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "Missing messages" }, { status: 400 });
  }
  const messages = body.messages as OrchestratorMessage[];

  // Insert-then-check so two first requests for the same id can't both try
  // to create the conversation.
  await db
    .insert(chatConversations)
    .values({ id, title: deriveTitle(messages), userId })
    .onConflictDoNothing();
  const conversation = await db.query.chatConversations.findFirst({
    columns: { userId: true },
    where: eq(chatConversations.id, id),
  });
  if (conversation?.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const orchestrator = createOrchestrator(userId);

  return createAgentUIStreamResponse({
    agent: orchestrator,
    generateMessageId: generateId,
    onEnd: async ({ messages: finalMessages }) => {
      // Full resync each turn: tool-approval continuations extend an
      // existing assistant message id, so per-row diffing can't be trusted.
      await db.transaction(async (tx) => {
        // Serialize saves for this conversation; overlapping turns would
        // otherwise both reinsert the same message ids and one would fail.
        await tx
          .select({ id: chatConversations.id })
          .from(chatConversations)
          .where(eq(chatConversations.id, id))
          .for("update");
        // Preserve original createdAt for messages that already exist —
        // otherwise the delete+reinsert below would reset every message's
        // timestamp to "now" on every turn.
        const existingRows = await tx
          .select({
            createdAt: chatMessages.createdAt,
            id: chatMessages.id,
          })
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, id));
        const existingCreatedAt = new Map(
          existingRows.map((row) => [row.id, row.createdAt])
        );

        await tx
          .delete(chatMessages)
          .where(eq(chatMessages.conversationId, id));
        if (finalMessages.length > 0) {
          await tx.insert(chatMessages).values(
            finalMessages.map((message, index) => ({
              conversationId: id,
              createdAt: existingCreatedAt.get(message.id) ?? new Date(),
              id: message.id,
              order: index,
              parts: message.parts as Record<string, unknown>[],
              role: message.role,
            }))
          );
        }
        await tx
          .update(chatConversations)
          .set({ updatedAt: new Date() })
          .where(eq(chatConversations.id, id));
      });
    },
    originalMessages: messages,
    sendReasoning: true,
    uiMessages: messages,
  });
}
