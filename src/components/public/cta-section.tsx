import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { FadeIn } from "./fade-in";

export function CtaSection() {
  return (
    <section className="relative pt-16 pb-0 bg-brand-bg dark:bg-brand-navy-dark">
      {/* Floating cinematic card — negative bottom margin overlaps into footer */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mb-12">
        <FadeIn>
          <div className="relative rounded-lg overflow-hidden shadow-[0_32px_80px_-12px_rgba(15,25,45,0.6)]">

            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=80')" }}
            />

            {/* Cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/92 via-brand-navy/85 to-[#0d2545]/96" />

            {/* Subtle radial highlight on centre */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_70%,rgba(249,168,37,0.08),transparent)]" />

            {/* Content */}
            <div className="relative px-8 sm:px-16 lg:px-24 py-16 lg:py-20 text-center">
              <span className="inline-block px-3 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                Ready to Start?
              </span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
                Let&apos;s Build Something
                <br />
                <span className="text-brand-gold">Worth Talking About</span>
              </h2>
              <p className="text-white/55 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Tell us about your project and we&apos;ll get back to you within 24 hours with a clear plan of action.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm bg-brand-gold text-brand-navy font-bold text-sm hover:bg-brand-gold-hover transition-colors"
                >
                  Start a Conversation
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/contact?intent=book_call"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm border border-white/20 text-white font-semibold text-sm hover:bg-white/[0.06] hover:border-white/30 transition-colors"
                >
                  <Calendar size={15} />
                  Book a Call
                </Link>
              </div>
            </div>

          </div>
        </FadeIn>
      </div>
    </section>
  );
}
