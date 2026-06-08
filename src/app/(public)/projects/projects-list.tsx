"use client";

import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { FadeIn } from "@/components/public/fade-in";

interface Project {
  name: string;
  category: string;
  description: string;
  url: string;
  image_url?: string | null;
  tags: string[];
  accent_color?: string;
}

const BATCH = 3;

export function ProjectsList({ projects }: { projects: Project[] }) {
  const [visible, setVisible] = useState(BATCH);
  const shown = projects.slice(0, visible);
  const hasMore = visible < projects.length;

  return (
    <>
      {/* Editorial list */}
      <div className="divide-y divide-brand-border dark:divide-white/8">
        {shown.map((p, i) => {
          const accent = p.accent_color ?? "#f9a825";
          const num = String(i + 1).padStart(2, "0");

          return (
            <FadeIn key={p.name}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-6 sm:gap-10 py-8 sm:py-10 transition-colors hover:bg-brand-gold/[0.025] -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-sm"
              >
                {/* Number */}
                <span
                  className="font-display font-black text-4xl sm:text-5xl leading-none tabular-nums shrink-0 transition-colors duration-300 select-none pt-1"
                  style={{ color: `${accent}30` }}
                >
                  {num}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Category + tags row */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={{
                        color: accent,
                        borderColor: `${accent}40`,
                        backgroundColor: `${accent}12`,
                      }}
                    >
                      {p.category}
                    </span>
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[11px] text-brand-muted">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Name */}
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-brand-navy dark:text-white leading-snug mb-3 group-hover:text-brand-gold transition-colors">
                    {p.name}
                  </h3>

                  {/* Description */}
                  <p className="text-brand-muted text-sm leading-relaxed max-w-2xl line-clamp-2">
                    {p.description}
                  </p>
                </div>

                {/* Arrow */}
                <div
                  className="shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 mt-1 group-hover:scale-110"
                  style={{
                    borderColor: `${accent}40`,
                    backgroundColor: `${accent}10`,
                    color: accent,
                  }}
                >
                  <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </a>
            </FadeIn>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <FadeIn className="mt-10 text-center">
          <button
            onClick={() => setVisible((v) => v + BATCH)}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-sm border border-brand-border dark:border-white/15 text-brand-navy dark:text-white text-sm font-semibold hover:border-brand-gold hover:text-brand-gold transition-colors group"
          >
            <Plus size={15} className="group-hover:rotate-90 transition-transform duration-200" />
            Load more projects
            <span className="text-brand-muted text-xs font-normal">
              ({projects.length - visible} remaining)
            </span>
          </button>
        </FadeIn>
      )}

      {!hasMore && projects.length > BATCH && (
        <FadeIn className="mt-10 text-center">
          <p className="text-brand-muted text-sm">
            That&apos;s all {projects.length} projects — more on the way.
          </p>
        </FadeIn>
      )}
    </>
  );
}
