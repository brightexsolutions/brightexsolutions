import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking-form";
import { FadeIn } from "@/components/public/fade-in";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { whatsappUrl } from "@/lib/constants";
import { CalendarDays, Clock, MessageCircle, ShieldCheck, ArrowRight } from "lucide-react";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book a Call | Brightex Solutions",
  description: "Schedule a discovery call with the Brightex Solutions team.",
};

const nextSteps = [
  { step: "01", text: "We review your booking details" },
  { step: "02", text: "You get a calendar confirmation by email" },
  { step: "03", text: "We meet, aligned and ready to move fast" },
];

export default function BookPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1fr]">

      {/* ── Left — navy info panel ── */}
      <div className="relative bg-brand-navy overflow-hidden flex flex-col pt-32 pb-16 px-8 sm:px-12 lg:px-16">
        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute top-40 -right-8 w-48 h-48 rounded-full border border-brand-gold/8 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-brand-gold/3 pointer-events-none" />

        <FadeIn className="relative flex flex-col gap-10 flex-1">
          {/* Eyebrow + heading */}
          <div>
            <span className="text-brand-gold text-[10px] font-bold tracking-[0.2em] uppercase block mb-5">
              Book a Call
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
              Let&apos;s talk about
              <br />
              your project.
            </h1>
            <p className="text-white/55 text-lg leading-relaxed max-w-md">
              Pick a preferred time and share a few details — we&apos;ll come prepared with clear scope and honest next steps.
            </p>
          </div>

          {/* Trust signals */}
          <div className="space-y-3">
            {[
              { icon: CalendarDays, text: "Confirmed within 24 hours" },
              { icon: Clock, text: "30-minute focused session" },
              { icon: ShieldCheck, text: "No obligation, no sales pressure" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon size={15} className="text-brand-gold shrink-0" />
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>

          <div className="w-10 h-[2px] bg-brand-gold/40" />

          {/* What happens next */}
          <div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] mb-5">
              What happens next
            </p>
            <div className="space-y-4">
              {nextSteps.map(({ step, text }) => (
                <div key={step} className="flex items-start gap-4">
                  <span className="text-[10px] font-mono text-brand-gold/50 mt-0.5 shrink-0">{step}</span>
                  <span className="text-sm text-white/60 leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="mt-auto pt-2">
            <p className="text-white/35 text-[10px] uppercase tracking-[0.2em] font-bold mb-3">
              Prefer a quicker route?
            </p>
            <a
              href={whatsappUrl("Hi Brightex Solutions Team, I'd like to book a call to discuss my project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-3 rounded-sm bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/18 transition-colors group"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
              <ArrowRight size={12} className="ml-auto group-hover:translate-x-0.5 transition-transform text-[#25D366]/50" />
            </a>
          </div>
        </FadeIn>
      </div>

      {/* ── Right — form panel ── */}
      <div
        className="flex flex-col pt-12 lg:pt-32 pb-16 px-8 sm:px-12 lg:px-16"
        style={{
          background: "linear-gradient(145deg, #f8f7f4 0%, #f0ece5 60%, #ede8df 100%)",
        }}
      >
        <FadeIn direction="right" className="w-full max-w-xl mx-auto flex flex-col flex-1">
          <div className="mb-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold block mb-3">
              Schedule a Session
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy leading-tight">
              Pick your preferred time.
            </h2>
            <p className="text-brand-muted text-sm mt-2 leading-relaxed">
              Fill in the form and we&apos;ll confirm the slot with a calendar invite.
            </p>
          </div>

          <div className="w-8 h-[2px] bg-brand-gold/40 mb-8" />

          <SectionErrorBoundary
            fallback={
              <div className="p-8 rounded-sm bg-white border border-brand-border text-center">
                <p className="text-brand-muted mb-4">The form is temporarily unavailable.</p>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#25D366] text-white text-sm font-semibold"
                >
                  Book via WhatsApp
                </a>
              </div>
            }
          >
            <BookingForm variant="embedded" />
          </SectionErrorBoundary>
        </FadeIn>
      </div>

    </main>
  );
}
