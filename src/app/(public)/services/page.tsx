import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Palette, TrendingUp, Cpu, Database, BarChart3, Lightbulb, CheckCircle2 } from "lucide-react";
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
    num: "01",
    title: "Web Development",
    tagline: "Fast, scalable, built to last.",
    description:
      "From marketing sites to complex web applications — we build with modern stacks optimised for performance, SEO, and maintainability. Every project ships with full deployment, CI/CD setup, and handover documentation.",
    points: ["Custom websites & web apps", "E-commerce platforms", "API development", "Performance & Core Web Vitals"],
  },
  {
    icon: Palette,
    num: "02",
    title: "UI/UX Design",
    tagline: "Interfaces people actually enjoy using.",
    description:
      "User research, wireframing, prototyping, and high-fidelity UI design — grounded in how real people use products. We design for conversion, accessibility, and consistency across every screen size.",
    points: ["UX research & strategy", "Wireframes & prototypes", "UI design systems", "Accessibility audits"],
  },
  {
    icon: TrendingUp,
    num: "03",
    title: "SEO & Growth",
    tagline: "Visibility that compounds over time.",
    description:
      "Technical SEO, on-page optimisation, content strategy, and performance tracking. We build the infrastructure for sustainable organic growth that works without ongoing ad spend.",
    points: ["Technical SEO audits", "On-page optimisation", "Content & keyword strategy", "Analytics & tracking setup"],
  },
  {
    icon: Lightbulb,
    num: "04",
    title: "Branding & Identity",
    tagline: "A brand that commands attention.",
    description:
      "Logo design, colour systems, typography, and complete brand guidelines — giving your business a consistent, professional presence across every digital and print touchpoint.",
    points: ["Logo & mark design", "Full brand guidelines", "Colour & typography systems", "Social media templates"],
  },
  {
    icon: Cpu,
    num: "05",
    title: "AI & Automation",
    tagline: "Work smarter with intelligent systems.",
    description:
      "AI integrations, chatbots, automated workflows, and data pipelines that eliminate manual work and surface better business intelligence — from simple automation to complex ML-backed systems.",
    points: ["AI chatbot development", "Workflow automation", "Data pipelines", "Custom AI tools & integrations"],
  },
  {
    icon: Database,
    num: "06",
    title: "ERP Systems",
    tagline: "Built around how you actually operate.",
    description:
      "Custom enterprise resource planning designed around your workflows — not a rigid off-the-shelf product forced into your processes. Built for schools, hospitals, hospitality, NGOs, and more.",
    points: ["Custom ERP development", "Module & workflow design", "Data migration & cleanup", "Training & ongoing support"],
  },
  {
    icon: BarChart3,
    num: "07",
    title: "Technology Consultancy",
    tagline: "Strategic guidance, not just opinions.",
    description:
      "Technology audits, stack selection, architecture planning, and digital transformation roadmaps. We help businesses at any stage make the right technology decisions and avoid expensive mistakes.",
    points: ["Tech stack assessment", "Architecture planning", "Digital transformation roadmaps", "Vendor & tool evaluation"],
  },
];

const pillars = [
  "No bloated retainers — pay for what you need",
  "Every project starts with a discovery conversation",
  "We build for the long run, not the demo",
  "Transparent timelines and plain-language updates",
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative pt-32 pb-24 bg-brand-navy bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80')" }}
      >
        <div className="absolute inset-0 bg-brand-navy/87" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
                What We Offer
              </span>
              <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
                Services Built for
                <br />
                Real Business Goals
              </h1>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                We don't sell packages — we solve problems. Every engagement starts with understanding what you're trying to achieve, then building the right solution for that specific goal.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
              >
                Start a conversation <ArrowRight size={14} />
              </Link>
            </FadeIn>

            <FadeIn direction="right">
              <div className="p-8 rounded-sm bg-white/5 border border-white/10 space-y-4">
                <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-5">Our approach</p>
                {pillars.map((p) => (
                  <div key={p} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-brand-gold mt-0.5 shrink-0" />
                    <span className="text-white/80 text-sm leading-relaxed">{p}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <FadeIn className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy dark:text-white">
              7 disciplines. One cohesive team.
            </h2>
            <p className="text-brand-muted mt-3 max-w-xl mx-auto">
              Whether you need one service or all seven working together, we treat every engagement as a long-term partnership.
            </p>
          </FadeIn>

          <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brand-border dark:bg-white/10 rounded-sm overflow-hidden border border-brand-border dark:border-white/10">
            {services.map((s, i) => (
              <StaggerChild key={s.title}>
                <div className={[
                  "group relative bg-white dark:bg-brand-navy-light p-0 flex flex-col overflow-hidden transition-colors duration-200 hover:bg-brand-bg dark:hover:bg-brand-navy",
                  // Last item spans full width if total is odd
                  i === services.length - 1 && services.length % 2 !== 0 ? "md:col-span-2" : "",
                ].join(" ")}>

                  {/* Gold top accent on hover */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-gold opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Header strip */}
                  <div className="flex items-center gap-4 px-8 pt-8 pb-5 border-b border-brand-border dark:border-white/8">
                    <div className="w-10 h-10 rounded-sm bg-brand-gold/10 flex items-center justify-center shrink-0">
                      <s.icon size={18} className="text-brand-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs text-brand-muted/50 font-mono">{s.num}</span>
                        <h3 className="font-display text-lg font-bold text-brand-navy dark:text-white truncate">{s.title}</h3>
                      </div>
                      <p className="text-brand-gold text-xs font-semibold mt-0.5">{s.tagline}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 px-8 py-6 gap-5">
                    <p className="text-brand-muted text-sm leading-relaxed">{s.description}</p>

                    <ul className="space-y-2">
                      {s.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5 text-sm text-brand-text dark:text-white/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/contact"
                      className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy dark:text-white hover:text-brand-gold dark:hover:text-brand-gold transition-colors"
                    >
                      Get a quote <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
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
