import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { ArrowRight, Clock, Tag, Rss } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights, guides, and updates from the Brightex Solutions team on web development, SEO, ERP systems, and digital strategy.",
  alternates: { canonical: "/blog" },
};

const CATEGORIES = ["All", "Web Development", "AI & Automation", "SEO", "Design", "ERP", "Strategy"];

export default function BlogPage() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-navy/95 to-brand-navy" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/8 text-brand-gold text-xs font-semibold uppercase tracking-widest">
                <Rss size={10} />
                Insights
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              The Brightex<br />
              <span className="text-brand-gold">Journal</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Practical guides and perspectives on technology, digital strategy, and building businesses in Kenya and East Africa.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Category filter bar */}
      <div className="sticky top-16 lg:top-20 z-30 bg-white/95 dark:bg-brand-navy-dark/95 backdrop-blur-sm border-b border-brand-border dark:border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={[
                  "shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
                  cat === "All"
                    ? "bg-brand-navy text-white dark:bg-brand-gold dark:text-brand-navy"
                    : "text-brand-muted hover:text-brand-navy dark:hover:text-white hover:bg-brand-bg dark:hover:bg-white/8",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="text-center py-20">
              <p className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">
                Articles coming soon.
              </p>
              <p className="text-brand-muted text-sm">
                We&apos;re crafting thoughtful content on technology and business.
              </p>
            </FadeIn>
          </div>
        </section>
      ) : (
        <>
          {/* Featured article */}
          {featured && (
            <section className="pt-14 pb-4 bg-brand-bg dark:bg-brand-navy-dark">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand-muted">
                    Featured Article
                  </span>
                </FadeIn>
                <FadeIn>
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group block rounded-sm overflow-hidden bg-brand-navy hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px]">
                      {/* Content */}
                      <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-between min-h-[280px]">
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-semibold">
                              <Tag size={10} />
                              {featured.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-white/40">
                              <Clock size={11} />
                              {featured.readingTime} min read
                            </span>
                          </div>
                          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-brand-gold transition-colors">
                            {featured.title}
                          </h2>
                          <p className="text-white/50 text-sm leading-relaxed line-clamp-3 max-w-xl">
                            {featured.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                          <span className="text-xs text-white/30">
                            {new Date(featured.date).toLocaleDateString("en-KE", {
                              year: "numeric", month: "long", day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-gold">
                            Read article
                            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                      {/* Accent panel */}
                      <div className="hidden lg:flex items-center justify-center bg-brand-gold/5 border-l border-white/5">
                        <div className="p-10 text-center">
                          <div className="w-16 h-16 rounded-sm bg-brand-gold/15 flex items-center justify-center mx-auto mb-4">
                            <Tag size={28} className="text-brand-gold" />
                          </div>
                          <p className="font-display text-4xl font-bold text-white/10 leading-none">01</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              </div>
            </section>
          )}

          {/* All articles grid */}
          {rest.length > 0 && (
            <section className="py-12 bg-brand-bg dark:bg-brand-navy-dark">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn className="mb-8">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand-muted">
                    More articles
                  </span>
                </FadeIn>
                <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map((post) => (
                    <StaggerChild key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group block h-full p-7 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/8 hover:border-brand-gold/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
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
                        <p className="text-brand-muted text-sm leading-relaxed mb-5 line-clamp-2">
                          {post.description}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs text-brand-muted">
                            {new Date(post.date).toLocaleDateString("en-KE", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                          <ArrowRight
                            size={15}
                            className="text-brand-muted group-hover:text-brand-gold group-hover:translate-x-1 transition-all"
                          />
                        </div>
                      </Link>
                    </StaggerChild>
                  ))}
                </FadeInStagger>
              </div>
            </section>
          )}

          {/* Popular topics */}
          <section className="py-10 bg-brand-bg dark:bg-brand-navy-dark border-t border-brand-border dark:border-white/8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand-muted mr-2">
                  Browse topics:
                </span>
                {CATEGORIES.slice(1).map((cat) => (
                  <span
                    key={cat}
                    className="px-3.5 py-1.5 rounded-full border border-brand-border dark:border-white/10 text-xs font-medium text-brand-muted dark:text-white/50 hover:border-brand-gold hover:text-brand-gold dark:hover:text-brand-gold transition-colors cursor-pointer"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Newsletter CTA */}
      <section className="py-20 bg-brand-navy relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-navy to-[#0d2545]" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-gold/3 blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <span className="inline-block px-3 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/8 text-brand-gold text-xs font-semibold uppercase tracking-widest mb-5">
              Stay in the loop
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Get new articles in your inbox
            </h2>
            <p className="text-white/50 text-base mb-8 max-w-lg mx-auto">
              Practical insights on web technology, digital strategy, and growing your business — straight from the Brightex team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-sm bg-white/8 border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-brand-gold transition-colors"
              />
              <button className="px-6 py-3 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
            <p className="text-white/25 text-xs mt-4">No spam. Unsubscribe at any time.</p>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
