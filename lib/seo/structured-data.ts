import { formatInTimeZone } from "date-fns-tz";
import { getAppUrl } from "@/lib/app-url";

/**
 * schema.org JSON-LD builders.
 *
 * Google reads structured data — never `og:type` — for event, profile, and
 * breadcrumb rich results, so this is the layer that actually earns rich
 * snippets. Everything resolves URLs through `getAppUrl()` so switching the
 * canonical domain is a single env change.
 */

/** ISO-8601 with a real numeric UTC offset, e.g. `2026-08-08T18:30:00+05:30`. */
const SCHEMA_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ssXXX";

const ATTENDANCE_MODE = {
  hybrid: "https://schema.org/MixedEventAttendanceMode",
  in_person: "https://schema.org/OfflineEventAttendanceMode",
  virtual: "https://schema.org/OnlineEventAttendanceMode",
} as const;

/**
 * Events store `startTime` as a UTC instant plus a separate IANA `timezone`.
 * schema.org wants the event's local wall-clock time carrying that zone's
 * offset, not a bare `Z` — otherwise a 6:30pm Kolkata event reads as 1:00pm.
 */
function toSchemaDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, SCHEMA_DATE_FORMAT);
}

/**
 * schema.org requires absolute URLs. Cover images are either an Uploadthing
 * URL (already absolute) or a bundled preset like `/presets/abstract-1.svg`.
 */
function toAbsoluteUrl(path: string, appUrl: string): string {
  return path.startsWith("/") ? `${appUrl}${path}` : path;
}

export interface EventJsonLdInput {
  capacity: number | null;
  coverImage: string | null;
  description: string | null;
  endTime: Date | null;
  host: { id: string; name: string };
  location: string | null;
  locationDetails: string | null;
  slug: string;
  startTime: Date;
  timezone: string;
  title: string;
  type: "in_person" | "virtual" | "hybrid";
}

export function buildEventJsonLd(event: EventJsonLdInput) {
  const appUrl = getAppUrl();
  const url = `${appUrl}/e/${event.slug}`;
  const description = event.description ?? `Join ${event.title} on OpenLuma.`;

  const location =
    event.type === "virtual"
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          address: event.locationDetails ?? event.location ?? undefined,
          name: event.location ?? "Location to be announced",
        };

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    description,
    endDate: event.endTime
      ? toSchemaDate(event.endTime, event.timezone)
      : undefined,
    eventAttendanceMode: ATTENDANCE_MODE[event.type],
    eventStatus: "https://schema.org/EventScheduled",
    image: event.coverImage
      ? toAbsoluteUrl(event.coverImage, appUrl)
      : `${url}/opengraph-image`,
    location,
    maximumAttendeeCapacity: event.capacity ?? undefined,
    name: event.title,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      url,
    },
    organizer: {
      "@type": "Person",
      name: event.host.name,
      url: `${appUrl}/u/${event.host.id}`,
    },
    startDate: toSchemaDate(event.startTime, event.timezone),
    url,
  };
}

export function buildPersonJsonLd(profile: {
  bio: string | null;
  id: string;
  image: string | null;
  name: string;
}) {
  const appUrl = getAppUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    description: profile.bio ?? undefined,
    image: profile.image ? toAbsoluteUrl(profile.image, appUrl) : undefined,
    name: profile.name,
    url: `${appUrl}/u/${profile.id}`,
  };
}

export function buildOrganizationJsonLd() {
  const appUrl = getAppUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    description:
      "Open-source event management platform with AI-powered event creation.",
    logo: `${appUrl}/icon.svg`,
    name: "OpenLuma",
    sameAs: ["https://github.com/Nishitbaria/openluma"],
    url: appUrl,
  };
}

export function buildWebSiteJsonLd() {
  const appUrl = getAppUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OpenLuma",
    // `/events` implements `?search=` as an ilike title match, so this action
    // maps to a real search surface rather than an aspirational one.
    potentialAction: {
      "@type": "SearchAction",
      "query-input": "required name=search_term_string",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/events?search={search_term_string}`,
      },
    },
    url: appUrl,
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  const appUrl = getAppUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: `${appUrl}${item.path}`,
      name: item.name,
      position: index + 1,
    })),
  };
}
