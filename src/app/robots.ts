import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brightexsolutions.co.ke";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/work/", "/team/", "/api/", "/auth/", "/join"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
