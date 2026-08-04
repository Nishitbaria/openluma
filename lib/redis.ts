import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!(url && token)) {
    return null;
  }

  return new Redis({
    retry: false,
    signal: () => AbortSignal.timeout(2000),
    token,
    url,
  });
}

export const redis = createRedis();

export const ratelimit = redis
  ? new Ratelimit({
      analytics: true,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      redis,
    })
  : null;
