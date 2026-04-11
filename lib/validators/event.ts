import { z } from "zod/v4";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  timezone: z.string().default("UTC"),
  location: z.string().optional(),
  locationDetails: z.string().optional(),
  type: z.enum(["in_person", "virtual", "hybrid"]).default("in_person"),
  visibility: z.enum(["public", "private"]).default("public"),
  capacity: z.number().int().positive().optional(),
  requiresApproval: z.boolean().default(false),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
