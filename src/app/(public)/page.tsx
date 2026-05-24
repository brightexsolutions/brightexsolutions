import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { ProcessSection } from "@/components/public/process-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { WhySection } from "@/components/public/why-section";
import { CtaSection } from "@/components/public/cta-section";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Brightex Solutions — Digital Agency Nairobi",
  description:
    "Nairobi-based digital agency building custom websites, ERP systems, AI tools, and platforms for businesses across Kenya and East Africa.",
  alternates: {
    canonical: "/",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Brightex Solutions",
  description:
    "Digital agency based in Nairobi, Kenya offering web development, UI/UX design, SEO, branding, ERP systems, AI automation, and technology consultancy.",
  url: "https://www.brightexsolutions.com",
  telephone: "+254741980127",
  email: "info.brightexsolutions@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Nairobi",
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
    "https://facebook.com/brightexsolutions",
    "https://instagram.com/brightexsolutions",
  ],
  priceRange: "KES",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <SectionErrorBoundary>
        <Hero />
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
