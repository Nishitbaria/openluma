import { headers } from "next/headers";
import {
  createUploadthing,
  type FileRouter,
  UploadThingError,
} from "uploadthing/server";

const f = createUploadthing();

// Every upload must come from an authenticated session. The file is bound to
// the uploader's id so onUploadComplete can attribute it and the client can't
// forge an upload on behalf of another user.
//
// `auth` is imported lazily (request time only) rather than at module load:
// the root layout imports this file router for extractRouterConfig(), and a
// static `import { auth }` would pull lib/db into the layout's build-time
// module graph, crashing page-data collection when DATABASE_URL isn't present
// in that phase.
async function requireUser() {
  const { auth } = await import("@/lib/auth");
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
