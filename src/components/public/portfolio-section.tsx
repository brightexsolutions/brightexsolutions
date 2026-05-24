import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

const projects = [
  {
    name: "FinTrack",
    category: "Finance Platform",
    description:
      "A full-stack personal finance app with transaction tracking, budgets, goals, and AI-powered insights.",
    tags: ["Next.js", "Supabase", "AI"],
    accent: "#f9a825",
  },
  {
    name: "Marshell Memorial",
    category: "Tribute Website",
    description:
      "A beautifully crafted digital tribute site — interactive timeline, photo gallery, and memory wall.",
    tags: ["Next.js", "Supabase"],
    accent: "#3b82f6",
  },
  {
    name: "School ERP",
    category: "Enterprise System",
    description:
      "Comprehensive school management platform covering admissions, timetables, fees, and grade management.",
    tags: ["ERP", "Next.js", "Postgres"],
    accent: "#10b981",
  },
];

export function PortfolioSection() {
  return (
    <section className="py-24 bg-white dark:bg-brand-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16">
          <div>
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
              Our Work
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mt-3">
              Projects We're Proud Of
            </h2>
          </div>
          <Link
            href="/services"
            className="text-sm font-semibold text-brand-muted hover:text-brand-navy dark:hover:text-white transition-colors whitespace-nowrap"
          >
            See all work →
          </Link>
        </FadeIn>

        <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <StaggerChild key={p.name}>
              <div className="group relative p-8 rounded-sm bg-brand-bg dark:bg-brand-navy-light border border-brand-border dark:border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                {/* Accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: p.accent }}
                />

                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-semibold text-brand-muted tracking-wider uppercase">
                    {p.category}
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="text-brand-muted group-hover:text-brand-gold transition-colors"
                  />
                </div>

                <h3 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">
                  {p.name}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed mb-6">
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-sm text-xs font-medium bg-brand-navy/8 dark:bg-white/10 text-brand-navy dark:text-white/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </StaggerChild>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
