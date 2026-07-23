import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// biome-ignore lint/performance/noNamespaceImport: drizzle's relational query builder requires the full schema module as a single object; enumerating each of the 30+ schema exports as named imports would need to be kept in lockstep with lib/db/schema.ts and is more error-prone than the namespace import.
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// In dev, Next.js hot-reload re-executes modules, creating new connection pools
// each time. Cache on globalThis to reuse the same pool across reloads.
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const client = globalForDb.pgClient ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
