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
    accent_color: "#8b5cf6",
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
    accent_color: "#f97316",
  },
  {
    name: "CBC App — Verb Education",
    category: "Web Application",
    description: "A Kenya CBC learning platform for students and teachers — curriculum-aligned content, progress tracking, and analytics built to Material Design 3 standards.",
    tags: ["SaaS", "EdTech", "Analytics"],
    url: "https://cbcapp.co.ke/",
    accent_color: "#6366f1",
  },
];

function screenshotUrl(url: string, customImage?: string | null): string {
  if (customImage) return customImage;
  try {
    const encoded = encodeURIComponent(url);
    return `https://image.thum.io/get/width/1200/crop/750/${encoded}`;
  } catch {
    return "";
  }
}

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
            const imgSrc = screenshotUrl(p.url, p.image_url);
            return (
              <StaggerChild key={p.name}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col h-72 rounded-sm overflow-hidden focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  {/* Background: screenshot or accent gradient */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{
                      backgroundImage: imgSrc ? `url(${imgSrc})` : "none",
                      backgroundColor: p.accent_color ?? "#152238",
                    }}
                  />

                  {/* Fallback pattern when no image */}
                  {!imgSrc && (
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `radial-gradient(circle at 30% 40%, ${p.accent_color ?? "#f9a825"} 0%, transparent 60%)`,
                      }}
                    />
                  )}

                  {/* Cinematic gradient overlay — darker at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a101e]/95 via-[#0a101e]/55 to-[#0a101e]/15 group-hover:from-[#0a101e]/98 transition-colors duration-300" />

                  {/* Top row: category badge + arrow */}
                  <div className="relative flex items-start justify-between p-5">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/90 backdrop-blur-sm"
                      style={{ backgroundColor: `${p.accent_color ?? "#152238"}88` }}
                    >
                      {p.category}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 group-hover:bg-brand-gold/90 group-hover:text-brand-navy transition-all duration-200">
                      <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="relative mt-auto p-5 pt-3">
                    <h3 className="font-display text-xl font-bold text-white mb-1.5 leading-snug group-hover:text-brand-gold transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-white/55 text-xs leading-relaxed mb-3 line-clamp-2">
                      {p.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              </StaggerChild>
            );
          })}
        </FadeInStagger>
      </div>
    </section>
  );
}
