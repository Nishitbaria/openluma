import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { OrchestratorMessage } from "@/lib/ai/agents/orchestrator";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatConversations, chatMessages } from "@/lib/db/schema";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await getSession(await headers());
  if (!session?.user) {
    notFound();
  }

  const conversation = await db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.id, conversationId),
      eq(chatConversations.userId, session.user.id)
    ),
  });
  if (!conversation) {
    notFound();
  }

  const rows = await db.query.chatMessages.findMany({
    orderBy: asc(chatMessages.order),
    where: eq(chatMessages.conversationId, conversationId),
  });

  // Rows were written by our own onEnd persistence, so the parts shape
  // matches OrchestratorMessage — a cast is sufficient here.
  const initialMessages = rows.map((row) => ({
    id: row.id,
    parts: row.parts,
    role: row.role,
  })) as OrchestratorMessage[];

  return (
    <div
      className="-m-6 flex flex-col"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <ChatPanel
        conversationId={conversationId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
