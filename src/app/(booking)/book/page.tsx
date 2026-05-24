import type { Metadata } from "next";
import { FadeIn } from "@/components/public/fade-in";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book a Call | Brightex Solutions",
  description: "Schedule a call with Godwin to discuss your project.",
};

export default function BookPage() {
  return (
    <section className="pt-32 pb-24 min-h-screen bg-brand-bg dark:bg-brand-navy-dark">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">
            Schedule a Call
          </span>
          <h1 className="font-display text-5xl font-bold text-brand-navy dark:text-white mt-3 mb-4">
            Book a Call
          </h1>
          <p className="text-brand-muted text-lg">
            Booking system coming soon. In the meantime, reach out via WhatsApp.
          </p>
          <a
            href="https://wa.me/254741980127"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-8 py-4 rounded-sm bg-[#25D366] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Chat on WhatsApp
          </a>
        </FadeIn>
      </div>
    </section>
  );
}
