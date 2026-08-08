import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/seo/brand-mark";

export const size = { height: 180, width: 180 };
export const contentType = "image/png";

// iOS applies its own corner mask to home-screen icons, so the mark is drawn
// square and full-bleed here rather than pre-rounded.
export default function AppleIcon() {
  return new ImageResponse(<BrandMark radius={0} size={size.width} />, {
    ...size,
  });
}
