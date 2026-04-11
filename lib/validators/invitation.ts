import { z } from "zod/v4";

export const sendInvitationSchema = z.object({
  eventId: z.string().min(1),
  email: z.email(),
});

export const bulkSendInvitationSchema = z.object({
  eventId: z.string().min(1),
  emails: z.array(z.email()).min(1).max(100),
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type BulkSendInvitationInput = z.infer<typeof bulkSendInvitationSchema>;
