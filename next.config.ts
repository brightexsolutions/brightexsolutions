import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // React dev mode needs unsafe-eval for error overlay / stack reconstruction
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://va.vercel-scripts.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://image.thum.io",
      "connect-src 'self' https://*.supabase.co https://wa.me https://vitals.vercel-insights.com",
      "frame-src 'self' blob:",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "brightexsolutions.vercel.app" }],
        destination: "https://www.brightexsolutions.co.ke/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "brightexsolutions.netlify.app" }],
        destination: "https://www.brightexsolutions.co.ke/:path*",
        permanent: true,
      },
      // Legacy page redirects — both merged into /work
      { source: "/projects", destination: "/work#projects", permanent: true },
      { source: "/products", destination: "/work#products", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
