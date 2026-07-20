import { z } from "zod/v4";

export const sendInvitationSchema = z.object({
  email: z.email(),
  eventId: z.string().min(1),
});

export const bulkSendInvitationSchema = z.object({
  emails: z.array(z.email()).min(1).max(100),
  eventId: z.string().min(1),
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type BulkSendInvitationInput = z.infer<typeof bulkSendInvitationSchema>;
