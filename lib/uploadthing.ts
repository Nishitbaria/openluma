import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  eventCoverImage: f({
    image: { maxFileCount: 1, maxFileSize: "4MB" },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
  profileAvatar: f({
    image: { maxFileCount: 1, maxFileSize: "2MB" },
  }).onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
