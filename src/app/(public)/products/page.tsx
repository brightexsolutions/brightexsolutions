import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ArrowRight, Zap, MessageCircle, Wrench, Code2, Layers } from "lucide-react";
import { whatsappUrl } from "@/lib/constants";
import { getPublishedProducts } from "@/lib/products";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Products",
  description: "Ready-to-deploy software built by Brightex Solutions — ERP systems, booking platforms, and management tools for businesses across East Africa.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage() {
  const products = await getPublishedProducts();

  return (
    <>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 bg-brand-navy bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80')" }}
      >
        <div className="absolute inset-0 bg-brand-navy/87" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
              Our Software
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Ready-to-Deploy
              <br />
              Business Software
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Software built by Brightex — designed for specific industries, licensed to businesses across East Africa. Try any product free for 7 days.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Live products */}
      <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {products.length > 0 && (
            <>
              <FadeIn className="max-w-3xl mx-auto text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <Zap size={13} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase">Available Now</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mb-6 leading-tight">
                  Live products you can
                  <br />
                  start using today.
                </h2>
                <p className="text-brand-muted text-lg leading-relaxed">
                  These products are already published in the admin dashboard and synced from Supabase. Start with a free trial, then scale into a plan that fits your team.
                </p>
              </FadeIn>

              <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-24">
                {products.map((product) => (
                  <StaggerChild key={product.id}>
                    <Link
                      href={`/products/${product.slug}`}
                      className="group block h-full rounded-sm border border-brand-border dark:border-white/10 bg-white dark:bg-brand-navy-light p-8 transition-colors hover:border-brand-gold/40"
                    >
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                          {product.category}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-semibold tracking-widest uppercase">
                          {product.trialDays}-day trial
                        </span>
                      </div>

                      <h3 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">
                        {product.name}
                      </h3>
                      <p className="text-brand-muted text-sm leading-relaxed mb-5">
                        {product.tagline || product.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {product.targetIndustries.slice(0, 3).map((industry) => (
                          <span
                            key={industry}
                            className="px-2.5 py-1 rounded-sm text-xs text-brand-muted border border-brand-border dark:border-white/10 bg-brand-bg dark:bg-white/5"
                          >
                            {industry}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-4 text-sm">
                        <span className="text-brand-navy dark:text-white font-semibold">
                          From {product.pricingFrom}
                        </span>
                        <span className="inline-flex items-center gap-2 text-brand-gold font-semibold">
                          View product <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  </StaggerChild>
                ))}
              </FadeInStagger>
            </>
          )}

          {/* Creative coming-soon block */}
          <FadeIn className="mb-20">
            <div className="relative overflow-hidden rounded-sm border border-brand-gold/20 bg-linear-to-br from-brand-navy via-brand-navy-light to-brand-navy p-12 sm:p-16 text-center">
              {/* Animated background dots */}
              <div className="absolute inset-0 pointer-events-none opacity-10">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full bg-brand-gold"
                    style={{ left: `${(i * 13 + 7) % 100}%`, top: `${(i * 17 + 11) % 100}%`, animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
              {/* Decorative rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full border border-brand-gold/5 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 rounded-full border border-brand-gold/8 pointer-events-none" />

              <div className="relative">
                <div className="flex items-center justify-center gap-3 mb-8">
                  {[Wrench, Code2, Layers].map((Icon, i) => (
                    <div key={i} className="w-10 h-10 rounded-sm bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                      <Icon size={18} className="text-brand-gold" />
                    </div>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-6">
                  <Zap size={12} className="text-brand-gold" />
                  <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Coming Soon</span>
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
                  Products are being built.
                  <br />
                  <span className="text-brand-gold">Right now.</span>
                </h2>
                <p className="text-white/55 text-base max-w-xl mx-auto mb-10 leading-relaxed">
                  Every product Brightex ships starts life as a real client problem — something we solved so well it became software. The first wave is in active development. We&apos;ll announce when they&apos;re ready.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={whatsappUrl("Hi Godwin, I'm interested in your upcoming software products and would like early access information.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
                  >
                    <MessageCircle size={15} />
                    Get Early Access
                  </a>
                  <Link href="/book" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm border border-white/20 text-white font-semibold text-sm hover:border-brand-gold/40 transition-colors">
                    Book a Discovery Call <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* CTA panel */}
          <FadeIn>
            <div className="relative overflow-hidden rounded-sm bg-brand-navy p-10 sm:p-14 text-center">
              {/* Decorative circles */}
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-gold/5 pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-brand-gold/5 pointer-events-none" />

              <div className="relative">
                <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4">Get Early Access</p>
                <h3 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                  Need a specific tool for your business?
                </h3>
                <p className="text-white/60 text-base max-w-xl mx-auto mb-8 leading-relaxed">
                  Tell us what you are building or struggling to manage. We may already be developing it — or we can build it for you as a custom engagement and license it back to the market.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={whatsappUrl("Hi Godwin, I'm interested in your upcoming software products and would like to discuss early access.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
                  >
                    <MessageCircle size={15} />
                    Express Interest on WhatsApp
                  </a>
                  <Link
                    href="/book"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm border border-white/20 text-white font-semibold text-sm hover:border-white/40 transition-colors"
                  >
                    Book a Discovery Call <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>

        </div>
      </section>

    </>
  );
}
