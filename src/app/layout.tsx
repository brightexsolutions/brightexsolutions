import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteLoader } from "@/components/site-loader";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brightexsolutions.com"
  ),
  title: {
    default: "Brightex Solutions",
    template: "%s | Brightex Solutions",
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
    "Brightex Solutions",
  ],
  authors: [{ name: "Brightex Solutions" }],
  creator: "Brightex Solutions",
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://www.brightexsolutions.com",
    siteName: "Brightex Solutions",
    title: "Brightex Solutions",
    description:
      "Nairobi-based digital agency building premium digital experiences that drive growth.",
    images: [
      {
        url: "/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "Brightex Solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brightex Solutions",
    description:
      "Nairobi-based digital agency building premium digital experiences that drive growth.",
    images: ["/og/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://www.brightexsolutions.com",
  },
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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteLoader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
