import type { MetadataRoute } from "next";

const SITE_URL = "https://appblueprints.6x7.gr";

// Only real public pages belong here.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/"];
  return routes.map((route) => ({
    url: route === "/" ? SITE_URL : `${SITE_URL}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.5,
  }));
}
