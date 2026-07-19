/**
 * Resolves the public base URL of the app.
 *
 * Prefers `NEXT_PUBLIC_APP_URL`. Falls back to localhost only in development;
 * in any other environment a missing URL is a misconfiguration and fails fast
 * so header, CTA, and ticket links never point at the wrong origin.
 */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  throw new Error(
    "NEXT_PUBLIC_APP_URL is not set. Configure it for non-development environments.",
  );
}
