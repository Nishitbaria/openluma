import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cache } from "react";
import { createSecondaryStorage } from "./auth-secondary-storage";
import { db } from "./db";
import { account, session, user, verification } from "./db/schema";
import { redis } from "./redis";

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
  emailAndPassword: {
    enabled: true,
  },
  ...(redis ? { secondaryStorage: createSecondaryStorage(redis) } : {}),
  rateLimit: {
    // Enabled in all environments (Better Auth defaults this to production
    // only). 20 requests / 10s window per IP across auth endpoints, with a
    // tighter limit on the credential sign-in path.
    customRules: {
      "/sign-in/email": { max: 5, window: 60 },
    },
    enabled: true,
    max: 20,
    storage: redis ? "secondary-storage" : "memory",
    window: 10,
  },
  session: {
    // Redis is an acceleration layer, not the source of truth. Keeping sessions
    // in Postgres lets authentication continue during a Redis outage.
    storeSessionInDatabase: true,
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
  verification: {
    // OAuth state must remain available from Postgres if Redis is unreachable.
    storeInDatabase: true,
  },
});
