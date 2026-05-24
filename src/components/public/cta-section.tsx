import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { FadeIn } from "./fade-in";

export function CtaSection() {
  return (
    <section className="py-24 bg-[--color-brand-bg] dark:bg-[--color-brand-navy-dark] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,rgba(249,168,37,0.06),transparent)] animate-[pulse_6s_ease-in-out_infinite]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeIn>
          <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase mb-4 block">
            Ready to Start?
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-[--color-brand-navy] dark:text-white mb-6 leading-tight">
            Let's Build Something
            <br />
            Worth Talking About
          </h2>
          <p className="text-[--color-brand-muted] text-lg mb-10 max-w-xl mx-auto">
            Tell us about your project and we'll get back to you within 24 hours
            with a clear plan of action.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-[--color-brand-navy] dark:bg-[--color-brand-gold] text-white dark:text-[--color-brand-navy] font-semibold text-sm hover:bg-[--color-brand-navy-light] dark:hover:bg-[--color-brand-gold-hover] transition-colors"
            >
              Start a Conversation
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm border border-[--color-brand-border] dark:border-white/20 text-[--color-brand-navy] dark:text-white font-semibold text-sm hover:border-[--color-brand-navy]/40 transition-colors"
            >
              <Calendar size={16} />
              Book a Call
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
