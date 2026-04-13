import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cache } from "react";
import { db } from "./db";
import * as schema from "./db/schema";

/** Per-request cached session lookup — safe to call from layout + page + components. */
export const getSession = cache(async (hdrs: Headers) => {
  return auth.api.getSession({ headers: hdrs });
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
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
