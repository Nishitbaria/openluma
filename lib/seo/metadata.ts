import type { Metadata } from "next";

/**
 * Builds per-page metadata without losing the site-wide defaults.
 *
 * Next merges `metadata` **shallowly, per top-level key** — a page that exports
 * its own `openGraph` object replaces the root layout's entirely, silently
 * dropping `siteName`, `locale`, `type`, and `images`. Same for `twitter` and
 * its `card`. So every page-level card has to restate them, and this is the one
 * place that does it.
 *
 * `images` is optional: a segment that ships its own `opengraph-image` file
 * (`/events`, `/e/[slug]`) gets wired up automatically and should omit it.
 * Segments relying on the root card must pass it explicitly — file-convention
 * images resolved at an ancestor segment are overwritten by the page's
 * `openGraph` just like every other key.
 */

const SITE_NAME = "OpenLuma";
export const SITE_TITLE = "OpenLuma | Open Source Event Platform";
const OG_LOCALE = "en_US";

interface PageMetadataInput {
  description: string;
  /** Omit when the segment has its own `opengraph-image` file. */
  images?: string[];
  ogType?: "website" | "profile";
  /** Root-relative, e.g. `/events`. Used for both canonical and `og:url`. */
  path: string;
  /** Omit to use the untemplated site title (`SITE_TITLE`). */
  title?: string;
  twitterCard?: "summary" | "summary_large_image";
}

export function buildPageMetadata({
  description,
  images,
  ogType = "website",
  path,
  title,
  twitterCard = "summary_large_image",
}: PageMetadataInput): Metadata {
  // An explicit `title: undefined` wipes the inherited title instead of
  // falling back to the root default, and `openGraph`/`twitter` replace the
  // root's objects wholesale — so always emit a concrete title.
  const socialTitle = title ?? SITE_TITLE;

  // `images` is spread conditionally rather than passed as `undefined`: Next
  // treats the key's mere presence as an override and stops merging in the
  // segment's `opengraph-image` file.
  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      ...(images ? { images } : {}),
      locale: OG_LOCALE,
      siteName: SITE_NAME,
      title: socialTitle,
      type: ogType,
      url: path,
    },
    title: title ?? { absolute: SITE_TITLE },
    twitter: {
      card: twitterCard,
      description,
      ...(images ? { images } : {}),
      title: socialTitle,
    },
  };
}
