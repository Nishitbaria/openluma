import { stepCountIs, ToolLoopAgent, tool, type InferAgentUIMessage } from "ai";
import { z } from "zod/v4";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { model } from "@/lib/ai/model";
import { db } from "@/lib/db";
import { events, invitations } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { createEventAgent } from "./event-agent";

export function createOrchestrator(userId: string) {
  const eventAgent = createEventAgent(userId);

  return new ToolLoopAgent({
    id: "orchestrator",
    model,
    instructions: `You are the OpenLuma AI Assistant — an intelligent orchestrator that delegates tasks to specialized sub-agents.

## Your Role
You understand the user's intent and route requests to the right agent. You do NOT perform tasks directly — you delegate to agents.

## Available Agents

### Event Agent
Handles safe event operations: creating, editing, searching, viewing events, RSVPs, attendees.
Use the \`delegateToEventAgent\` tool for these.

## Risky Actions (handle directly — do NOT delegate)
- **Delete event**: use \`deleteEvent\` tool directly — it requires user approval first.
- **Send invitation**: use \`sendInvitation\` tool directly — it requires user approval first.
For these, first get the event details from the user (eventId and title), then call the tool.

## How to Delegate
1. Understand what the user wants
2. Call the appropriate tool with a clear, specific prompt
3. Present ONLY a brief summary to the user — the UI will render rich cards automatically from the structured data

## CRITICAL Response Rules
- When the agent returns artifacts (created events, event lists), the UI automatically renders rich interactive cards. Do NOT repeat the same information as text.
- For event creation: just say something like "Your event has been created!" — do NOT list out the details in text, the artifact card shows them.
- For event listing: just say something like "Here are your upcoming events:" — do NOT list the events in text, the artifact card shows them.
- For other responses (errors, questions, confirmations): respond conversationally.
- If a risky action is denied by the user, acknowledge it and do NOT retry the same tool.
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
            const artifacts: Array<{ type: string; data: unknown }> = [];
            for (const step of result.steps) {
              for (const tr of step.toolResults) {
                const res = tr.output as Record<string, unknown> | undefined;
                if (res?.success && res.event) {
                  artifacts.push({ type: "event-created", data: res.event });
                }
                if (res?.events && Array.isArray(res.events) && res.events.length > 0) {
                  artifacts.push({ type: "event-list", data: res.events });
                }
              }
            }
            return { agentId: "event-agent", response: result.text, artifacts };
          } catch (error) {
            return {
              agentId: "event-agent",
              error: `Event agent failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
          }
        },
        toModelOutput: ({ output }) => ({
          type: "text" as const,
          value: output?.response ?? output?.error ?? "Task completed.",
        }),
      }),

      deleteEvent: tool({
        description:
          "Delete an event permanently. Requires explicit user approval before executing.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID to delete"),
          eventTitle: z.string().describe("The event title shown in the confirmation prompt"),
        }),
        needsApproval: true,
        execute: async ({ eventId }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) return { error: "Event not found" };
          if (event.hostId !== userId) return { error: "Not authorized" };
          await db.delete(events).where(eq(events.id, eventId));
          return { success: true, message: `Event "${event.title}" deleted successfully` };
        },
      }),

      sendInvitation: tool({
        description:
          "Send an email invitation to someone for an event. Requires explicit user approval before sending.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID"),
          email: z.string().describe("Email address to invite"),
          eventTitle: z.string().optional().describe("The event title shown in the confirmation prompt"),
        }),
        needsApproval: true,
        execute: async ({ eventId, email }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) return { error: "Event not found" };
          if (event.hostId !== userId) return { error: "Not authorized" };
          const token = nanoid(32);
          const [invitation] = await db
            .insert(invitations)
            .values({
              eventId,
              email,
              token,
              invitedBy: userId,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            })
            .returning();
          await sendInvitationEmail(email, event.title, token);
          return { success: true, email, invitationId: invitation.id };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });
}

export type OrchestratorMessage = InferAgentUIMessage<ReturnType<typeof createOrchestrator>>;
