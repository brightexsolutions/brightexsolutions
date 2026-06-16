import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteLoader } from "@/components/site-loader";
import { Analytics } from "@vercel/analytics/next";
import { SITE_NAME, SITE_URL, GOOGLE_SITE_VERIFICATION } from "@/lib/constants";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Nairobi-based digital agency building custom websites, platforms, ERP systems, and AI-powered tools for businesses across Kenya and East Africa.",
  keywords: [
    "web development Kenya",
    "digital agency Nairobi",
    "custom software Kenya",
    "ERP Kenya",
    "UI UX design Nairobi",
    "SEO Kenya",
    "web developer Nairobi",
    "software company Kenya",
    "Brightex Solutions",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description:
      "Nairobi-based digital agency building premium digital experiences that drive growth.",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Brightex Solutions — Digital Agency Nairobi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description:
      "Nairobi-based digital agency building premium digital experiences that drive growth.",
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  ...(GOOGLE_SITE_VERIFICATION && { verification: { google: GOOGLE_SITE_VERIFICATION } }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${plusJakartaSans.variable}`}
    >
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteLoader />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
