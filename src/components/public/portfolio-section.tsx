import { ArrowUpRight } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

interface PortfolioProject {
  id?: string;
  name: string;
  category: string;
  description: string;
  url: string;
  image_url?: string | null;
  tags: string[];
  accent_color?: string;
}

const FALLBACK_PROJECTS: PortfolioProject[] = [
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

async function getProjects(): Promise<PortfolioProject[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_PROJECTS;
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("portfolio_projects")
      .select("id, name, category, description, url, image_url, tags, accent_color")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return FALLBACK_PROJECTS;
    return data as PortfolioProject[];
  } catch {
    return FALLBACK_PROJECTS;
  }
}

function CardBackground({ accent, imageUrl }: { accent: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <>
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a101e]/95 via-[#0a101e]/50 to-[#0a101e]/10 group-hover:from-[#0a101e]/98 transition-colors duration-300" />
      </>
    );
  }

  return (
    <>
      {/* Base gradient */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${accent}28 0%, ${accent}10 40%, #0d1928 100%)`,
        }}
      />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Primary radial glow — bottom-left */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 20% 80%, ${accent}45 0%, transparent 55%)`,
        }}
      />

      {/* Secondary radial glow — top-right (complementary) */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(ellipse at 85% 15%, ${accent}20 0%, transparent 45%)`,
        }}
      />

      {/* Decorative rings */}
      <div
        className="absolute -top-12 -right-12 w-52 h-52 rounded-full border pointer-events-none opacity-[0.12] group-hover:opacity-20 transition-opacity duration-500"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full border pointer-events-none opacity-[0.08] group-hover:opacity-14 transition-opacity duration-500"
        style={{ borderColor: accent }}
      />

      {/* Bottom text overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a101e]/90 via-[#0a101e]/30 to-transparent" />
    </>
  );
}

export async function PortfolioSection() {
  const projects = await getProjects();

  return (
    <section className="py-24 bg-white dark:bg-brand-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="max-w-xl mb-14">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold block mb-3">
            Our Work
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mb-3">
            Projects We&apos;re Proud Of
          </h2>
          <p className="text-brand-muted leading-relaxed">
            From e-commerce platforms to mobile apps — a selection of what we&apos;ve shipped for clients across Kenya and East Africa.
          </p>
        </FadeIn>

        <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const accent = p.accent_color ?? "#f9a825";
            return (
              <StaggerChild key={p.name}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col h-72 rounded-sm overflow-hidden focus-visible:ring-2 focus-visible:ring-brand-gold bg-[#0d1928]"
                >
                  <CardBackground accent={accent} imageUrl={p.image_url} />

                  {/* Top row: category badge + arrow */}
                  <div className="relative flex items-start justify-between p-5">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/90 backdrop-blur-sm border"
                      style={{
                        backgroundColor: `${accent}22`,
                        borderColor: `${accent}35`,
                      }}
                    >
                      {p.category}
                    </span>
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 transition-all duration-200 backdrop-blur-sm group-hover:text-white"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <ArrowUpRight
                        size={14}
                        className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                        style={{ color: "inherit" }}
                      />
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="relative mt-auto p-5 pt-3">
                    <h3
                      className="font-display text-xl font-bold text-white mb-1.5 leading-snug transition-colors duration-200"
                      style={{ "--hover-color": accent } as React.CSSProperties}
                    >
                      <span className="group-hover:opacity-90 transition-opacity">{p.name}</span>
                    </h3>
                    <p className="text-white/55 text-xs leading-relaxed mb-3 line-clamp-2">
                      {p.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.65)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accent bottom line on hover */}
                  <div
                    className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out"
                    style={{ backgroundColor: accent }}
                  />
                </a>
              </StaggerChild>
            );
          })}
        </FadeInStagger>
      </div>
    </section>
  );
}
