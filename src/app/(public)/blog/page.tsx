import type { Metadata } from "next";
import { FadeIn } from "@/components/public/fade-in";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights, guides, and updates from the Brightex Solutions team.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <section className="pt-32 pb-24 min-h-screen bg-[--color-brand-bg] dark:bg-[--color-brand-navy-dark]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase">
            Insights
          </span>
          <h1 className="font-display text-5xl font-bold text-[--color-brand-navy] dark:text-white mt-3 mb-4">
            Blog
          </h1>
          <p className="text-[--color-brand-muted] text-lg">
            Articles and guides coming soon.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
