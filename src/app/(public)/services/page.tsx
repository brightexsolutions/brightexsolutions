import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Palette, TrendingUp, Cpu, Database, BarChart3, Lightbulb } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { CtaSection } from "@/components/public/cta-section";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web development, UI/UX design, SEO, branding, AI automation, ERP systems, and technology consultancy — all from one team in Nairobi.",
  alternates: { canonical: "/services" },
};

const services = [
  {
    icon: Globe,
    title: "Web Development",
    tagline: "Fast, scalable, built to last.",
    description:
      "From marketing sites to complex web applications — we build with modern stacks (Next.js, React, Node.js, Supabase) optimised for performance, SEO, and maintainability. Every project includes full deployment, CI/CD setup, and handover documentation.",
    deliverables: ["Custom websites", "Web applications", "E-commerce platforms", "API development", "Performance optimisation"],
  },
  {
    icon: Palette,
    title: "UI/UX Design",
    tagline: "Interfaces people actually enjoy using.",
    description:
      "User research, wireframing, prototyping, and high-fidelity UI design — all grounded in how real people use products. We design for conversion, accessibility, and visual consistency across every screen size.",
    deliverables: ["UX research & strategy", "Wireframes & prototypes", "UI design systems", "Responsive layouts", "Accessibility audits"],
  },
  {
    icon: TrendingUp,
    title: "SEO & Growth",
    tagline: "Visibility that compounds over time.",
    description:
      "Technical SEO, on-page optimisation, content strategy, and performance tracking. We don't just improve rankings — we build the infrastructure for sustainable organic growth that works without ongoing ad spend.",
    deliverables: ["Technical SEO audit", "On-page optimisation", "Content strategy", "Schema markup", "Analytics setup"],
  },
  {
    icon: Lightbulb,
    title: "Branding & Identity",
    tagline: "A brand that commands attention.",
    description:
      "Logo design, colour systems, typography, and complete brand guidelines that give your business a consistent, professional presence across every touchpoint — digital and print.",
    deliverables: ["Logo & mark design", "Brand guidelines", "Colour & typography systems", "Social media templates", "Print materials"],
  },
  {
    icon: Cpu,
    title: "AI & Automation",
    tagline: "Work smarter with intelligent systems.",
    description:
      "AI integrations, chatbots, automated workflows, and data pipelines that eliminate manual work and surface better business intelligence. From simple automation to complex ML-backed systems.",
    deliverables: ["AI chatbot development", "Workflow automation", "Data processing pipelines", "API integrations", "Custom AI tools"],
  },
  {
    icon: Database,
    title: "ERP Systems",
    tagline: "Built around how you actually operate.",
    description:
      "Custom enterprise resource planning — not a rigid off-the-shelf product forced into your processes. We design ERP systems that fit your workflows for schools, hospitals, hospitality, NGOs, and more.",
    deliverables: ["Custom ERP development", "Module design", "Data migration", "User training", "Ongoing support"],
  },
  {
    icon: BarChart3,
    title: "Technology Consultancy",
    tagline: "Strategic guidance, not just opinions.",
    description:
      "Technology audits, stack selection, architecture planning, and digital transformation roadmaps. We help businesses at any stage make the right technology decisions — and avoid expensive mistakes.",
    deliverables: ["Tech stack assessment", "Architecture planning", "Digital roadmapping", "Vendor evaluation", "Team capacity planning"],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-3xl">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
              What We Offer
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Services Built for
              <br />
              Real Business Goals
            </h1>
            <p className="text-white/60 text-xl leading-relaxed">
              We don't sell packages — we solve problems. Every engagement starts
              with understanding what you're trying to achieve, then building the
              right solution for that specific goal.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Services list */}
      <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <FadeInStagger staggerDelay={0.06}>
            {services.map((s, i) => (
              <StaggerChild key={s.title}>
                <div className="group p-8 sm:p-10 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 hover:border-brand-gold/40 transition-all duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
                    {/* Left */}
                    <div>
                      <div className="w-12 h-12 rounded-sm bg-brand-gold/10 flex items-center justify-center mb-5">
                        <s.icon size={22} className="text-brand-gold" />
                      </div>
                      <div className="text-3xl font-display text-brand-border dark:text-white/10 font-bold mb-2 leading-none">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-2">
                        {s.title}
                      </h2>
                      <p className="text-brand-gold text-sm font-semibold">
                        {s.tagline}
                      </p>
                    </div>

                    {/* Right */}
                    <div>
                      <p className="text-brand-muted leading-relaxed mb-6">
                        {s.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {s.deliverables.map((d) => (
                          <span
                            key={d}
                            className="px-3 py-1.5 rounded-sm text-xs font-medium bg-brand-bg dark:bg-white/8 text-brand-navy dark:text-white/70 border border-brand-border dark:border-white/10"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy dark:text-white hover:text-brand-gold transition-colors"
                      >
                        Get a quote <ArrowRight size={14} />
                      </Link>
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
