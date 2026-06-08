import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking-form";
import { FadeIn } from "@/components/public/fade-in";
import { whatsappUrl } from "@/lib/constants";
import { CalendarDays, Clock, MessageCircle, ShieldCheck, Users2 } from "lucide-react";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book a Call | Brightex Solutions",
  description: "Schedule a discovery call with the Brightex Solutions team.",
};

const trustItems = [
  { icon: CalendarDays, label: "Confirmed within 24h" },
  { icon: Clock, label: "30-min focused session" },
  { icon: ShieldCheck, label: "No obligation" },
  { icon: Users2, label: "Direct with Godwin" },
];

const nextSteps = [
  { step: "01", title: "Submit your request", body: "Fill in a few details about what you need help with." },
  { step: "02", title: "We confirm your slot", body: "Expect a calendar invite within 24 hours." },
  { step: "03", title: "We arrive prepared", body: "Brief review, clear agenda, zero time wasted." },
];

export default function BookPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px]">

      {/* ── LEFT — two-zone panel ── */}
      <div className="flex flex-col">

        {/* Zone A — navy hero */}
        <div className="relative bg-brand-navy overflow-hidden px-8 sm:px-12 lg:px-14 pt-28 lg:pt-32 pb-12">
          {/* Decorative geometry */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full border border-white/[0.04] pointer-events-none" />
          <div className="absolute top-40 -right-10 w-44 h-44 rounded-full border border-brand-gold/[0.07] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-brand-gold/[0.025] pointer-events-none" />

          <FadeIn className="relative max-w-xl">
            <span className="text-brand-gold text-[10px] font-bold tracking-[0.22em] uppercase block mb-5">
              Book a Call
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.05] mb-5">
              Let&apos;s talk
              <br />
              <span className="text-brand-gold">about your project.</span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-md mb-10">
              Pick a preferred time and share a few details — we&apos;ll come prepared with ideas, honest scope, and clear next steps.
            </p>

            {/* Trust grid */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {trustItems.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-sm px-4 py-3">
                  <Icon size={14} className="text-brand-gold shrink-0" />
                  <span className="text-white/65 text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* What happens next */}
            <div className="pt-6 border-t border-white/[0.08]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 mb-5">What happens next</p>
              <div className="space-y-5">
                {nextSteps.map(({ step, title, body }) => (
                  <div key={step} className="flex gap-4">
                    <span className="text-[10px] font-mono text-brand-gold/40 mt-0.5 shrink-0 w-6">{step}</span>
                    <div>
                      <p className="text-sm font-semibold text-white/80 mb-0.5">{title}</p>
                      <p className="text-xs text-white/40 leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Zone B — form zone */}
        <div className="flex-1 bg-[#f8f7f4] dark:bg-[#0d1928] px-8 sm:px-12 lg:px-14 py-10">
          <FadeIn direction="up" className="max-w-xl">
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold mb-2">Your details</p>
              <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white">
                Schedule your session
              </h2>
            </div>

            <BookingForm variant="embedded" />

            {/* WhatsApp fallback */}
            <div className="mt-8 pt-6 border-t border-brand-border dark:border-white/10 flex items-center gap-3">
              <MessageCircle size={14} className="text-[#25D366] shrink-0" />
              <p className="text-xs text-brand-muted">
                Prefer a quicker conversation?{" "}
                <a
                  href={whatsappUrl("Hi Brightex Solutions Team, I'd like to book a call to discuss my project.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#25D366] hover:opacity-80 transition-opacity"
                >
                  Chat on WhatsApp
                </a>
              </p>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ── RIGHT — info card (kept as-is, user approved) ── */}
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
