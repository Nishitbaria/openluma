import type { BetterAuthOptions } from "better-auth";

type RateLimitStorage = NonNullable<
  NonNullable<BetterAuthOptions["rateLimit"]>["customStorage"]
>;

export interface RateLimitRedisClient {
  eval: (script: string, keys: string[], args: unknown[]) => Promise<unknown>;
}

// Count the request and start the window's TTL in one atomic step, so a
// counter can never be left without an expiry. `TTL < 0` also heals counters
// that the previous separate INCR/EXPIRE calls left without one.
const CONSUME_SCRIPT = `local count = redis.call("INCR", KEYS[1])
if redis.call("TTL", KEYS[1]) < 0 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return {count, redis.call("TTL", KEYS[1])}`;

const MAX_LOCAL_KEYS = 10_000;

let hasLoggedRedisFailure = false;

/**
 * Better Auth rate-limit storage backed by Redis. If Redis is unreachable the
 * limit falls back to in-memory counters instead of letting every request
 * through.
 */
export function createRateLimitStorage(
  client: RateLimitRedisClient
): RateLimitStorage {
  // ponytail: per-instance counters during a Redis outage, so the limit loosens
  // by the number of running instances but never switches off.
  const local = new Map<string, { count: number; expiresAt: number }>();

  function consumeLocally(key: string, window: number) {
    const now = Date.now();
    let entry = local.get(key);
    if (!entry || entry.expiresAt <= now) {
      if (local.size >= MAX_LOCAL_KEYS) {
        for (const [k, e] of local) {
          if (e.expiresAt <= now) {
            local.delete(k);
          }
        }
        // Still full: evict the oldest key so memory stays bounded.
        if (local.size >= MAX_LOCAL_KEYS) {
          local.delete(local.keys().next().value as string);
        }
      }
      entry = { count: 0, expiresAt: now + window * 1000 };
      local.set(key, entry);
    }
    entry.count += 1;
    return [entry.count, Math.ceil((entry.expiresAt - now) / 1000)];
  }

  return {
    consume: async (key, rule) => {
      let count: number;
      let ttl: number;
      try {
        [count, ttl] = (await client.eval(
          CONSUME_SCRIPT,
          [key],
          [rule.window]
        )) as [number, number];
      } catch (error) {
        if (!hasLoggedRedisFailure) {
          console.error(
            "Auth rate-limit Redis is unavailable; using in-memory limits.",
            error
          );
          hasLoggedRedisFailure = true;
        }
        [count, ttl] = consumeLocally(key, rule.window);
      }
      return count <= rule.max
        ? { allowed: true, retryAfter: null }
        : { allowed: false, retryAfter: Math.max(ttl, 1) };
    },
    // Better Auth only uses get/set for storages without `consume`.
    get: async () => null,
    set: async () => undefined,
  };
}
