import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/public/fade-in";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ArrowLeft } from "lucide-react";
import { ProjectsList } from "./projects-list";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Our Projects",
  description: "A full view of websites, platforms, and digital products we have built for clients across Kenya and East Africa.",
  alternates: { canonical: "/projects" },
};

const FALLBACK_PROJECTS = [
  {
    name: "Beco Interiors",
    category: "E-Commerce Redesign",
    description: "Full e-commerce redesign for a premium interiors brand — refined visual identity, product catalogue, and a seamless buying experience.",
    tags: ["WordPress", "E-Commerce", "UI Design"],
    url: "https://beco-interiors.netlify.app/",
    accent_color: "#f9a825",
  },
  {
    name: "Talkways Languages",
    category: "Education Website",
    description: "Modern website for a language learning school — course listings, enquiry forms, and an SEO strategy that grew organic traffic significantly.",
    tags: ["Web Design", "SEO", "Education"],
    url: "https://talkwayslanguages.com/",
    accent_color: "#3b82f6",
  },
  {
    name: "Greenhouse Worship",
    category: "Community Website",
    description: "A warm, welcoming digital home for a worship community — events, sermons, and a clean UI that reflects their brand and values.",
    tags: ["Web Development", "UI Design"],
    url: "https://thegreenhouse-w-s.netlify.app/",
    accent_color: "#a78bfa",
  },
  {
    name: "Africa Feature Network",
    category: "Media Platform",
    description: "A media and news platform built for scale — structured content architecture, editorial workflow, and strong on-page SEO across hundreds of articles.",
    tags: ["Media Platform", "SEO", "WordPress"],
    url: "https://africafeaturenetwork.com/",
    accent_color: "#10b981",
  },
  {
    name: "Amuches Oven",
    category: "Online Ordering System",
    description: "Online ordering system for a bakery — digital menu, cart, order management, and an admin dashboard for the owner to track and fulfil orders daily.",
    tags: ["E-Commerce", "Web App", "Bakery"],
    url: "https://amuches-oven.netlify.app/",
    accent_color: "#fb923c",
  },
  {
    name: "CBC App — Verb Education",
    category: "Web Application",
    description: "A Kenya CBC learning platform for students and teachers — curriculum-aligned content, progress tracking, and analytics built to Material Design 3 standards.",
    tags: ["SaaS", "EdTech", "Analytics"],
    url: "https://cbcapp.co.ke/",
    accent_color: "#818cf8",
  },
];

async function getAllProjects() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_PROJECTS;
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("portfolio_projects")
      .select("name, category, description, url, image_url, tags, accent_color")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return FALLBACK_PROJECTS;
    return data;
  } catch {
    return FALLBACK_PROJECTS;
  }
}

export default async function ProjectsPage() {
  const projects = await getAllProjects();

  return (
    <main>
      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-brand-navy overflow-hidden">
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute top-24 -left-10 w-60 h-60 rounded-full bg-brand-gold/[0.025] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <FadeIn>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-xs font-medium transition-colors mb-8"
            >
              <ArrowLeft size={13} /> Back to home
            </Link>
            <span className="text-brand-gold text-[10px] font-bold tracking-[0.2em] uppercase block mb-4">
              Our Work
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Projects
              <br />
              <span className="text-brand-gold">we&apos;ve shipped.</span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-xl">
              Websites, platforms, and digital products built for businesses across Kenya and East Africa.
            </p>
          </FadeIn>

          {/* Stats row */}
          <FadeIn className="mt-12 flex flex-wrap gap-8">
            {[
              { value: `${projects.length}+`, label: "Projects delivered" },
              { value: "5+", label: "Years of work" },
              { value: "3", label: "Countries" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="font-display text-3xl font-bold text-white">{value}</div>
                <div className="text-white/35 text-xs uppercase tracking-widest font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* Projects list */}
      <section
        className="py-16 dark:bg-brand-navy-dark"
        style={{ background: "linear-gradient(160deg, #fafaf8 0%, #f4f0ea 55%, #f8f5f1 100%)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionErrorBoundary fallback={<p className="text-brand-muted py-16 text-center">Projects unavailable right now.</p>}>
            <ProjectsList projects={projects} />
          </SectionErrorBoundary>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-brand-navy">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">Ready to be next?</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
              Let&apos;s build something<br />
              <span className="text-brand-gold">you&apos;re proud of.</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-bold hover:bg-brand-gold-hover transition-colors"
              >
                Start a project
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm border border-white/15 text-white text-sm font-medium hover:border-white/35 hover:bg-white/[0.04] transition-all"
              >
                Book a call
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
