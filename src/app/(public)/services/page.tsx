import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Palette, TrendingUp, Cpu, Database, BarChart3, Lightbulb, CheckCircle2, Users, Award, Zap } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
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
    featured: false,
  },
  {
    icon: Palette,
    num: "02",
    title: "UI/UX Design",
    tagline: "Interfaces people actually enjoy using.",
    description:
      "User research, wireframing, prototyping, and high-fidelity UI design — grounded in how real people use products. We design for conversion, accessibility, and consistency across every screen size.",
    points: ["UX research & strategy", "Wireframes & prototypes", "UI design systems", "Accessibility audits"],
    featured: false,
  },
  {
    icon: TrendingUp,
    num: "03",
    title: "SEO & Growth",
    tagline: "Visibility that compounds over time.",
    description:
      "Technical SEO, on-page optimisation, content strategy, and performance tracking. We build the infrastructure for sustainable organic growth that works without ongoing ad spend.",
    points: ["Technical SEO audits", "On-page optimisation", "Content & keyword strategy", "Analytics & tracking setup"],
    featured: false,
  },
  {
    icon: Lightbulb,
    num: "04",
    title: "Branding & Identity",
    tagline: "A brand that commands attention.",
    description:
      "Logo design, colour systems, typography, and complete brand guidelines — giving your business a consistent, professional presence across every digital and print touchpoint.",
    points: ["Logo & mark design", "Full brand guidelines", "Colour & typography systems", "Social media templates"],
    featured: false,
  },
  {
    icon: Cpu,
    num: "05",
    title: "AI & Automation",
    tagline: "Work smarter with intelligent systems.",
    description:
      "AI integrations, chatbots, automated workflows, and data pipelines that eliminate manual work and surface better business intelligence — from simple automation to complex ML-backed systems.",
    points: ["AI chatbot development", "Workflow automation", "Data pipelines", "Custom AI tools & integrations"],
    featured: true,
  },
  {
    icon: Database,
    num: "06",
    title: "ERP Systems",
    tagline: "Built around how you actually operate.",
    description:
      "Custom enterprise resource planning designed around your workflows — not a rigid off-the-shelf product forced into your processes. Built for schools, hospitals, hospitality, NGOs, and more.",
    points: ["Custom ERP development", "Module & workflow design", "Data migration & cleanup", "Training & ongoing support"],
    featured: false,
  },
  {
    icon: BarChart3,
    num: "07",
    title: "Technology Consultancy",
    tagline: "Strategic guidance, not just opinions.",
    description:
      "Technology audits, stack selection, architecture planning, and digital transformation roadmaps. We help businesses at any stage make the right technology decisions and avoid expensive mistakes.",
    points: ["Tech stack assessment", "Architecture planning", "Digital transformation roadmaps", "Vendor & tool evaluation"],
    featured: false,
  },
];

const pillars = [
  "No bloated retainers — pay for what you need",
  "Every project starts with a discovery conversation",
  "We build for the long run, not the demo",
  "Transparent timelines and plain-language updates",
];

