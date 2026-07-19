import { z } from "zod/v4";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  richDescription: z.string().optional(),
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

export const updateEventSchema = createEventSchema
  .extend({
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(100, "Slug must be at most 100 characters")
      // Accept the character set actually used by generated slugs, which
      // includes uppercase letters and underscores from legacy nanoid suffixes,
      // so existing events remain editable. New user input is lowercased by the
      // form's slug field before it reaches here.
      .regex(/^[A-Za-z0-9_-]+$/, {
        message: "Slug can only contain letters, numbers, hyphens, underscores",
      })
      .optional(),
  })
  .partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
