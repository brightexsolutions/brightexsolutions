import type { Metadata } from "next";
import { FadeIn } from "@/components/public/fade-in";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Products",
  description: "Ready-to-deploy software built by Brightex Solutions for businesses across East Africa.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <section className="pt-32 pb-24 min-h-screen bg-[--color-brand-bg] dark:bg-[--color-brand-navy-dark]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase">
            Our Software
          </span>
          <h1 className="font-display text-5xl font-bold text-[--color-brand-navy] dark:text-white mt-3 mb-4">
            Products
          </h1>
          <p className="text-[--color-brand-muted] text-lg">
            Licensable software for schools, hospitals, hospitality, and more — coming soon.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
