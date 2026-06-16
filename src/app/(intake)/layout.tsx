import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

const OG_IMAGE = `${SITE_URL}/opengraph-image`;

export const metadata: Metadata = {
  title: "Project Intake | Brightex Solutions",
  description: "Share your project requirements with the Brightex team.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Project Intake | Brightex Solutions",
    description: "Tell us about your project — we'll get back to you within 1–2 business days.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Brightex Solutions" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
  },
};

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
