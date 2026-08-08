import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/seo/brand-mark";

export const size = { height: 32, width: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMark radius={7} size={size.width} />, {
    ...size,
  });
}
