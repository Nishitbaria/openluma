import { renderBrandOgImage } from "@/lib/seo/brand-og-image";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/event-og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "OpenLuma — Open Source Event Platform";

export default function Image() {
  return renderBrandOgImage({
    subtitle:
      "Create, manage, and discover events. The open source alternative to Luma.",
    title: "Events, end to end.",
  });
}
