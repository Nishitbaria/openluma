import { getIp } from "@better-auth/core/utils/ip";
import type { Ratelimit } from "@upstash/ratelimit";
import { ratelimit } from "@/lib/redis";

let warnedUnconfigured = false;

/**
 * Rate limiting for sensitive/expensive routes. Returns a 429 Response when
 * the caller is over the limit, a 503 when the limiter can't be reached, or
 * null to proceed.
 *
 * Signed-in callers are keyed by user id alone, so rotating IPs doesn't reset
 * their budget. Anonymous callers are keyed by the client IP as resolved by
 * Better Auth, which ignores spoofable multi-hop X-Forwarded-For chains.
 */
export async function checkRateLimit(
  request: Request,
  scope: string,
  options: { limiter?: Ratelimit | null; userId?: string } = {}
): Promise<Response | null> {
  const limiter = options.limiter === undefined ? ratelimit : options.limiter;
  if (!limiter) {
    // Local dev without Upstash. In production this disables the limits, so
    // make the misconfiguration loud.
    if (process.env.NODE_ENV === "production" && !warnedUnconfigured) {
      warnedUnconfigured = true;
      console.error("Rate limiting is disabled: Upstash Redis is not set up.");
    }
    return null;
  }

  const key = options.userId
    ? `${scope}:user:${options.userId}`
    : `${scope}:ip:${getIp(request, {}) ?? "unknown"}`;

  let result: Awaited<ReturnType<Ratelimit["limit"]>>;
  try {
    result = await limiter.limit(key);
  } catch (err) {
    console.error("Rate limiter unavailable:", err);
    return Response.json(
      { message: "Service temporarily unavailable. Please try again." },
      { headers: { "Retry-After": "5" }, status: 503 }
    );
  }

  if (result.success) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return Response.json(
    { message: "Too many requests. Please slow down." },
    { headers: { "Retry-After": String(retryAfter) }, status: 429 }
  );
}
