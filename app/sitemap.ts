import type { MetadataRoute } from "next";
import { getCanonicalSiteOrigin } from "@/lib/site-url";

const staticRoutes = [
  "",
  "/collection",
  "/contests",
  "/packs",
  "/rewards",
  "/docs",
  "/twitter",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getCanonicalSiteOrigin();

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
  }));
}
