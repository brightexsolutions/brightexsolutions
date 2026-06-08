import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking-form";
import { whatsappUrl } from "@/lib/constants";
import { ArrowRight, CalendarDays, MessageCircle } from "lucide-react";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book a Call | Brightex Solutions",
  description: "Schedule a discovery call with the Brightex Solutions team.",
};

export default function BookPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_480px]">

      {/* ── LEFT — form panel ── */}
      <div className="flex flex-col min-h-screen bg-[#f8f7f4] dark:bg-brand-navy-dark px-8 sm:px-12 lg:px-16 pt-28 lg:pt-32 pb-16">

        {/* Heading */}
        <div className="max-w-lg">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold block mb-3">
            Schedule a Call
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy dark:text-white leading-tight mb-3">
            Let&apos;s talk about<br />your project.
          </h1>
          <p className="text-brand-muted text-base leading-relaxed mb-8">
            Pick a preferred time and share a few details — we&apos;ll confirm the slot and come prepared.
          </p>

          {/* Quick trust signals */}
          <div className="flex flex-wrap gap-4 mb-10">
            {[
              { icon: CalendarDays, text: "Confirmed within 24h" },
              { icon: MessageCircle, text: "30 min session" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-brand-muted">
                <Icon size={13} className="text-brand-gold" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Thin rule */}
        <div className="w-10 h-[2px] bg-brand-gold/40 mb-8" />

        {/* The form */}
        <div className="max-w-lg flex-1">
          <BookingForm variant="embedded" />
        </div>

        {/* WhatsApp fallback */}
        <div className="max-w-lg mt-10 pt-6 border-t border-brand-border dark:border-white/10">
          <p className="text-[11px] text-brand-muted uppercase tracking-widest font-semibold mb-3">
            Prefer a quicker route?
          </p>
          <a
            href={whatsappUrl("Hi Brightex Solutions Team, I'd like to book a call to discuss my project.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#25D366] hover:opacity-80 transition-opacity"
          >
            Chat on WhatsApp instead
            <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {/* ── RIGHT — info card (unchanged per user) ── */}
      <div className="hidden lg:flex items-start pt-24 pb-16 px-10 bg-brand-navy">
        <div className="rounded-sm bg-white/5 border border-white/10 p-8 w-full relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/8 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full border border-brand-gold/10 pointer-events-none" />

          <div className="relative space-y-6">
            <div>
              <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-3">
                Before We Talk
              </p>
              <h2 className="font-display text-3xl font-bold text-white mb-3">
                A faster first conversation.
              </h2>
              <p className="text-white/65 leading-relaxed text-sm">
                The more context you share in your booking notes, the more useful the first call will be. We typically use these sessions for scope, timelines, budgets, and next steps.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Website, product, or service you need help with",
                "Your rough timeline or launch target",
                "Any existing site, app, or process we should review",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-gold shrink-0" />
                  <p className="text-sm text-white/75">{item}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/35 mb-3 uppercase tracking-widest font-semibold">What happens next</p>
              <div className="space-y-3">
                {[
                  { step: "01", text: "We review your booking details" },
                  { step: "02", text: "You get a calendar confirmation by email" },
                  { step: "03", text: "We meet, aligned and ready to move fast" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono text-brand-gold/50 mt-0.5 shrink-0">{step}</span>
                    <span className="text-sm text-white/60">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs uppercase tracking-widest text-white/35 font-semibold mb-3">
                Need a quicker route?
              </p>
              <a
                href={whatsappUrl("Hi Brightex Solutions Team, I'd like to book a call to discuss my project.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#25D366] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <MessageCircle size={15} />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
