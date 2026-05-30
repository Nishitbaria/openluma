import { generateText } from "ai";
import { model } from "@/lib/ai/model";
import { createOrchestrator } from "@/lib/ai/agents/orchestrator";

export const runtime = "nodejs";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Env check
  const key = process.env.OPENAI_API_KEY ?? "";
  results.env = {
    OPENAI_API_KEY_SET: key.length > 0,
    OPENAI_API_KEY_PREFIX: key.slice(0, 10) + "...",
    OPENAI_API_KEY_QUOTED: key.startsWith('"') || key.endsWith('"'),
  };

  // 2. Raw OpenAI connectivity
  try {
    const { text, usage } = await generateText({
      model,
      prompt: 'Reply with exactly: "OpenLuma AI is working"',
      maxOutputTokens: 200,
    });
    results.openai = { ok: true, response: text.trim(), usage };
  } catch (err) {
    results.openai = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 3. Orchestrator agent (uses a dummy userId)
  try {
    const orchestrator = createOrchestrator("test-user-id");
    const { text } = await orchestrator.generate({
      messages: [
        {
          role: "user",
          content: "Say hello and tell me what you can help me with (1 sentence only).",
        },
      ],
    });
    results.orchestrator = { ok: true, response: text.trim() };
  } catch (err) {
    results.orchestrator = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const allOk = Object.values(results).every(
    (r) => typeof r === "object" && r !== null && (r as { ok?: boolean }).ok !== false,
  );

  return Response.json({ status: allOk ? "all_good" : "some_failed", results });
}
