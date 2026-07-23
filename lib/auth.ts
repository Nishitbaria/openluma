import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cache } from "react";
import { db } from "./db";
import { account, session, user, verification } from "./db/schema";
import { redis } from "./redis";

/** Per-request cached session lookup — safe to call from layout + page + components. */
export const getSession = cache((hdrs: Headers) =>
  auth.api.getSession({ headers: hdrs })
);

// Back rate limiting (and session lookups) with Redis so limits hold across
// serverless instances. Without secondary storage, Better Auth's limiter is
// in-memory and resets on every cold start — useless against brute force.
function createSecondaryStorage(client: NonNullable<typeof redis>) {
  return {
    delete: (key: string) => client.del(key).then(() => undefined),
    get: (key: string) => client.get<string>(key),
    // Atomic increment for rate-limit counters — TTL applied only on
    // creation so the window expires a fixed time after first hit.
    increment: async (key: string, ttl: number) => {
      const value = await client.incr(key);
      if (value === 1) {
        await client.expire(key, ttl);
      }
      return value;
    },
    set: (key: string, value: string, ttl?: number) =>
      (ttl
        ? client.set(key, value, { ex: ttl })
        : client.set(key, value)
      ).then(() => undefined),
  };
}

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
