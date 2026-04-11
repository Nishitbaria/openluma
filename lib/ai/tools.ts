import { tool } from "ai";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { events, rsvps, invitations } from "@/lib/db/schema";
import { eq, and, ilike, gte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendInvitationEmail } from "@/lib/email";

export function createTools(userId: string) {
  return {
    createEvent: tool({
      description:
        "Create a new event. Requires at least title and startTime.",
      inputSchema: z.object({
        title: z.string().describe("Event title"),
        description: z.string().optional().describe("Event description"),
        startTime: z.string().describe("ISO 8601 datetime for event start"),
        endTime: z.string().optional().describe("ISO 8601 datetime for event end"),
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
        return { success: true, event };
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
        });
        return { events: results };
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
        });
        return { events: results };
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
        return { event };
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

        const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
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

        return { success: true, event: updated };
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
        return { success: true, message: `Event "${event.title}" deleted` };
      },
    }),

    submitRsvp: tool({
      description: "RSVP to an event on behalf of the user.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID to RSVP to"),
        message: z.string().optional().describe("Optional message to the host"),
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

        return { success: true, rsvp };
      },
    }),

    getAttendees: tool({
      description: "Get the attendee list for an event.",
      inputSchema: z.object({
        eventId: z.string().describe("The event ID"),
      }),
      execute: async ({ eventId }) => {
        const eventRsvps = await db.query.rsvps.findMany({
          where: eq(rsvps.eventId, eventId),
          with: {
            user: { columns: { id: true, name: true, email: true } },
          },
        });
        return {
          attendees: eventRsvps,
          total: eventRsvps.length,
          approved: eventRsvps.filter((r) => r.status === "approved").length,
          pending: eventRsvps.filter((r) => r.status === "pending").length,
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
        return { success: true, invitation };
      },
    }),
  };
}
