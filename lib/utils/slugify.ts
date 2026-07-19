import { customAlphabet } from "nanoid";

// Lowercase, URL-safe suffix so generated slugs always match the slug format
// enforced by the event validator (nanoid's default alphabet includes
// uppercase letters and `_`, which would fail that check).
const slugSuffix = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

export function generateEventSlug(title: string): string {
  const base =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "event";

  return `${base}-${slugSuffix()}`;
}
