import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { cache } from "react";
import { createRateLimitStorage } from "./auth-rate-limit-storage";
import { db } from "./db";
import { account, session, user, verification } from "./db/schema";
import { sendVerificationEmail } from "./email";
import { redis } from "./redis";
import { uploadedImageUrl } from "./validators/image";

// Endpoints that let the caller set their own avatar URL. OAuth avatars come
// from the provider, not the request, so they aren't checked here.
const USER_IMAGE_PATHS = new Set(["/sign-up/email", "/update-user"]);

/** Per-request cached session lookup — safe to call from layout + page + components. */
export const getSession = cache((hdrs: Headers) =>
  auth.api.getSession({ headers: hdrs })
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      account,
      session,
      user,
      verification,
    },
  }),
  hooks: {
    // Same allowlist as /api/profile: an avatar is shown to other users, so it
    // must come from our upload storage (or be cleared with null).
    before: createAuthMiddleware(async (ctx) => {
      const image = ctx.body?.image;
      if (
        USER_IMAGE_PATHS.has(ctx.path) &&
        image != null &&
        !uploadedImageUrl.safeParse(image).success
      ) {
        throw new APIError("BAD_REQUEST", {
          message: "Image must be an allowed upload URL",
        });
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    // Invitations and private-event access are matched by email, so an
    // account must prove it owns its address before it can get a session.
    requireEmailVerification: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user: unverifiedUser, url, token }) => {
      await sendVerificationEmail(unverifiedUser.email, url, token);
    },
  },
  // No secondaryStorage: sessions are read from Postgres only. A Redis session
  // cache served revoked sessions whenever a cache delete failed.
  rateLimit: {
    // Enabled in all environments (Better Auth defaults this to production
    // only). 20 requests / 10s window per IP across auth endpoints, with a
    // tighter limit on the credential sign-in path.
    customRules: {
      "/sign-in/email": { max: 5, window: 60 },
    },
    ...(redis
      ? { customStorage: createRateLimitStorage(redis) }
      : { storage: "memory" }),
    enabled: true,
    max: 20,
    window: 10,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      enabled: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS
    ? process.env.TRUSTED_ORIGINS.split(",")
    : [],
});
