import { headers } from "next/headers";
import {
  createUploadthing,
  type FileRouter,
  UploadThingError,
} from "uploadthing/server";
import { auth } from "@/lib/auth";

const f = createUploadthing();

// Every upload must come from an authenticated session. The file is bound to
// the uploader's id so onUploadComplete can attribute it and the client can't
// forge an upload on behalf of another user.
async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new UploadThingError({
      code: "FORBIDDEN",
      message: "You must be signed in to upload",
    });
  }
  return { userId: session.user.id };
}

export const ourFileRouter = {
  eventCoverImage: f({
    image: { maxFileCount: 1, maxFileSize: "4MB" },
  })
    .middleware(() => requireUser())
    .onUploadComplete(({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      url: file.ufsUrl,
    })),
  profileAvatar: f({
    image: { maxFileCount: 1, maxFileSize: "2MB" },
  })
    .middleware(() => requireUser())
    .onUploadComplete(({ file, metadata }) => ({
      uploadedBy: metadata.userId,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
