import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TrialForm } from "@/components/public/trial-form";
import { FadeIn } from "@/components/public/fade-in";
import { CtaSection } from "@/components/public/cta-section";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getProductBySlug, getPublishedProducts } from "@/lib/products";

export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description || product.tagline,
    alternates: { canonical: `/products/${slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KES",
      description: `${product.trialDays}-day free trial`,
    },
    provider: {
      "@type": "Organization",
      name: "Brightex Solutions",
      url: "https://www.brightexsolutions.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
            >
              <ArrowLeft size={14} />
              All Products
            </Link>
            <div className="flex items-center gap-3 mb-5">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-gold/15 text-brand-gold">
                {product.category}
              </span>
              <span className="text-white/50 text-xs">
                {product.trialDays}-day free trial
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-4 leading-tight">
              {product.name}
            </h1>
            <p className="text-white/60 text-xl leading-relaxed max-w-2xl">
              {product.description || product.tagline}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Content + Trial form */}
      <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-16">
            {/* Left — features */}
            <FadeIn direction="left">
              <h2 className="font-display text-3xl font-bold text-brand-navy dark:text-white mb-8">
                What&apos;s included
              </h2>
              <div className="space-y-4 mb-12">
                {product.features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="text-brand-gold shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-brand-text dark:text-white/90 leading-relaxed font-medium">
                        {feature.title}
                      </p>
                      {feature.description && (
                        <p className="text-sm text-brand-muted leading-relaxed mt-1">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-display text-xl font-bold text-brand-navy dark:text-white mb-4">
                  Built for these industries
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.targetIndustries.map((ind) => (
                    <span
                      key={ind}
                      className="px-3 py-1.5 rounded-sm text-sm font-medium bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 text-brand-navy dark:text-white"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Right — trial form */}
            <FadeIn direction="right">
              <SectionErrorBoundary
                fallback={
                  <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border text-center">
                    <p className="text-brand-muted mb-4">
                      Trial form unavailable. Contact us directly.
                    </p>
                    <Link href="/contact" className="text-brand-gold font-semibold text-sm">
                      Get in touch →
                    </Link>
                  </div>
                }
              >
                <TrialForm
                  productSlug={product.slug}
                  productName={product.name}
                  trialDays={product.trialDays}
                  pricingFrom={product.pricingFrom}
                />
              </SectionErrorBoundary>
            </FadeIn>
          </div>
        </div>
      </section>

      <SectionErrorBoundary>
        <CtaSection />
      </SectionErrorBoundary>
    </>
  );
}
