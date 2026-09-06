import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doesitexist.app";

/**
 * Next.js App Router sitemap — automatically served at /sitemap.xml
 *
 * Extend this array as programmatic SEO pages are added
 * (e.g. /ideas/[slug] landing pages for top searched ideas).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}
