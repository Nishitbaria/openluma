import { renderBrandOgImage } from "@/lib/seo/brand-og-image";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/event-og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Discover events on OpenLuma";

export default function Image() {
  return renderBrandOgImage({
    subtitle: "Browse upcoming events hosted on OpenLuma.",
    title: "Discover events.",
  });
}
