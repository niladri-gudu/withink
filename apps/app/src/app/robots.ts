import type { MetadataRoute } from "next";
import { siteConfig } from "@withink/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/login",
        "/register",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
      ],
      disallow: [
        "/",
        "/api/",
        "/settings/",
        "/media/",
        "/flashbacks/",
        "/insights/",
        "/entries/",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
