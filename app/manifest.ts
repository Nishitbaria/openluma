import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0a0a0a",
    categories: ["productivity", "social", "events"],
    description:
      "Create, manage, and discover events. Open source alternative to Luma with AI-powered event management.",
    display: "standalone",
    icons: [
      { sizes: "any", src: "/icon.svg", type: "image/svg+xml" },
      { sizes: "32x32", src: "/icon", type: "image/png" },
      { sizes: "180x180", src: "/apple-icon", type: "image/png" },
    ],
    name: "OpenLuma — Open Source Event Platform",
    short_name: "OpenLuma",
    start_url: "/",
    theme_color: "#0a0a0a",
  };
}
