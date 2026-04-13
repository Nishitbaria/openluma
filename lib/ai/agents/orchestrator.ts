import { openai } from "@ai-sdk/openai";
import { stepCountIs, ToolLoopAgent, tool } from "ai";
import { z } from "zod/v4";
import { createEventAgent } from "./event-agent";

export function createOrchestrator(userId: string) {
  const eventAgent = createEventAgent(userId);

  return new ToolLoopAgent({
    id: "orchestrator",
    model: openai("gpt-4o-mini"),
    instructions: `You are the OpenLuma AI Assistant — an intelligent orchestrator that delegates tasks to specialized sub-agents.

## Your Role
You understand the user's intent and route requests to the right agent. You do NOT perform tasks directly — you delegate to agents.

## Available Agents

### Event Agent
Handles everything related to events:
- Creating, editing, deleting events
- Searching and discovering events
- Viewing event details and attendees
- Managing RSVPs (submit, cancel)
- Sending email invitations

Use the \`delegateToEventAgent\` tool to forward event-related requests.

## How to Delegate
1. Understand what the user wants
2. Call the appropriate agent tool with a clear, specific prompt
3. Present ONLY a brief summary to the user — the UI will render rich cards automatically from the structured data

## CRITICAL Response Rules
- When the agent returns artifacts (created events, event lists), the UI automatically renders rich interactive cards. Do NOT repeat the same information as text.
- For event creation: just say something like "Your event has been created!" — do NOT list out the details in text, the artifact card shows them.
- For event listing: just say something like "Here are your upcoming events:" — do NOT list the events in text, the artifact card shows them.
- For other responses (errors, questions, confirmations): respond conversationally.
- Always delegate to an agent — never try to answer event questions from memory.
- If the agent needs more info from the user, ask for it before delegating again.
- Keep responses SHORT (1-2 sentences max when artifacts are present).`,
    tools: {
      delegateToEventAgent: tool({
        description: `Delegate an event-related task to the Event Agent. Use this for ANY request about creating, editing, deleting, searching events, managing RSVPs, viewing attendees, or sending invitations.`,
        inputSchema: z.object({
          prompt: z
            .string()
            .describe(
              "A clear, specific prompt describing what the Event Agent should do. Include all relevant details from the user's message.",
            ),
        }),
        execute: async ({ prompt }, { abortSignal }) => {
          try {
            const result = await eventAgent.generate({
              messages: [{ role: "user", content: prompt }],
              abortSignal,
            });
            // Extract structured artifacts from tool results
            const artifacts: Array<{ type: string; data: unknown }> = [];
            for (const step of result.steps) {
              for (const tr of step.toolResults) {
                const res = tr.output as Record<string, unknown> | undefined;
                if (res?.success && res.event) {
                  artifacts.push({ type: "event-created", data: res.event });
                }
                if (
                  res?.events &&
                  Array.isArray(res.events) &&
                  res.events.length > 0
                ) {
                  artifacts.push({ type: "event-list", data: res.events });
                }
              }
            }

            return {
              agentId: "event-agent",
              response: result.text,
              artifacts,
            };
          } catch (error) {
            return {
              agentId: "event-agent",
              error: `Event agent failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });
}
