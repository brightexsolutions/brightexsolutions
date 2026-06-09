import Link from "next/link";
import { Counter } from "./counter";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";
import { ArrowRight } from "lucide-react";

const stats = [
  { value: 50, suffix: "+", label: "Projects Delivered" },
  { value: 5, suffix: "+", label: "Years Building" },
  { value: 20, suffix: "+", label: "Happy Clients" },
  { value: 7, suffix: "", label: "Service Lines" },
];

type HeroAnnouncement = { id: string; title: string; body?: string | null; cta_label?: string | null; cta_url?: string | null } | null;

export function Hero({ announcement }: { announcement?: HeroAnnouncement }) {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-navy bg-cover bg-center"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=80')" }}
    >
      {/* Navy overlay to maintain brand colors */}
      <div className="absolute inset-0 bg-brand-navy/88" />

      {/* Gradient mesh + decorative circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,168,37,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-linear-to-t from-brand-navy to-transparent" />
        <div className="absolute top-1/4 right-[8%] w-72 h-72 rounded-full border border-white/5" />
        <div className="absolute top-1/4 right-[8%] w-48 h-48 translate-x-12 translate-y-12 rounded-full border border-white/5" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-brand-gold/5" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center">
        {/* Announcement chip (from admin announcements with home_hero location) */}
        {announcement && (
          <FadeIn delay={0}>
            <div className="flex justify-center mb-4">
              {announcement.cta_url ? (
                <Link
                  href={announcement.cta_url}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-semibold tracking-wide hover:bg-white/15 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {announcement.title}
                  {announcement.cta_label && (
                    <span className="text-brand-gold">· {announcement.cta_label} →</span>
                  )}
                </Link>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {announcement.title}
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {/* Badge */}
        <FadeIn delay={announcement ? 0.05 : 0}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-brand-gold text-xs font-semibold tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
            Nairobi · Africa-Focused · Globally Capable
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.1}>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[1.05] tracking-tight mb-6">
            Digital Solutions
            <br />
            <span className="text-brand-gold">Built to Grow</span>
            <br />
            Your Business
          </h1>
        </FadeIn>

        {/* Sub */}
        <FadeIn delay={0.2}>
          <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            We build websites, platforms, ERP systems, and AI-powered tools for
            businesses across Kenya and East Africa — from concept to launch.
          </p>
        </FadeIn>

        {/* CTAs */}
        <FadeIn delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
            >
              Start a Project
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm border border-white/20 text-white/80 font-semibold text-sm hover:border-white/40 hover:text-white transition-colors"
            >
              See What We Do
            </Link>
          </div>
        </FadeIn>

        {/* Stats */}
        <FadeInStagger className="grid grid-cols-2 sm:grid-cols-4 gap-8 border-t border-white/10 pt-12" viewportMargin="0px">
          {stats.map((s) => (
            <StaggerChild key={s.label}>
              <div className="text-center">
                <div className="font-display text-4xl font-bold text-white mb-1">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="text-white/50 text-xs tracking-wider uppercase">
                  {s.label}
                </div>
              </div>
            </StaggerChild>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
