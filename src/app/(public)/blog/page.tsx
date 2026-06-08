import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { ArrowRight, Clock, Tag } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights, guides, and updates from the Brightex Solutions team on web development, SEO, ERP systems, and digital strategy.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 bg-brand-navy bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&q=80')" }}
      >
        <div className="absolute inset-0 bg-brand-navy/87" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
              Insights
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              The Brightex Blog
            </h1>
            <p className="text-white/60 text-lg">
              Practical guides and perspectives on technology, digital strategy, and building businesses in Kenya.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Articles */}
      <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <FadeIn className="text-center text-brand-muted">
              Articles coming soon.
            </FadeIn>
          ) : (
            <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <StaggerChild key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-semibold">
                        <Tag size={10} />
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-brand-muted">
                        <Clock size={11} />
                        {post.readingTime} min read
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-brand-navy dark:text-white mb-3 leading-snug group-hover:text-brand-gold transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-brand-muted text-sm leading-relaxed mb-5 line-clamp-3">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-brand-muted">
                        {new Date(post.date).toLocaleDateString("en-KE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-brand-muted group-hover:text-brand-gold group-hover:translate-x-1 transition-all"
                      />
                    </div>
                  </Link>
                </StaggerChild>
              ))}
            </FadeInStagger>
          )}
        </div>
      </section>
    </>
  );
}