const stats = [
  { icon: Globe, value: "20+", label: "Projects delivered" },
  { icon: Users, value: "15+", label: "Happy clients" },
  { icon: Award, value: "7", label: "Core disciplines" },
  { icon: Zap, value: "3", label: "Countries served" },
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
                We don&apos;t sell packages — we solve problems. Every engagement starts with understanding what you&apos;re trying to achieve, then building the right solution for that specific goal.
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

      {/* Stats strip */}
      <section className="py-0 dark:bg-brand-navy-light border-b border-brand-border dark:border-white/8" style={{ background: "linear-gradient(90deg, #f8f7f4 0%, #f0ece4 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInStagger className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-border dark:divide-white/8">
            {stats.map((s) => (
              <StaggerChild key={s.label}>
                <div className="flex items-center gap-4 px-6 py-7">
                  <div className="w-10 h-10 rounded-sm bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <s.icon size={18} className="text-brand-gold" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold text-brand-navy dark:text-white">{s.value}</div>
                    <div className="text-xs text-brand-muted mt-0.5">{s.label}</div>
                  </div>
                </div>
              </StaggerChild>
            ))}
          </FadeInStagger>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-24 dark:bg-brand-navy-dark" style={{ background: "linear-gradient(155deg, #f4f6f8 0%, #edeae2 55%, #f2efe9 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <FadeIn className="max-w-xl mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold block mb-3">
              What We Offer
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy dark:text-white mb-3">
              7 disciplines. One cohesive team.
            </h2>
            <p className="text-brand-muted leading-relaxed">
              Whether you need one service or all seven working in concert — we treat every engagement as a long-term partnership.
            </p>
          </FadeIn>

          <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {services.map((s) => (
              <StaggerChild key={s.title}>
                <div className={[
                  "group relative flex flex-col h-full rounded-sm overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                  s.featured
                    ? "bg-brand-navy border-brand-navy hover:shadow-brand-navy/20"
                    : "bg-white dark:bg-brand-navy-light border-brand-border dark:border-white/8 hover:border-brand-gold/30",
                ].join(" ")}>

                  {/* Gold accent top line */}
                  <div className={[
                    "h-[3px] w-full",
                    s.featured ? "bg-brand-gold" : "bg-brand-gold/0 group-hover:bg-brand-gold/60 transition-colors duration-200",
                  ].join(" ")} />

                  {/* Card content */}
                  <div className="flex flex-col flex-1 p-7">
                    {/* Icon + num row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={[
                        "w-11 h-11 rounded-sm flex items-center justify-center shrink-0",
                        s.featured ? "bg-brand-gold/15" : "bg-brand-gold/8",
                      ].join(" ")}>
                        <s.icon size={20} className="text-brand-gold" />
                      </div>
                      <div className="flex items-center gap-2">
                        {s.featured && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[9px] font-bold uppercase tracking-widest">
                            Trending
                          </span>
                        )}
                        <span className={[
                          "text-xs font-mono",
                          s.featured ? "text-white/25" : "text-brand-muted/40",
                        ].join(" ")}>{s.num}</span>
                      </div>
                    </div>

                    {/* Title + tagline */}
                    <h3 className={[
                      "font-display text-xl font-bold mb-1 leading-snug",
                      s.featured ? "text-white" : "text-brand-navy dark:text-white",
                    ].join(" ")}>{s.title}</h3>
                    <p className="text-brand-gold text-xs font-semibold mb-4">{s.tagline}</p>

                    {/* Description */}
                    <p className={[
                      "text-sm leading-relaxed mb-5",
                      s.featured ? "text-white/55" : "text-brand-muted",
                    ].join(" ")}>{s.description}</p>

                    {/* Points */}
                    <ul className="space-y-2 mb-6 flex-1">
                      {s.points.map((pt) => (
                        <li key={pt} className={[
                          "flex items-start gap-2.5 text-sm",
                          s.featured ? "text-white/65" : "text-brand-text dark:text-white/65",
                        ].join(" ")}>
                          <span className="w-1 h-1 rounded-full bg-brand-gold mt-2 shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      href="/contact"
                      className={[
                        "mt-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                        s.featured
                          ? "text-brand-gold hover:text-white"
                          : "text-brand-navy dark:text-white hover:text-brand-gold dark:hover:text-brand-gold",
                      ].join(" ")}
                    >
                      Get a quote
                      <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </StaggerChild>
            ))}
          </FadeInStagger>

        </div>
      </section>

      {/* Trust section */}
      <section className="py-20 bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
                Why Brightex
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                One team. Every discipline.<br />No handoff headaches.
              </h2>
              <p className="text-white/55 text-base leading-relaxed mb-8">
                Most agencies specialise in one area. You end up stitching together multiple vendors — a designer here, a developer there, an SEO consultant elsewhere. With Brightex, strategy, design, development, and growth live under one roof.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-white/20 text-white text-sm font-semibold hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                Tell us about your project <ArrowRight size={14} />
              </Link>
            </FadeIn>
            <FadeIn direction="right">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "Discovery first", body: "Every engagement starts with a conversation about your actual goals — not a proposal we've already written." },
                  { title: "Built to hand over", body: "You own everything. Code is yours, documented, and deployable by any competent developer." },
                  { title: "No surprise invoices", body: "Scoped, quoted, and agreed before a line of code is written. Changes go through a formal request process." },
                ].map((item) => (
                  <div key={item.title} className="p-6 rounded-sm bg-white/5 border border-white/8">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-2 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-white text-sm mb-1.5">{item.title}</h3>
                        <p className="text-white/50 text-sm leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

    </>
  );
}
