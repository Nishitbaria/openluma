import { z } from "zod/v4";

// Hosts we accept image URLs from. These match the remotePatterns allowlist in
// next.config.ts — an image URL persisted to the DB must originate from our
// own Uploadthing storage, never an attacker-controlled origin.
const ALLOWED_UPLOAD_HOSTS = ["utfs.io", "uploadthing.com", "ufs.sh"] as const;

function isAllowedUploadHost(hostname: string): boolean {
  return ALLOWED_UPLOAD_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
}

/**
 * An image reference that is safe to persist: either an https URL from one of
 * our trusted upload hosts, or an app-local relative path (e.g. the bundled
 * `/presets/*.svg` cover images). Anything else — arbitrary external URLs,
 * `javascript:`/`data:` schemes, protocol-relative URLs — is rejected.
 */
export const uploadedImageUrl = z.string().refine(
  (value) => {
    // App-local asset: a single-slash root-relative path, not "//host" (which
    // browsers treat as protocol-relative and would fetch cross-origin).
    if (value.startsWith("/") && !value.startsWith("//")) {
      return true;
    }
    try {
      const url = new URL(value);
      return url.protocol === "https:" && isAllowedUploadHost(url.hostname);
    } catch {
      return false;
    }
  },
  { message: "Image must be an allowed upload URL or a local asset path" }
);
