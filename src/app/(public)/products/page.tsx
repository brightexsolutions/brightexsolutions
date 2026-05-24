import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { CtaSection } from "@/components/public/cta-section";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ArrowRight, School, Calendar, BarChart3 } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Products",
  description: "Ready-to-deploy software built by Brightex Solutions — ERP systems, booking platforms, and management tools for businesses across East Africa.",
  alternates: { canonical: "/products" },
};

export const products = [
  {
    slug: "school-erp",
    name: "School ERP",
    tagline: "Complete school management in one platform.",
    description:
      "Covers admissions, timetables, fee collection, grade management, parent portal, and staff payroll — built for Kenyan private and international schools.",
    category: "ERP",
    icon: School,
    features: ["Admissions & enrolment", "Timetable & attendance", "Fee collection (M-Pesa)", "Grade & exam management", "Parent communication portal", "Staff & payroll module"],
    industries: ["Primary Schools", "Secondary Schools", "International Schools"],
    pricingFrom: "KES 8,000/month",
    trialDays: 7,
  },
  {
    slug: "booking-system",
    name: "Booking System",
    tagline: "Professional appointment scheduling for any service business.",
    description:
      "Handles availability management, client self-booking, reminders, and payment collection — designed for clinics, salons, consultants, and service businesses.",
    category: "Booking",
    icon: Calendar,
    features: ["Online self-booking", "Staff availability management", "Automated reminders (SMS/email)", "M-Pesa payment integration", "Calendar sync", "Analytics dashboard"],
    industries: ["Clinics & Hospitals", "Salons & Spas", "Consultancies", "Fitness Studios"],
    pricingFrom: "KES 4,500/month",
    trialDays: 7,
  },
  {
    slug: "analytics-dashboard",
    name: "Business Analytics Dashboard",
    tagline: "Real-time business intelligence without the complexity.",
    description:
      "Connects to your existing data sources — POS, spreadsheets, accounting software — and surfaces the metrics that matter in a clean, shareable dashboard.",
    category: "Analytics",
    icon: BarChart3,
    features: ["Multi-source data connections", "Real-time KPI dashboards", "Automated weekly reports", "Goal & target tracking", "Team sharing & permissions", "Mobile-friendly views"],
    industries: ["Retail", "Hospitality", "NGOs", "Distribution"],
    pricingFrom: "KES 5,500/month",
    trialDays: 7,
  },
];

export default function ProductsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-[--color-brand-navy]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase mb-4 block">
              Our Software
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Ready-to-Deploy
              <br />
              Business Software
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Software built by Brightex — designed for specific industries, licensed to businesses across East Africa. Try any product free for 7 days.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Products grid */}
      <section className="py-24 bg-[--color-brand-bg] dark:bg-[--color-brand-navy-dark]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <FadeInStagger staggerDelay={0.1}>
            {products.map((p) => (
              <StaggerChild key={p.slug}>
                <div className="p-8 sm:p-10 rounded-sm bg-white dark:bg-[--color-brand-navy-light] border border-[--color-brand-border] dark:border-white/10 hover:border-[--color-brand-gold]/30 transition-all duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-sm bg-[--color-brand-gold]/10 flex items-center justify-center">
                          <p.icon size={20} className="text-[--color-brand-gold]" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[--color-brand-navy]/8 dark:bg-white/10 text-[--color-brand-navy] dark:text-white/70">
                          {p.category}
                        </span>
                      </div>
                      <h2 className="font-display text-3xl font-bold text-[--color-brand-navy] dark:text-white mb-2">
                        {p.name}
                      </h2>
                      <p className="text-[--color-brand-gold] text-sm font-semibold mb-4">
                        {p.tagline}
                      </p>
                      <p className="text-[--color-brand-muted] leading-relaxed mb-6">
                        {p.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-6">
                        {p.features.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-sm text-[--color-brand-text] dark:text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-[--color-brand-gold] flex-shrink-0" />
                            {f}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.industries.map((ind) => (
                          <span key={ind} className="px-2.5 py-1 rounded-sm text-xs font-medium bg-[--color-brand-bg] dark:bg-white/5 border border-[--color-brand-border] dark:border-white/10 text-[--color-brand-muted]">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-6 lg:items-end">
                      <div className="text-right">
                        <div className="text-xs text-[--color-brand-muted] uppercase tracking-wider mb-1">Starting from</div>
                        <div className="font-display text-2xl font-bold text-[--color-brand-navy] dark:text-white">{p.pricingFrom}</div>
                        <div className="text-xs text-[--color-brand-muted] mt-1">{p.trialDays}-day free trial included</div>
                      </div>
                      <div className="flex flex-col gap-3 lg:items-end">
                        <Link
                          href={`/products/${p.slug}`}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[--color-brand-navy] dark:bg-[--color-brand-gold] text-white dark:text-[--color-brand-navy] text-sm font-semibold hover:bg-[--color-brand-navy-hover] dark:hover:bg-[--color-brand-gold-hover] transition-colors"
                        >
                          Start Free Trial <ArrowRight size={14} />
                        </Link>
                        <Link
                          href="/book"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-[--color-brand-border] dark:border-white/20 text-[--color-brand-navy] dark:text-white text-sm font-semibold hover:border-[--color-brand-gold]/50 transition-colors"
                        >
                          Book a Demo
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerChild>
            ))}
          </FadeInStagger>
        </div>
      </section>

      <SectionErrorBoundary>
        <CtaSection />
      </SectionErrorBoundary>
    </>
  );
}
