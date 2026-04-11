import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createOrchestrator } from "@/lib/ai/agents/orchestrator";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] };
  const orchestrator = createOrchestrator(session.user.id);

  return createAgentUIStreamResponse({
    agent: orchestrator,
    uiMessages: messages,
    sendReasoning: true,
  });
}
