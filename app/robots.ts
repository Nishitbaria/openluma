import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      allow: "/",
      disallow: [
        "/dashboard",
        "/ticket",
        "/api",
        "/sign-in",
        "/sign-up",
        "/invitation-error",
      ],
      userAgent: "*",
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
