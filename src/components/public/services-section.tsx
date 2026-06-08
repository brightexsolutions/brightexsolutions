import Link from "next/link";
import { ArrowRight, Globe, Palette, TrendingUp, Cpu, Database, BarChart3, Lightbulb } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

const services = [
  {
    icon: Globe,
    title: "Web Development",
    description:
      "Custom websites and web apps built with modern stacks — fast, secure, and built to scale with your business.",
  },
  {
    icon: Palette,
    title: "UI/UX Design",
    description:
      "User-centred design that converts. From wireframes to polished interfaces that feel intuitive and premium.",
  },
  {
    icon: TrendingUp,
    title: "SEO & Growth",
    description:
      "Organic visibility that compounds. Technical SEO, content strategy, and data-driven growth frameworks.",
  },
  {
    icon: Lightbulb,
    title: "Branding & Identity",
    description:
      "Strategy-led brand identity — logos, colour systems, typography, and guidelines that build recognition.",
  },
  {
    icon: Cpu,
    title: "AI & Automation",
    description:
      "Intelligent workflows and AI integrations that remove repetitive work and surface better decisions.",
  },
  {
    icon: Database,
    title: "ERP Systems",
    description:
      "Custom enterprise resource planning built for how your business actually operates — not a generic template.",
  },
  {
    icon: BarChart3,
    title: "Technology Consultancy",
    description:
      "Strategic tech guidance to help you choose the right stack, architecture, and roadmap for your goals.",
  },
];

export function ServicesSection() {
  return (
    <section className="py-24 dark:bg-brand-navy-dark" style={{ background: "linear-gradient(155deg, #f4f6f8 0%, #edeae2 55%, #f2efe9 100%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <FadeIn className="text-center mb-16">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
            What We Do
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mt-3 mb-4">
            End-to-End Digital Services
          </h2>
          <p className="text-brand-muted text-lg max-w-2xl mx-auto">
            Everything your business needs to compete online — under one roof,
            with one team that knows your goals.
          </p>
        </FadeIn>

        {/* Grid */}
        <FadeInStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {services.slice(0, 6).map((s) => (
            <StaggerChild key={s.title}>
              <div className="group p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 hover:border-brand-gold/50 hover:-translate-y-1 transition-all duration-200">
                <div className="w-10 h-10 rounded-sm bg-brand-gold/10 flex items-center justify-center mb-5">
                  <s.icon size={20} className="text-brand-gold" />
                </div>
                <h3 className="font-semibold text-brand-navy dark:text-white text-lg mb-2">
                  {s.title}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed">
                  {s.description}
                </p>
              </div>
            </StaggerChild>
          ))}
        </FadeInStagger>

        {/* CTA row */}
        <FadeIn className="text-center mt-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-brand-navy dark:text-white font-semibold text-sm hover:text-brand-gold transition-colors"
          >
            View all {services.length} services
            <ArrowRight size={16} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
