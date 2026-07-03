import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/settings/", "/media/", "/flashbacks/", "/insights/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
