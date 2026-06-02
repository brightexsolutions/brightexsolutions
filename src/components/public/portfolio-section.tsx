import { ArrowUpRight } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

const projects = [
  {
    name: "Beco Interiors",
    category: "E-Commerce Redesign",
    description:
      "Full e-commerce redesign for a premium interiors brand — refined visual identity, product catalogue, and a seamless buying experience.",
    tags: ["WordPress", "E-Commerce", "UI Design"],
    accent: "#f9a825",
    url: "https://beco-interiors.netlify.app/",
  },
  {
    name: "Talkways Languages",
    category: "Education Website",
    description:
      "Modern website for a language learning school — course listings, enquiry forms, and an SEO strategy that grew organic traffic significantly.",
    tags: ["Web Design", "SEO", "Education"],
    accent: "#3b82f6",
    url: "https://talkwayslanguages.com/",
  },
  {
    name: "Greenhouse Worship",
    category: "Community Website",
    description:
      "A warm, welcoming digital home for a worship community — events, sermons, and a clean UI that reflects their brand and values.",
    tags: ["Web Development", "UI Design"],
    accent: "#8b5cf6",
    url: "https://thegreenhouse-w-s.netlify.app/",
  },
  {
    name: "Africa Feature Network",
    category: "Media Platform",
    description:
      "A media and news platform built for scale — structured content architecture, editorial workflow, and strong on-page SEO across hundreds of articles.",
    tags: ["Media Platform", "SEO", "WordPress"],
    accent: "#10b981",
    url: "https://africafeaturenetwork.com/",
  },
  {
    name: "Amuches Oven",
    category: "Online Ordering System",
    description:
      "Online ordering system for a bakery — digital menu, cart, order management, and an admin dashboard for the owner to track and fulfil orders daily.",
    tags: ["E-Commerce", "Web App", "Bakery"],
    accent: "#f97316",
    url: "https://amuches-oven.netlify.app/",
  },
  {
    name: "CBC App — Verb Education",
    category: "Web Application",
    description:
      "A Kenya CBC learning platform for students and teachers — curriculum-aligned content, progress tracking, and analytics built to Material Design 3 standards.",
    tags: ["SaaS", "EdTech", "Material Design 3", "Analytics"],
    accent: "#6366f1",
    url: "https://cbcapp.co.ke/",
  },
];

export function PortfolioSection() {
  return (
    <section className="py-24 bg-white dark:bg-brand-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
            Our Work
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mt-3">
            Projects We're Proud Of
          </h2>
          <p className="text-brand-muted mt-4 max-w-xl mx-auto">
            From e-commerce platforms to mobile apps — here's a selection of what we've shipped for clients across Kenya and East Africa.
          </p>
        </FadeIn>

        <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <StaggerChild key={p.name}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col p-8 rounded-sm bg-brand-bg dark:bg-brand-navy-light border border-brand-border dark:border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all duration-200 overflow-hidden"
              >
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
                    className="text-brand-muted group-hover:text-brand-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
                  />
                </div>

                <h3 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">
                  {p.name}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed mb-6">
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-sm text-xs font-medium bg-brand-navy/8 dark:bg-white/10 text-brand-navy dark:text-white/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </a>
            </StaggerChild>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
