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

// timeout: 0 turns off Upstash's fail-open timeout (it allows the request when
// Redis is slow); errors reach checkRateLimit, which rejects instead.
export const ratelimit = redis
  ? new Ratelimit({
      analytics: true,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      redis,
      timeout: 0,
    })
  : null;

// Each chat turn is a paid LLM call, so it gets a tighter per-user budget.
export const chatRatelimit = redis
  ? new Ratelimit({
      analytics: true,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "ratelimit:chat",
      redis,
      timeout: 0,
    })
  : null;
