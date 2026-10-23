import type { MetadataRoute } from "next";

const SITE_URL = "https://appblueprints.6x7.gr";

// Public pages are open to search engines; the signed-in app and API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
