import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderEventOgImage,
} from "@/lib/seo/event-og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Event on OpenLuma";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return await renderEventOgImage(slug);
}
