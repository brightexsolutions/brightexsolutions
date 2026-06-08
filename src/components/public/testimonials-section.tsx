"use client";

import { FadeIn, FadeInStagger, StaggerChild } from "./fade-in";

const testimonials = [
  {
    quote:
      "Brightex delivered a platform that genuinely impressed our board. The attention to detail and speed of delivery was exceptional.",
    author: "James K.",
    role: "Director, Education Institution",
    featured: true,
  },
  {
    quote:
      "They understood what we needed before we could even articulate it. The website they built has already generated new business for us.",
    author: "Amina W.",
    role: "CEO, Retail Brand",
    featured: false,
  },
  {
    quote:
      "Working with Brightex felt like having an in-house tech team. Responsive, professional, and the results speak for themselves.",
    author: "Peter O.",
    role: "Founder, Hospitality Group",
    featured: false,
  },
  {
    quote:
      "The ERP they built for us replaced three separate tools. Our team was up and running in days, not months.",
    author: "Sarah M.",
    role: "Operations Manager, NGO",
    featured: false,
  },
];

export function TestimonialsSection() {
  const [t1, t2, t3, t4] = testimonials;

  return (
    <section className="py-24 dark:bg-brand-navy-dark" style={{ background: "linear-gradient(175deg, #ffffff 0%, #f6f2ec 60%, #f9f6f2 100%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
            What Clients Say
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white mt-3">
            Results That Speak
          </h2>
        </FadeIn>

        {/* Creative bento grid */}
        <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">

          {/* Card 1 — featured, navy, spans 2 cols */}
          <StaggerChild className="md:col-span-2">
            <div className="relative h-full p-10 rounded-sm bg-brand-navy overflow-hidden group">
              {/* Decorative oversized quote */}
              <div className="absolute -top-4 -left-2 font-display text-[120px] leading-none text-brand-gold/10 pointer-events-none select-none">
                &ldquo;
              </div>
              <div className="relative">
                <p className="text-white/90 text-lg sm:text-xl leading-relaxed mb-8 font-light">
                  {t1.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold font-bold text-sm">
                    {t1.author[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{t1.author}</div>
                    <div className="text-white/50 text-xs">{t1.role}</div>
                  </div>
                </div>
              </div>
              {/* Gold corner accent */}
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-brand-gold/10 rounded-tl-[40px]" />
            </div>
          </StaggerChild>

          {/* Card 2 — right side top */}
          <StaggerChild>
            <div className="h-full p-7 rounded-sm bg-brand-bg dark:bg-brand-navy-light border border-brand-border dark:border-white/10 flex flex-col justify-between">
              <div className="font-display text-3xl text-brand-gold/40 leading-none mb-3">&ldquo;</div>
              <p className="text-brand-text dark:text-white/80 text-sm leading-relaxed flex-1">
                {t2.quote}
              </p>
              <div className="mt-5 pt-4 border-t border-brand-border dark:border-white/10">
                <div className="font-semibold text-brand-navy dark:text-white text-sm">{t2.author}</div>
                <div className="text-brand-muted text-xs mt-0.5">{t2.role}</div>
              </div>
            </div>
          </StaggerChild>

          {/* Card 3 — bottom left */}
          <StaggerChild>
            <div className="h-full p-7 rounded-sm bg-brand-bg dark:bg-brand-navy-light border border-brand-border dark:border-white/10 border-l-4 border-l-brand-gold flex flex-col justify-between">
              <p className="text-brand-text dark:text-white/80 text-sm leading-relaxed flex-1 italic">
                &ldquo;{t3.quote}&rdquo;
              </p>
              <div className="mt-5">
                <div className="font-semibold text-brand-navy dark:text-white text-sm">{t3.author}</div>
                <div className="text-brand-muted text-xs mt-0.5">{t3.role}</div>
              </div>
            </div>
          </StaggerChild>

          {/* Card 4 — bottom, spans 2 cols, gold-tinted */}
          <StaggerChild className="md:col-span-2">
            <div className="relative h-full p-8 rounded-sm bg-brand-gold/8 dark:bg-brand-gold/5 border border-brand-gold/20 overflow-hidden">
              <div className="absolute top-4 right-6 font-display text-6xl text-brand-gold/15 leading-none select-none">
                &rdquo;
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-brand-navy dark:bg-brand-gold flex items-center justify-center text-white dark:text-brand-navy font-bold text-lg shrink-0">
                  {t4.author[0]}
                </div>
                <div>
                  <p className="text-brand-text dark:text-white/85 text-base leading-relaxed mb-4">
                    {t4.quote}
                  </p>
                  <div className="font-semibold text-brand-navy dark:text-white text-sm">{t4.author}</div>
                  <div className="text-brand-muted text-xs mt-0.5">{t4.role}</div>
                </div>
              </div>
            </div>
          </StaggerChild>

        </FadeInStagger>
      </div>
    </section>
  );
}
