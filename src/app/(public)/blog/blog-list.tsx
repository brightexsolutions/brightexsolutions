"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Tag, Mail, Loader2 } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import type { BlogPost } from "@/lib/blog";

const CATEGORIES = ["All", "Web Development", "AI & Automation", "SEO", "Design", "ERP", "Strategy"];

// ── Newsletter sub-form ───────────────────────────────────────────────────────
function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setState("success");
        setMsg(data.message ?? "You're subscribed!");
        setEmail("");
      } else {
        setState("error");
        setMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMsg("Network error. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div className="flex items-center justify-center gap-3 py-3">
        <span className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f9a825" strokeWidth="2.5" className="w-3.5 h-3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <p className="text-white text-sm font-medium">{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <div className="flex-1 relative">
        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          className="w-full pl-9 pr-4 py-3 rounded-sm bg-white/8 border border-white/15 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-brand-gold transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={state === "loading"}
        className="px-6 py-3 rounded-sm bg-brand-gold text-brand-navy text-sm font-bold hover:bg-brand-gold-hover transition-colors disabled:opacity-60 whitespace-nowrap flex items-center justify-center gap-2"
      >
        {state === "loading" && <Loader2 size={14} className="animate-spin" />}
        Subscribe
      </button>
      {state === "error" && (
        <p className="w-full text-xs text-red-400 mt-1 sm:col-span-2">{msg}</p>
      )}
    </form>
  );
}

// ── Main blog list ────────────────────────────────────────────────────────────
export function BlogList({ posts }: { posts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? posts
    : posts.filter((p) => {
        const cat = p.category?.toLowerCase() ?? "";
        const active = activeCategory.toLowerCase();
        return cat.includes(active) || active.includes(cat);
      });

  const [featured, ...rest] = filtered;

  return (
    <>
      {/* ── Category filter bar ── */}
      <div className="sticky top-16 lg:top-20 z-30 bg-white/95 dark:bg-[#090f1a]/95 backdrop-blur-sm border-b border-brand-border dark:border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={[
                    "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                    active
                      ? "bg-brand-navy text-white dark:bg-brand-gold dark:text-brand-navy shadow-sm"
                      : "text-brand-muted hover:text-brand-navy dark:hover:text-white hover:bg-brand-bg dark:hover:bg-white/8",
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <p className="font-display text-xl font-bold text-brand-navy dark:text-white mb-2">
                No articles in this category yet.
              </p>
              <button
                onClick={() => setActiveCategory("All")}
                className="text-sm text-brand-gold hover:underline mt-2"
              >
                View all articles
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Featured article */}
          {featured && (
            <section className="pt-14 pb-4 bg-brand-bg dark:bg-brand-navy-dark">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn className="mb-6">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-muted">
                    {activeCategory === "All" ? "Featured Article" : `${activeCategory} — Latest`}
                  </span>
                </FadeIn>
                <FadeIn>
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group block rounded-sm overflow-hidden bg-brand-navy hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
                      <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-between min-h-[260px]">
                        <div>
                          <div className="flex items-center gap-3 mb-5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-semibold">
                              <Tag size={10} />
                              {featured.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-white/35">
                              <Clock size={11} />
                              {featured.readingTime} min read
                            </span>
                          </div>
                          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight group-hover:text-brand-gold transition-colors">
                            {featured.title}
                          </h2>
                          <p className="text-white/45 text-sm leading-relaxed line-clamp-2 max-w-xl">
                            {featured.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/8">
                          <span className="text-xs text-white/25">
                            {new Date(featured.date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold">
                            Read article
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col items-center justify-center bg-brand-gold/[0.04] border-l border-white/5 p-10 text-center">
                        <div className="w-14 h-14 rounded-sm bg-brand-gold/15 flex items-center justify-center mb-3">
                          <Tag size={24} className="text-brand-gold" />
                        </div>
                        <p className="font-display text-5xl font-bold text-white/8 leading-none">01</p>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              </div>
            </section>
          )}

          {/* Rest of articles */}
          {rest.length > 0 && (
            <section className="py-10 bg-brand-bg dark:bg-brand-navy-dark">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn className="mb-7">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-muted">
                    More articles
                  </span>
                </FadeIn>
                <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map((post) => (
                    <StaggerChild key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group flex flex-col h-full p-7 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/8 hover:border-brand-gold/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-semibold">
                            <Tag size={10} />
                            {post.category}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-brand-muted">
                            <Clock size={11} />
                            {post.readingTime} min
                          </span>
                        </div>
                        <h2 className="font-display text-lg font-bold text-brand-navy dark:text-white mb-3 leading-snug group-hover:text-brand-gold transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-brand-muted text-sm leading-relaxed mb-5 line-clamp-2 flex-1">
                          {post.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-brand-muted">
                            {new Date(post.date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <ArrowRight size={14} className="text-brand-muted group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    </StaggerChild>
                  ))}
                </FadeInStagger>
              </div>
            </section>
          )}
        </>
      )}

      {/* Browse topics */}
      <section className="py-8 bg-brand-bg dark:bg-brand-navy-dark border-t border-brand-border dark:border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-muted mr-1">Browse topics:</span>
            {CATEGORIES.slice(1).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={[
                  "px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all duration-150",
                  activeCategory === cat
                    ? "border-brand-gold text-brand-gold bg-brand-gold/8"
                    : "border-brand-border dark:border-white/10 text-brand-muted dark:text-white/40 hover:border-brand-gold hover:text-brand-gold",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-brand-navy relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy to-[#0d2545]" />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-gold/3 blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="w-11 h-11 rounded-sm bg-brand-gold/15 flex items-center justify-center mx-auto mb-5">
              <Mail size={20} className="text-brand-gold" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
              Get new articles in your inbox
            </h2>
            <p className="text-white/45 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Practical insights on web technology, digital strategy, and growing your business — from the Brightex team. No spam, ever.
            </p>
            <NewsletterForm />
          </FadeIn>
        </div>
      </section>
    </>
  );
}
