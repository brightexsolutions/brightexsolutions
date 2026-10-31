import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brightexsolutions.co.ke";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/portal", "/team/", "/api/", "/auth/", "/join", "/intake", "/updates/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
