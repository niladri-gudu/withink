import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ROUTES.PUBLIC.HOME,
    ROUTES.PUBLIC.TERMS,
    ROUTES.PUBLIC.PRIVACY,
    ROUTES.AUTH.LOGIN,
    ROUTES.AUTH.REGISTER,
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === ROUTES.PUBLIC.HOME ? 1 : 0.5,
  }));
}
