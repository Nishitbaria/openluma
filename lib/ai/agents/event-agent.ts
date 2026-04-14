import { openai } from "@ai-sdk/openai";
import { stepCountIs, ToolLoopAgent, tool } from "ai";
import { and, desc, eq, gte, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { eventTags, events, invitations, rsvps } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { generateEventSlug } from "@/lib/utils/slugify";

export function createEventAgent(userId: string) {
  return new ToolLoopAgent({
    id: "event-agent",
    model: openai("gpt-4o-mini"),
    instructions: `You are the Event Management Agent for OpenLuma.
You handle all event-related operations: creating, editing, deleting, searching, and viewing events.
You also manage RSVPs, attendees, and email invitations.

IMPORTANT: You do NOT know the current date from your training. ALWAYS call the getCurrentDate tool first before creating events or interpreting relative dates like "tomorrow", "next Friday", "this weekend", etc.

RULES:
- ALWAYS call getCurrentDate before creating or searching events with relative dates.
- Before deleting an event, ALWAYS ask the user for confirmation first. Set confirmed=false initially.
- Before sending invitations to multiple people, confirm the list with the user.
- Never fabricate data — always use your tools to query real information.
- When creating events, ask for missing required fields (title, start time) before calling the tool.
- Format dates in a human-friendly way (e.g., "Friday, April 18 at 6:00 PM").
- Be concise but helpful.
- When you successfully create an event, share the event link: /e/{eventSlug}
- When listing events, format them as a clean numbered list.`,
    tools: {
      getCurrentDate: tool({
        description:
          "Get the current date and time. ALWAYS call this before creating events or interpreting relative dates like 'tomorrow', 'next Friday', etc.",
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          return {
            iso: now.toISOString(),
            date: now.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            time: now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
        },
      }),

      createEvent: tool({
        description:
          "Create a new event. Requires at least title and startTime.",
        inputSchema: z.object({
          title: z.string().describe("Event title"),
          description: z.string().optional().describe("Event description"),
          startTime: z.string().describe("ISO 8601 datetime for event start"),
          endTime: z
            .string()
            .optional()
            .describe("ISO 8601 datetime for event end"),
          location: z
            .string()
            .optional()
            .describe("Event location or virtual link"),
          type: z.enum(["in_person", "virtual", "hybrid"]).optional(),
          visibility: z.enum(["public", "private"]).optional(),
          capacity: z.number().optional(),
          requiresApproval: z.boolean().optional(),
        }),
        execute: async (params) => {
          const [event] = await db
            .insert(events)
            .values({
              title: params.title,
              slug: generateEventSlug(params.title),
              description: params.description,
              startTime: new Date(params.startTime),
              endTime: params.endTime ? new Date(params.endTime) : null,
              location: params.location,
              type: params.type ?? "in_person",
              visibility: params.visibility ?? "public",
              capacity: params.capacity,
              requiresApproval: params.requiresApproval ?? false,
              hostId: userId,
            })
            .returning();
          return {
            success: true,
            event: {
              id: event.id,
              slug: event.slug,
              title: event.title,
              description: event.description,
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              type: event.type,
              visibility: event.visibility,
              capacity: event.capacity,
            },
          };
        },
      }),

      listMyEvents: tool({
        description: "List events hosted by the current user.",
        inputSchema: z.object({
          upcoming: z
            .boolean()
            .optional()
            .describe("Only show upcoming events"),
        }),
        execute: async ({ upcoming }) => {
          const conditions = [eq(events.hostId, userId)];
          if (upcoming) conditions.push(gte(events.startTime, new Date()));

          const results = await db.query.events.findMany({
            where: and(...conditions),
            orderBy: [desc(events.startTime)],
            limit: 20,
            columns: {
              id: true,
              slug: true,
              title: true,
              startTime: true,
              location: true,
              visibility: true,
              type: true,
            },
          });
          return { events: results, total: results.length };
        },
      }),

      searchEvents: tool({
        description: "Search public events by keyword or date.",
        inputSchema: z.object({
          query: z.string().optional().describe("Search keyword"),
          startAfter: z
            .string()
            .optional()
            .describe("ISO date - only events after this date"),
        }),
        execute: async (params) => {
          const conditions = [eq(events.visibility, "public")];
          if (params.query) {
            conditions.push(ilike(events.title, `%${params.query}%`));
          }
          if (params.startAfter) {
            conditions.push(gte(events.startTime, new Date(params.startAfter)));
          }

          const results = await db.query.events.findMany({
            where: and(...conditions),
            with: {
              host: { columns: { id: true, name: true } },
            },
            orderBy: [desc(events.startTime)],
            limit: 10,
            columns: {
              id: true,
              slug: true,
              title: true,
              startTime: true,
              location: true,
              type: true,
            },
          });
          return { events: results, total: results.length };
        },
      }),

      getEventDetails: tool({
        description: "Get full details of a specific event.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID"),
        }),
        execute: async ({ eventId }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
            with: {
              host: { columns: { id: true, name: true } },
              rsvps: {
                with: {
                  user: { columns: { id: true, name: true, email: true } },
                },
              },
              tags: true,
            },
          });
          if (!event) return { error: "Event not found" };
          if (event.visibility === "private" && event.hostId !== userId) {
            return { error: "Not authorized to view this private event" };
          }
          // Only include attendee emails for the host
          const isHost = event.hostId === userId;
          return {
            event: {
              ...event,
              rsvps: isHost
                ? event.rsvps
                : event.rsvps.map((r) => ({
                    ...r,
                    user: { id: r.user.id, name: r.user.name },
                  })),
              rsvpSummary: {
                total: event.rsvps.length,
                approved: event.rsvps.filter((r) => r.status === "approved")
                  .length,
                pending: event.rsvps.filter((r) => r.status === "pending")
                  .length,
              },
            },
          };
        },
      }),

      editEvent: tool({
        description: "Edit an event. Only the host can edit.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID to edit"),
          title: z.string().optional(),
          description: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          location: z.string().optional(),
          capacity: z.number().optional(),
          visibility: z.enum(["public", "private"]).optional(),
        }),
        execute: async ({ eventId, ...updates }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) return { error: "Event not found" };
          if (event.hostId !== userId) return { error: "Not authorized" };

          const dbUpdates: Record<string, unknown> = {
            updatedAt: new Date(),
          };
          if (updates.title) dbUpdates.title = updates.title;
          if (updates.description) dbUpdates.description = updates.description;
          if (updates.startTime)
            dbUpdates.startTime = new Date(updates.startTime);
          if (updates.endTime) dbUpdates.endTime = new Date(updates.endTime);
          if (updates.location) dbUpdates.location = updates.location;
          if (updates.capacity) dbUpdates.capacity = updates.capacity;
          if (updates.visibility) dbUpdates.visibility = updates.visibility;

          const [updated] = await db
            .update(events)
            .set(dbUpdates)
            .where(eq(events.id, eventId))
            .returning();

          return {
            success: true,
            event: { id: updated.id, title: updated.title },
          };
        },
      }),

      deleteEvent: tool({
        description:
          "Delete an event. ALWAYS confirm with the user before calling this.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID to delete"),
          confirmed: z
            .boolean()
            .describe("Must be true - user must confirm deletion first"),
        }),
        execute: async ({ eventId, confirmed }) => {
          if (!confirmed) return { error: "Deletion not confirmed by user" };

          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) return { error: "Event not found" };
          if (event.hostId !== userId) return { error: "Not authorized" };

          await db.delete(events).where(eq(events.id, eventId));
          return {
            success: true,
            message: `Event "${event.title}" deleted`,
          };
        },
      }),

      submitRsvp: tool({
        description: "RSVP to an event on behalf of the user.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID to RSVP to"),
          message: z
            .string()
            .optional()
            .describe("Optional message to the host"),
        }),
        execute: async ({ eventId, message }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) return { error: "Event not found" };

          const existing = await db.query.rsvps.findFirst({
            where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)),
          });
          if (existing) return { error: "Already RSVP'd", rsvp: existing };

          const status = event.requiresApproval ? "pending" : "approved";

          const [rsvp] = await db
            .insert(rsvps)
            .values({ eventId, userId, status, message })
            .returning();

          return { success: true, rsvp: { id: rsvp.id, status: rsvp.status } };
        },
      }),

      getAttendees: tool({
        description:
          "Get the attendee list for an event. Only the host can see attendee emails.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID"),
        }),
        execute: async ({ eventId }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
            columns: { id: true, hostId: true, visibility: true },
          });
          if (!event) return { error: "Event not found" };
          if (event.visibility === "private" && event.hostId !== userId) {
            return {
              error: "Not authorized to view attendees of this private event",
            };
          }
          const isHost = event.hostId === userId;
          const eventRsvps = await db.query.rsvps.findMany({
            where: eq(rsvps.eventId, eventId),
            with: {
              user: { columns: { id: true, name: true, email: true } },
            },
          });
          return {
            attendees: eventRsvps.map((r) => ({
              name: r.user.name,
              email: isHost ? r.user.email : undefined,
              status: r.status,
            })),
            total: eventRsvps.length,
            approved: eventRsvps.filter((r) => r.status === "approved").length,
            pending: eventRsvps.filter((r) => r.status === "pending").length,
          };
        },
      }),

      cloneEvent: tool({
        description:
          "Duplicate an existing event. Copies all fields except dates and guests. The host must set new dates before publishing.",
        inputSchema: z.object({
          eventId: z.string().describe("The ID of the event to clone"),
        }),
        execute: async ({ eventId }) => {
          const source = await db.query.events.findFirst({
            where: eq(events.id, eventId),
            with: { tags: true },
          });
          if (!source) return { error: "Event not found" };
          if (source.hostId !== userId) return { error: "Not authorized" };

          const newSlug = generateEventSlug(`${source.title} copy`);

          const [cloned] = await db
            .insert(events)
            .values({
              title: `${source.title} (Copy)`,
              slug: newSlug,
              description: source.description,
              richDescription: source.richDescription,
              coverImage: source.coverImage,
              timezone: source.timezone,
              location: source.location,
              locationDetails: source.locationDetails,
              type: source.type,
              visibility: source.visibility,
              capacity: source.capacity,
              requiresApproval: source.requiresApproval,
              categoryId: source.categoryId,
              hostId: userId,
              startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            })
            .returning();

          if (source.tags.length > 0) {
            await db.insert(eventTags).values(
              source.tags.map((t) => ({ eventId: cloned.id, tag: t.tag })),
            );
          }

          return {
            success: true,
            clonedEventId: cloned.id,
            clonedEventSlug: cloned.slug,
            editUrl: `/dashboard/events/${cloned.id}/edit`,
            message: `Duplicated as "${cloned.title}". Please set new dates at /dashboard/events/${cloned.id}/edit`,
          };
        },
      }),

      sendInvitation: tool({
        description: "Send an email invitation to someone for an event.",
        inputSchema: z.object({
          eventId: z.string().describe("The event ID"),
          email: z.string().describe("Email address to invite"),
        }),
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
    stopWhen: stepCountIs(8),
  });
}
