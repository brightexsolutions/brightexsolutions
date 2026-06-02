import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { ProcessSection } from "@/components/public/process-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { WhySection } from "@/components/public/why-section";
import { CtaSection } from "@/components/public/cta-section";
import {
  SITE_NAME,
  SITE_URL,
  BUSINESS_PHONE,
  BUSINESS_EMAIL,
  BUSINESS_CITY,
  BUSINESS_COUNTRY,
  SOCIAL_FACEBOOK,
  SOCIAL_INSTAGRAM,
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
  title: `${SITE_NAME} — Digital Agency Nairobi`,
  description:
    "Nairobi-based digital agency building custom websites, ERP systems, AI tools, and platforms for businesses across Kenya and East Africa.",
  alternates: {
    canonical: "/",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  description:
    "Digital agency based in Nairobi, Kenya offering web development, UI/UX design, SEO, branding, ERP systems, AI automation, and technology consultancy.",
  url: SITE_URL,
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
    ...(SOCIAL_FACEBOOK ? [`https://facebook.com/${SOCIAL_FACEBOOK}`] : []),
    ...(SOCIAL_INSTAGRAM ? [`https://instagram.com/${SOCIAL_INSTAGRAM}`] : []),
  ],
  priceRange: "KES",
};

export default async function HomePage() {
  const heroAnnouncement = await getHeroAnnouncement();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
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
        <TestimonialsSection />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <WhySection />
      </SectionErrorBoundary>

      <SectionErrorBoundary>
        <CtaSection />
      </SectionErrorBoundary>
    </>
  );
}
