import { z } from "zod/v4";

export const submitRsvpSchema = z.object({
  eventId: z.string().min(1),
  message: z.string().max(500).optional(),
});

export const updateRsvpStatusSchema = z.object({
  rsvpId: z.string().min(1),
  status: z.enum(["approved", "rejected", "waitlisted"]),
});

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;
export type UpdateRsvpStatusInput = z.infer<typeof updateRsvpStatusSchema>;
