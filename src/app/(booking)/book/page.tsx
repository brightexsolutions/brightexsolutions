import type { Metadata } from "next";
import { FadeIn } from "@/components/public/fade-in";
import { BookingForm } from "@/components/public/booking-form";
import { whatsappUrl } from "@/lib/constants";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book a Call | Brightex Solutions",
  description: "Schedule a call with Godwin to discuss your project.",
};

export default function BookPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 bg-brand-navy bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&w=1920&q=80')" }}
      >
        <div className="absolute inset-0 bg-brand-navy/87" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-4 block">
              Schedule a Call
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Book a Call
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Let&apos;s talk about your project. Choose a time that works for you.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Booking content */}
      <section className="py-24 bg-brand-bg dark:bg-brand-navy-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
            <FadeIn>
              <BookingForm />
            </FadeIn>

            <FadeIn direction="right">
              <div className="rounded-sm bg-brand-navy text-white p-8 overflow-hidden relative">
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/8 pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full border border-brand-gold/10 pointer-events-none" />

                <div className="relative space-y-6">
                  <div>
                    <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-3">
                      Before We Talk
                    </p>
                    <h2 className="font-display text-3xl font-bold mb-3">
                      A faster first conversation.
                    </h2>
                    <p className="text-white/65 leading-relaxed">
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
                        <span className="mt-1 h-2 w-2 rounded-full bg-brand-gold shrink-0" />
                        <p className="text-sm text-white/75">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-3">
                      Need a quicker route?
                    </p>
                    <a
                      href={whatsappUrl("Hi Godwin, I'd like to book a call to discuss my project.")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#25D366] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
