import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { ProcessSection } from "@/components/public/process-section";
import { ClientsSection } from "@/components/public/clients-section";
import { WhySection } from "@/components/public/why-section";
import {
  SITE_NAME,
  SITE_URL,
  BUSINESS_PHONE,
  BUSINESS_EMAIL,
  BUSINESS_CITY,
  BUSINESS_COUNTRY,
  SOCIAL_FACEBOOK,
  SOCIAL_INSTAGRAM,
  SOCIAL_TIKTOK,
  SOCIAL_LINKEDIN,
  SOCIAL_TWITTER,
} from "@/lib/constants";

export const revalidate = 3600;

type HeroAnnouncement = { id: string; title: string; body?: string | null; cta_label?: string | null; cta_url?: string | null } | null;

async function getHeroAnnouncement(): Promise<HeroAnnouncement> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, cta_label, cta_url")
      .eq("active", true)
      .contains("display_location", ["home_hero"])
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Technology Consultancy and Software Development in Nairobi, Kenya` },
  description:
    "Brightex Solutions is a Nairobi technology consultancy. We build websites, ERP systems, custom software and AI automation for businesses in Kenya and East Africa.",
  alternates: {
    canonical: "/",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  description:
    "Technology consultancy in Nairobi, Kenya offering custom software, web development, ERP systems, AI automation, UI/UX design, SEO and branding.",
  url: SITE_URL,
  logo: `${SITE_URL}/assets/Brightex%20Solutions%20Logo-dark-v1-no-bg.png`,
  image: `${SITE_URL}/opengraph-image`,
  areaServed: [
    { "@type": "Country", name: "Kenya" },
    { "@type": "Place", name: "East Africa" },
  ],
  knowsAbout: [
    "Technology consulting", "Custom software development", "Web development",
    "ERP systems", "AI automation", "UI/UX design", "Search engine optimisation",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Services",
    itemListElement: [
      "Technology Consultancy", "Web Development", "ERP Systems", "AI & Automation",
      "UI/UX Design", "SEO & Growth", "Branding & Identity",
    ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })),
  },
  telephone: BUSINESS_PHONE,
  email: BUSINESS_EMAIL,
  address: {
    "@type": "PostalAddress",
    addressLocality: BUSINESS_CITY,
    addressCountry: "KE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -1.286389,
    longitude: 36.817223,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
  },
  sameAs: [
    ...(SOCIAL_FACEBOOK  ? [`https://facebook.com/${SOCIAL_FACEBOOK}`]          : []),
    ...(SOCIAL_INSTAGRAM ? [`https://instagram.com/${SOCIAL_INSTAGRAM}`]         : []),
    ...(SOCIAL_TIKTOK    ? [`https://tiktok.com/@${SOCIAL_TIKTOK}`]              : []),
    ...(SOCIAL_LINKEDIN  ? [`https://linkedin.com/company/${SOCIAL_LINKEDIN}`]   : []),
    ...(SOCIAL_TWITTER   ? [`https://x.com/${SOCIAL_TWITTER}`]                   : []),
  ],
  priceRange: "KES",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default async function HomePage() {
  const heroAnnouncement = await getHeroAnnouncement();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <SectionErrorBoundary>
        <Hero announcement={heroAnnouncement} />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <ServicesSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <PortfolioSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <ProcessSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <ClientsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <WhySection />
      </SectionErrorBoundary>

    </>
  );
}
