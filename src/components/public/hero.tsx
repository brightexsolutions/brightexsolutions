import Link from "next/link";
import Image from "next/image";
import { Counter } from "./counter";
import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";
import { ArrowRight, Plug, Globe2 } from "lucide-react";

const stats = [
  { value: 50, suffix: "+", label: "Projects Delivered" },
  { value: 5, suffix: "+", label: "Years Building" },
  { value: 20, suffix: "+", label: "Happy Clients" },
  { value: 7, suffix: "", label: "Service Lines" },
];

type HeroAnnouncement = { id: string; title: string; body?: string | null; cta_label?: string | null; cta_url?: string | null } | null;

export function Hero({ announcement }: { announcement?: HeroAnnouncement }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-brand-navy">
      {/* Optimised, prioritised background photo: it is the largest thing on the page */}
      <Image
        src="/images/hero-team.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Navy overlay keeps the brand colour; heavier on the left where the text sits */}
      <div className="absolute inset-0 bg-brand-navy/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/80 to-brand-navy/40" />

      {/* Gold light and fine rings for depth */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_75%_45%,rgba(249,168,37,0.20),transparent_70%)]" />
        <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-brand-navy to-transparent" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-brand-gold/10" />
        <div className="absolute top-28 left-[42%] w-2 h-2 rounded-full bg-brand-gold/60" />
        <div className="absolute top-[62%] left-[6%] w-1.5 h-1.5 rounded-full bg-white/40" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 lg:pt-36">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-6 items-center">

          {/* Copy */}
          <div className="text-center lg:text-left">
            {announcement && (
              <FadeIn className="mb-4">
                {announcement.cta_url ? (
                  <Link
                    href={announcement.cta_url}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-semibold tracking-wide backdrop-blur hover:bg-white/15 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {announcement.title}
                    {announcement.cta_label && <span className="text-brand-gold">· {announcement.cta_label} →</span>}
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-semibold tracking-wide backdrop-blur">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {announcement.title}
                  </div>
                )}
              </FadeIn>
            )}

            <FadeIn delay={announcement ? 0.05 : 0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-brand-gold text-xs font-semibold tracking-widest uppercase mb-7 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                Nairobi · Africa-Focused · Globally Capable
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-bold text-white leading-[1.02] tracking-tight mb-6">
                Digital Solutions
                <br />
                <span className="relative inline-block text-brand-gold">
                  Built to Grow
                  {/* Hand-drawn style underline */}
                  <svg aria-hidden viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute left-0 -bottom-2 w-full h-3 text-brand-gold/70">
                    <path d="M2 9 C 60 2, 140 2, 298 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                <br />
                Your Business
              </h1>
            </FadeIn>

            <FadeIn delay={0.16}>
              <p className="text-white/70 text-lg sm:text-xl max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed">
                We build websites, platforms, ERP systems, and AI-powered tools for
                businesses across Kenya and East Africa, from first idea to launch day.
              </p>
            </FadeIn>

            <FadeIn delay={0.22}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/contact"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm shadow-[0_10px_30px_-10px_rgba(249,168,37,0.8)] hover:bg-brand-gold-hover transition-colors"
                >
                  Start a Project
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/25 bg-white/5 text-white font-semibold text-sm backdrop-blur hover:bg-white/10 hover:border-white/40 transition-colors"
                >
                  See What We Do
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* Visual: cut-out figure standing on a gold arc, with two capability tags */}
          <FadeIn delay={0.12} direction="right" className="relative hidden lg:block">
            <div className="relative mx-auto w-[420px] h-[520px]">
              <div aria-hidden className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-b from-brand-gold to-brand-gold-hover" />
              <div aria-hidden className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[470px] h-[470px] rounded-full border border-brand-gold/30" />
              <div aria-hidden className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[540px] h-[540px] rounded-full border border-white/10" />
              <Image
                src="/images/people/builder-laptop.webp"
                alt="A smiling developer holding a laptop"
                width={764}
                height={944}
                priority
                sizes="420px"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[500px] w-auto drop-shadow-[0_24px_40px_rgba(8,15,28,0.55)]"
              />
              <div className="absolute top-20 -left-10 flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-xl">
                <span className="size-9 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center"><Plug size={17} /></span>
                <span>
                  <span className="block text-sm font-semibold text-brand-navy leading-tight">M-Pesa &amp; eTIMS</span>
                  <span className="block text-xs text-brand-muted">Integrated into your ERP</span>
                </span>
              </div>
              <div className="absolute bottom-24 -right-8 flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-xl">
                <span className="size-9 rounded-xl bg-brand-gold text-brand-navy flex items-center justify-center"><Globe2 size={17} /></span>
                <span>
                  <span className="block text-sm font-semibold text-brand-navy leading-tight">Found on Google</span>
                  <span className="block text-xs text-brand-muted">SEO built in from day one</span>
                </span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Stats in glass tiles */}
        <FadeInStagger className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <StaggerChild key={s.label}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur px-5 py-5 text-center lg:text-left">
                <div className="font-display text-4xl font-bold text-white mb-1">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div className="text-white/65 text-xs tracking-wider uppercase">{s.label}</div>
              </div>
            </StaggerChild>
          ))}
        </FadeInStagger>
      </div>
    </section>
  );
}
