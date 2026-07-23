import { ratelimit } from "@/lib/redis";

/**
 * Best-effort IP-based rate limiting for sensitive/expensive routes. Returns a
 * 429 Response when the caller is over the limit, or null to proceed. No-ops
 * (returns null) when Redis isn't configured, e.g. local dev without Upstash.
 */
export async function checkRateLimit(
  request: Request,
  identifier?: string
): Promise<Response | null> {
  if (!ratelimit) {
    return null;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const key = identifier ? `${identifier}:${ip}` : ip;

  const { success, reset } = await ratelimit.limit(key);
  if (success) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    { message: "Too many requests. Please slow down." },
    { headers: { "Retry-After": String(retryAfter) }, status: 429 }
  );
}
