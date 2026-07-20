import { isStepCount, ToolLoopAgent, tool } from "ai";
import { and, desc, eq, gte, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import { model } from "@/lib/ai/model";
import { db } from "@/lib/db";
import { events, eventTags, invitations, rsvps, user } from "@/lib/db/schema";
import { generateEventSlug } from "@/lib/utils/slugify";

export function createEventAgent(userId: string) {
  return new ToolLoopAgent({
    id: "event-agent",
    instructions: `You are the Event Management Agent for OpenLuma.
You handle event operations: creating, editing, searching, viewing events, managing RSVPs, and attendees.
Deleting events and sending invitations are handled separately by the orchestrator — do NOT attempt those.

IMPORTANT: You do NOT know the current date from your training. ALWAYS call the getCurrentDate tool first before creating events or interpreting relative dates like "tomorrow", "next Friday", "this weekend", etc.

RULES:
- ALWAYS call getCurrentDate before creating or searching events with relative dates.
- Never fabricate data — always use your tools to query real information.
- When creating events, ask for missing required fields (title, start time) before calling the tool.
- By default, new events require host approval for RSVPs (requiresApproval defaults to true). Only pass requiresApproval: false if the user explicitly asks for open/auto-approved RSVPs.
- Format dates in a human-friendly way (e.g., "Friday, April 18 at 6:00 PM").
- Be concise but helpful.
- When you successfully create an event, share the event link: /e/{eventSlug}
- When listing events, format them as a clean numbered list.`,
    model,
    stopWhen: isStepCount(8),
    tools: {
      cloneEvent: tool({
        description:
          "Duplicate an existing event. Copies all fields except dates and guests. The host must set new dates before publishing.",
        execute: async ({ eventId }) => {
          const source = await db.query.events.findFirst({
            where: eq(events.id, eventId),
            with: { tags: true },
          });
          if (!source) {
            return { error: "Event not found" };
          }
          if (source.hostId !== userId) {
            return { error: "Not authorized" };
          }

          const newSlug = generateEventSlug(`${source.title} copy`);

          const [cloned] = await db
            .insert(events)
            .values({
              capacity: source.capacity,
              categoryId: source.categoryId,
              coverImage: source.coverImage,
              description: source.description,
              hostId: userId,
              location: source.location,
              locationDetails: source.locationDetails,
              requiresApproval: source.requiresApproval,
              richDescription: source.richDescription,
              slug: newSlug,
              startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              timezone: source.timezone,
              title: `${source.title} (Copy)`,
              type: source.type,
              visibility: source.visibility,
            })
            .returning();

          if (source.tags.length > 0) {
            await db
              .insert(eventTags)
              .values(
                source.tags.map((t) => ({ eventId: cloned.id, tag: t.tag }))
              );
          }

          return {
            clonedEventId: cloned.id,
            clonedEventSlug: cloned.slug,
            editUrl: `/dashboard/events/${cloned.id}/edit`,
            message: `Duplicated as "${cloned.title}". Please set new dates at /dashboard/events/${cloned.id}/edit`,
            success: true,
          };
        },
        inputSchema: z.object({
          eventId: z.string().describe("The ID of the event to clone"),
        }),
      }),

      createEvent: tool({
        description:
          "Create a new event. Requires at least title and startTime.",
        execute: async (params) => {
          const [event] = await db
            .insert(events)
            .values({
              capacity: params.capacity,
              description: params.description,
              endTime: params.endTime ? new Date(params.endTime) : null,
              hostId: userId,
              location: params.location,
              requiresApproval: params.requiresApproval ?? true,
              slug: generateEventSlug(params.title),
              startTime: new Date(params.startTime),
              title: params.title,
              type: params.type ?? "in_person",
              visibility: params.visibility ?? "public",
            })
            .returning();
          return {
            event: {
              capacity: event.capacity,
              description: event.description,
              endTime: event.endTime,
              id: event.id,
              location: event.location,
              requiresApproval: event.requiresApproval,
              slug: event.slug,
              startTime: event.startTime,
              title: event.title,
              type: event.type,
              visibility: event.visibility,
            },
            success: true,
          };
        },
        inputSchema: z.object({
          capacity: z.number().optional(),
          description: z.string().optional().describe("Event description"),
          endTime: z
            .string()
            .optional()
            .describe("ISO 8601 datetime for event end"),
          location: z
            .string()
            .optional()
            .describe("Event location or virtual link"),
          requiresApproval: z
            .boolean()
            .optional()
            .describe(
              "Whether RSVPs require host approval. Defaults to true (organizer must approve each RSVP). Only set this to false if the user explicitly asks for open/auto-approved RSVPs."
            ),
          startTime: z.string().describe("ISO 8601 datetime for event start"),
          title: z.string().describe("Event title"),
          type: z.enum(["in_person", "virtual", "hybrid"]).optional(),
          visibility: z.enum(["public", "private"]).optional(),
        }),
      }),

      editEvent: tool({
        description: "Edit an event. Only the host can edit.",
        execute: async ({ eventId, ...updates }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) {
            return { error: "Event not found" };
          }
          if (event.hostId !== userId) {
            return { error: "Not authorized" };
          }

          const dbUpdates: Record<string, unknown> = {
            updatedAt: new Date(),
          };
          if (updates.title) {
            dbUpdates.title = updates.title;
          }
          if (updates.description) {
            dbUpdates.description = updates.description;
          }
          if (updates.startTime) {
            dbUpdates.startTime = new Date(updates.startTime);
          }
          if (updates.endTime) {
            dbUpdates.endTime = new Date(updates.endTime);
          }
          if (updates.location) {
            dbUpdates.location = updates.location;
          }
          if (updates.capacity) {
            dbUpdates.capacity = updates.capacity;
          }
          if (updates.visibility) {
            dbUpdates.visibility = updates.visibility;
          }

          const [updated] = await db
            .update(events)
            .set(dbUpdates)
            .where(eq(events.id, eventId))
            .returning();

          return {
            event: { id: updated.id, title: updated.title },
            success: true,
          };
        },
        inputSchema: z.object({
          capacity: z.number().optional(),
          description: z.string().optional(),
          endTime: z.string().optional(),
          eventId: z.string().describe("The event ID to edit"),
          location: z.string().optional(),
          startTime: z.string().optional(),
          title: z.string().optional(),
          visibility: z.enum(["public", "private"]).optional(),
        }),
      }),

      getAttendees: tool({
        description:
          "Get the attendee list for an event. Only the host can see attendee emails.",
        execute: async ({ eventId }) => {
          const event = await db.query.events.findFirst({
            columns: { hostId: true, id: true, visibility: true },
            where: eq(events.id, eventId),
          });
          if (!event) {
            return { error: "Event not found" };
          }
          if (event.visibility === "private" && event.hostId !== userId) {
            return {
              error: "Not authorized to view attendees of this private event",
            };
          }
          const isHost = event.hostId === userId;
          const eventRsvps = await db.query.rsvps.findMany({
            where: eq(rsvps.eventId, eventId),
            with: {
              user: { columns: { email: true, id: true, name: true } },
            },
          });
          return {
            approved: eventRsvps.filter((r) => r.status === "approved").length,
            attendees: eventRsvps.map((r) => ({
              email: isHost ? r.user.email : undefined,
              name: r.user.name,
              status: r.status,
            })),
            pending: eventRsvps.filter((r) => r.status === "pending").length,
            total: eventRsvps.length,
          };
        },
        inputSchema: z.object({
          eventId: z.string().describe("The event ID"),
        }),
      }),
      getCurrentDate: tool({
        description:
          "Get the current date and time. ALWAYS call this before creating events or interpreting relative dates like 'tomorrow', 'next Friday', etc.",
        execute: () => {
          const now = new Date();
          return {
            date: now.toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              weekday: "long",
              year: "numeric",
            }),
            iso: now.toISOString(),
            time: now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
        },
        inputSchema: z.object({}),
      }),

      getEventDetails: tool({
        description: "Get full details of a specific event.",
        execute: async ({ eventId }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
            with: {
              host: { columns: { id: true, name: true } },
              rsvps: {
                with: {
                  user: { columns: { email: true, id: true, name: true } },
                },
              },
              tags: true,
            },
          });
          if (!event) {
            return { error: "Event not found" };
          }
          if (event.visibility === "private" && event.hostId !== userId) {
            return { error: "Not authorized to view this private event" };
          }
          // Only include attendee emails for the host
          const isHost = event.hostId === userId;
          return {
            event: {
              ...event,
              rsvpSummary: {
                approved: event.rsvps.filter((r) => r.status === "approved")
                  .length,
                pending: event.rsvps.filter((r) => r.status === "pending")
                  .length,
                total: event.rsvps.length,
              },
              rsvps: isHost
                ? event.rsvps
                : event.rsvps.map((r) => ({
                    ...r,
                    user: { id: r.user.id, name: r.user.name },
                  })),
            },
          };
        },
        inputSchema: z.object({
          eventId: z.string().describe("The event ID"),
        }),
      }),

      listMyEvents: tool({
        description: "List events hosted by the current user.",
        execute: async ({ upcoming }) => {
          const conditions = [eq(events.hostId, userId)];
          if (upcoming) {
            conditions.push(gte(events.startTime, new Date()));
          }

          const results = await db.query.events.findMany({
            columns: {
              id: true,
              location: true,
              slug: true,
              startTime: true,
              title: true,
              type: true,
              visibility: true,
            },
            limit: 20,
            orderBy: [desc(events.startTime)],
            where: and(...conditions),
          });
          return { events: results, total: results.length };
        },
        inputSchema: z.object({
          upcoming: z
            .boolean()
            .optional()
            .describe("Only show upcoming events"),
        }),
      }),

      searchEvents: tool({
        description: "Search public events by keyword or date.",
        execute: async (params) => {
          const conditions = [eq(events.visibility, "public")];
          if (params.query) {
            conditions.push(ilike(events.title, `%${params.query}%`));
          }
          if (params.startAfter) {
            conditions.push(gte(events.startTime, new Date(params.startAfter)));
          }

          const results = await db.query.events.findMany({
            columns: {
              id: true,
              location: true,
              slug: true,
              startTime: true,
              title: true,
              type: true,
            },
            limit: 10,
            orderBy: [desc(events.startTime)],
            where: and(...conditions),
            with: {
              host: { columns: { id: true, name: true } },
            },
          });
          return { events: results, total: results.length };
        },
        inputSchema: z.object({
          query: z.string().optional().describe("Search keyword"),
          startAfter: z
            .string()
            .optional()
            .describe("ISO date - only events after this date"),
        }),
      }),

      submitRsvp: tool({
        description: "RSVP to an event on behalf of the user.",
        execute: async ({ eventId, message }) => {
          const event = await db.query.events.findFirst({
            where: eq(events.id, eventId),
          });
          if (!event) {
            return { error: "Event not found" };
          }

          if (event.visibility === "private" && event.hostId !== userId) {
            const currentUser = await db.query.user.findFirst({
              columns: { email: true },
              where: eq(user.id, userId),
            });
            const invitation = currentUser
              ? await db.query.invitations.findFirst({
                  where: and(
                    eq(invitations.eventId, eventId),
                    eq(invitations.email, currentUser.email),
                    eq(invitations.status, "accepted")
                  ),
                })
              : null;
            if (!invitation) {
              return {
                error:
                  "This is a private event. You need an accepted invitation to RSVP.",
              };
            }
          }

          const existing = await db.query.rsvps.findFirst({
            where: and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)),
          });
          if (existing) {
            return { error: "Already RSVP'd", rsvp: existing };
          }

          const status = event.requiresApproval ? "pending" : "approved";

          const [rsvp] = await db
            .insert(rsvps)
            .values({ eventId, message, status, userId })
            .returning();

          return { rsvp: { id: rsvp.id, status: rsvp.status }, success: true };
        },
        inputSchema: z.object({
          eventId: z.string().describe("The event ID to RSVP to"),
          message: z
            .string()
            .optional()
            .describe("Optional message to the host"),
        }),
      }),
    },
  });
}
