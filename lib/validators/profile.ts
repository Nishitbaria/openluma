import { z } from "zod/v4";
import { uploadedImageUrl } from "@/lib/validators/image";

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  image: uploadedImageUrl.optional(),
  name: z.string().trim().min(1).max(100).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
