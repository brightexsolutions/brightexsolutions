import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { FadeIn } from "@/components/public/fade-in";
import { Rss } from "lucide-react";
import { BlogList } from "./blog-list";

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
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/90 to-brand-navy" />
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
        <BlogList posts={posts} />
      )}
    </>
  );
}
