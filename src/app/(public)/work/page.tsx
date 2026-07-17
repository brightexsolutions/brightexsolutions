import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ArrowRight, Zap, MessageCircle, Wrench, Code2, Layers } from "lucide-react";
import { whatsappUrl } from "@/lib/constants";
import { getPublishedProducts } from "@/lib/products";
import { ClientProjectsList } from "./work-client";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Our Work",
  description: "Software we've built and client projects we've shipped — Brightex Solutions. From ready-to-deploy business tools to custom websites and platforms across East Africa.",
  alternates: { canonical: "/work" },
};

const FALLBACK_PROJECTS = [
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
    accent_color: "#a78bfa",
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
    accent_color: "#fb923c",
  },
  {
    name: "CBC App — Verb Education",
    category: "Web Application",
    description: "A Kenya CBC learning platform for students and teachers — curriculum-aligned content, progress tracking, and analytics built to Material Design 3 standards.",
    tags: ["SaaS", "EdTech", "Analytics"],
    url: "https://cbcapp.co.ke/",
    accent_color: "#818cf8",
  },
];

async function getAllProjects() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return FALLBACK_PROJECTS;
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("portfolio_projects")
      .select("name, category, description, url, image_url, tags, accent_color")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return FALLBACK_PROJECTS;
    return data;
  } catch {
    return FALLBACK_PROJECTS;
  }
}

export default async function WorkPage() {
  const [projects, products] = await Promise.all([getAllProjects(), getPublishedProducts()]);

  return (
    <main>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 bg-brand-navy bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80')" }}
      >
        <div className="absolute inset-0 bg-brand-navy/90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
              Brightex Solutions
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Our Work
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-10">
              Software we build for businesses to license — and custom projects we ship for clients across Kenya and East Africa.
            </p>

            {/* Jump links */}
            <div className="flex flex-wrap gap-3">
              <a
                href="#products"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors"
              >
                Software Products
                <ArrowRight size={13} />
              </a>
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-white/20 text-white text-sm font-medium hover:border-white/40 transition-colors"
              >
                Client Projects
                <ArrowRight size={13} />
              </a>
            </div>
          </FadeIn>

          {/* Stats row */}
          <FadeIn className="mt-14 flex flex-wrap gap-10">
            {[
              { value: `${products.length || ""}`, label: products.length ? "Live products" : "Products in development" },
              { value: `${projects.length}+`, label: "Client projects" },
              { value: "5+", label: "Years building" },
              { value: "3", label: "Countries" },
            ].filter(s => s.value).map(({ value, label }) => (
              <div key={label}>
                <div className="font-display text-3xl font-bold text-white">{value}</div>
                <div className="text-white/35 text-xs uppercase tracking-widest font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ── Main content: Products + Client Projects (one continuous section) ── */}
      <section
        style={{ background: "linear-gradient(160deg, #fafaf8 0%, #f4f0ea 55%, #f8f5f1 100%)" }}
      >
        {/* Products anchor */}
        <div id="products" className="pt-24 pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-16">
            <span className="text-brand-gold text-[10px] font-bold tracking-[0.2em] uppercase block mb-3">
              Software Products
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy mb-4">
              Ready-to-Deploy
              <br />
              Business Software
            </h2>
            <p className="text-brand-muted text-lg leading-relaxed max-w-xl">
              Built by Brightex for specific industries — licensed to businesses and continuously improved. Try any product free for 7 days.
            </p>
          </FadeIn>

          {/* Live products */}
          {products.length > 0 && (
            <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
              {products.map((product) => (
                <StaggerChild key={product.id}>
                  <Link
                    href={`/products/${product.slug}`}
                    className="group block h-full rounded-sm border border-brand-border bg-white p-8 transition-colors hover:border-brand-gold/40 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                        {product.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-semibold tracking-widest uppercase">
                        {product.trialDays}-day trial
                      </span>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-brand-navy mb-3">
                      {product.name}
                    </h3>
                    <p className="text-brand-muted text-sm leading-relaxed mb-5">
                      {product.tagline || product.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {product.targetIndustries.slice(0, 3).map((industry) => (
                        <span
                          key={industry}
                          className="px-2.5 py-1 rounded-sm text-xs text-brand-muted border border-brand-border bg-brand-bg"
                        >
                          {industry}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-4 text-sm">
                      <span className="text-brand-navy font-semibold">{product.pricingFrom}</span>
                      <span className="inline-flex items-center gap-2 text-brand-gold font-semibold">
                        View product <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                </StaggerChild>
              ))}
            </FadeInStagger>
          )}

          {/* Coming soon block */}
          <FadeIn>
            <div className="relative overflow-hidden rounded-sm border border-brand-gold/20 bg-brand-navy p-12 sm:p-16 text-center">
              <div className="absolute inset-0 pointer-events-none opacity-10">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-brand-gold"
                    style={{ left: `${(i * 13 + 7) % 100}%`, top: `${(i * 17 + 11) % 100}%`, animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-brand-gold/5 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-brand-gold/8 pointer-events-none" />

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
                  Every product we ship starts as a real client problem — something solved so well it became software. The first wave is in active development.
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
                  <Link
                    href="/contact?intent=book_call"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm border border-white/20 text-white font-semibold text-sm hover:border-brand-gold/40 transition-colors"
                  >
                    Book a Discovery Call <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
        </div>{/* close id="products" */}

        {/* ── Section divider ── */}
        <div id="projects" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <FadeIn className="flex items-center gap-5">
            <div className="h-px flex-1 bg-brand-border" />
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-7 h-7 rounded-full bg-brand-gold/12 border border-brand-gold/30 flex items-center justify-center">
                <span className="text-brand-gold text-[9px] font-black">02</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-navy">
                Client Projects
              </span>
            </div>
            <div className="h-px flex-1 bg-brand-border" />
          </FadeIn>
        </div>

        {/* ── Client Projects list ── */}
        <div className="pb-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn className="mb-14">
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy mb-4">
                Projects We&apos;ve Shipped
              </h2>
              <p className="text-brand-muted leading-relaxed max-w-xl">
                Websites, platforms, and digital products built for businesses across Kenya and East Africa.
              </p>
            </FadeIn>
            <SectionErrorBoundary fallback={<p className="text-brand-muted py-16 text-center">Projects unavailable right now.</p>}>
              <ClientProjectsList projects={projects} />
            </SectionErrorBoundary>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-brand-navy">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">Ready to be next?</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
              Let&apos;s build something<br />
              <span className="text-brand-gold">you&apos;re proud of.</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-bold hover:bg-brand-gold-hover transition-colors"
              >
                Start a project
              </Link>
              <Link
                href="/contact?intent=book_call"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm border border-white/15 text-white text-sm font-medium hover:border-white/35 hover:bg-white/[0.04] transition-all"
              >
                Book a call
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  );
}
