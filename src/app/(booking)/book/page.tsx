import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking-form";
import { FadeIn } from "@/components/public/fade-in";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { whatsappUrl } from "@/lib/constants";
import { CalendarDays, Clock, MessageCircle, ShieldCheck } from "lucide-react";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book a Call | Brightex Solutions",
  description: "Schedule a discovery call with the Brightex Solutions team.",
};

const trust = [
  { icon: CalendarDays, text: "Confirmed within 24 hours" },
  { icon: Clock,        text: "30-minute focused session" },
  { icon: ShieldCheck,  text: "No obligation, no sales pressure" },
];

export default function BookPage() {
  return (
    <main
      className="min-h-screen pt-24"
      style={{ background: "linear-gradient(160deg, #fafaf8 0%, #f4f0ea 55%, #f8f5f1 100%)" }}
    >
      {/* ── Page header ── */}
      <FadeIn className="max-w-xl mx-auto px-6 sm:px-8 pt-16 pb-10 text-center">
        <span className="text-brand-gold text-[10px] font-bold tracking-[0.22em] uppercase block mb-5">
          Book a Call
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy leading-tight mb-4">
          Let&apos;s talk about your project.
        </h1>
        <p className="text-brand-muted text-base leading-relaxed">
          Share a few details and we&apos;ll confirm a slot that works for you — with a clear agenda, not a sales pitch.
        </p>
      </FadeIn>

      {/* ── Trust signals ── */}
      <FadeIn className="max-w-xl mx-auto px-6 sm:px-8 pb-10">
        <div className="flex flex-wrap justify-center gap-3">
          {trust.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-brand-border text-sm text-brand-navy shadow-sm">
              <Icon size={13} className="text-brand-gold shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ── Form card ── */}
      <FadeIn className="max-w-xl mx-auto px-6 sm:px-8 pb-24">
        <div className="bg-white rounded-2xl border border-brand-border shadow-[0_2px_24px_-4px_rgba(15,25,45,0.08)] p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">
            Pick your preferred time
          </h2>
          <p className="text-sm text-brand-muted mb-8">
            We&apos;ll confirm the slot with a calendar invite within 24 hours.
          </p>
          <SectionErrorBoundary
            fallback={
              <div className="py-10 text-center">
                <p className="text-brand-muted mb-4 text-sm">The form is temporarily unavailable.</p>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold"
                >
                  Book via WhatsApp
                </a>
              </div>
            }
          >
            <BookingForm variant="embedded" />
          </SectionErrorBoundary>
        </div>
      </FadeIn>

      {/* ── WhatsApp alternative ── */}
      <FadeIn className="max-w-xl mx-auto px-6 sm:px-8 pb-20 text-center">
        <p className="text-xs text-brand-muted/60 uppercase tracking-[0.15em] font-semibold mb-4">
          Prefer a quicker route?
        </p>
        <a
          href={whatsappUrl("Hi Brightex Solutions Team, I'd like to book a call to discuss my project.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white border border-brand-border hover:border-[#25D366]/40 hover:shadow-md transition-all text-sm font-semibold text-brand-navy group"
        >
          <MessageCircle size={16} className="text-[#25D366]" />
          Chat with us on WhatsApp
        </a>
      </FadeIn>
    </main>
  );
}
