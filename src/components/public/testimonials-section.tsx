"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "./fade-in";

const testimonials = [
  {
    quote:
      "Brightex delivered a platform that genuinely impressed our board. The attention to detail and speed of delivery was exceptional.",
    author: "James K.",
    role: "Director, Education Institution",
  },
  {
    quote:
      "They understood what we needed before we could even articulate it. The website they built has already generated new business for us.",
    author: "Amina W.",
    role: "CEO, Retail Brand",
  },
  {
    quote:
      "Working with Brightex felt like having an in-house tech team. Responsive, professional, and the results speak for themselves.",
    author: "Peter O.",
    role: "Founder, Hospitality Group",
  },
  {
    quote:
      "The ERP they built for us replaced three separate tools. Our team was up and running in days, not months.",
    author: "Sarah M.",
    role: "Operations Manager, NGO",
  },
];

export function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-24 bg-white dark:bg-[--color-brand-navy-dark] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-16">
          <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase">
            What Clients Say
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-[--color-brand-navy] dark:text-white mt-3">
            Results That Speak
          </h2>
        </FadeIn>
      </div>

      {/* Drag carousel — full bleed */}
      <motion.div
        ref={trackRef}
        className="flex gap-6 cursor-grab active:cursor-grabbing px-4 sm:px-8 lg:px-16 pb-4"
        drag="x"
        dragConstraints={{ right: 0, left: -((testimonials.length - 1) * 380) }}
        whileTap={{ cursor: "grabbing" }}
      >
        {testimonials.map((t) => (
          <div
            key={t.author}
            className="flex-shrink-0 w-80 sm:w-96 p-8 rounded-sm bg-[--color-brand-bg] dark:bg-[--color-brand-navy-light] border border-[--color-brand-border] dark:border-white/10 select-none"
          >
            {/* Quote mark */}
            <div className="font-display text-5xl text-[--color-brand-gold]/30 leading-none mb-4">
              &ldquo;
            </div>
            <p className="text-[--color-brand-text] dark:text-white/80 text-sm leading-relaxed mb-6">
              {t.quote}
            </p>
            <div>
              <div className="font-semibold text-[--color-brand-navy] dark:text-white text-sm">
                {t.author}
              </div>
              <div className="text-[--color-brand-muted] text-xs mt-0.5">
                {t.role}
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
