export interface AuthRedisClient {
  del: (key: string) => Promise<unknown>;
  expire: (key: string, ttl: number) => Promise<unknown>;
  get: <T>(key: string) => Promise<T | null>;
  incr: (key: string) => Promise<number>;
  set: (
    key: string,
    value: string,
    options?: { ex: number }
  ) => Promise<unknown>;
}

let hasLoggedRedisFailure = false;

async function withRedisFallback<T>(
  fallback: T,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!hasLoggedRedisFailure) {
      console.error(
        "Auth Redis is unavailable; falling back to database-backed auth.",
        error
      );
      hasLoggedRedisFailure = true;
    }
    return fallback;
  }
}

export function createSecondaryStorage(client: AuthRedisClient) {
  return {
    delete: (key: string) =>
      withRedisFallback(undefined, () => client.del(key).then(() => undefined)),
    get: (key: string) =>
      withRedisFallback<string | null>(null, () => client.get<string>(key)),
    increment: (key: string, ttl: number) =>
      withRedisFallback(1, async () => {
        const value = await client.incr(key);
        if (value === 1) {
          await client.expire(key, ttl);
        }
        return value;
      }),
    set: (key: string, value: string, ttl?: number) =>
      withRedisFallback(undefined, () =>
        (ttl
          ? client.set(key, value, { ex: ttl })
          : client.set(key, value)
        ).then(() => undefined)
      ),
  };
}
