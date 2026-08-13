import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.IS_PROD === "true"
    ? "https://withink.me"
    : "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
