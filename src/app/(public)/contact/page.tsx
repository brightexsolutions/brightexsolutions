import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ContactForm } from "@/components/public/contact-form";
import { FadeIn } from "@/components/public/fade-in";
import { Phone, Mail, MapPin, MessageCircle, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  BUSINESS_PHONE,
  BUSINESS_EMAIL,
  BUSINESS_CITY,
  BUSINESS_COUNTRY,
  OPERATING_HOURS,
  WHATSAPP_REPLY_TIME,
  whatsappUrl,
} from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Brightex Solutions. Tell us about your project and we'll respond within 24 hours.",
  alternates: { canonical: "/contact" },
};

const promises = [
  "We reply within 24 hours",
  "No sales pitch — just a conversation",
  "Clear scope and honest timeline from day one",
];

export default function ContactPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1fr]">

      {/* ── Left — gradient background with floating navy card ── */}
      <div
        className="flex items-center justify-center pt-32 pb-16 px-6 sm:px-10 lg:px-12"
        style={{ background: "linear-gradient(145deg, #f0ece5 0%, #e8e2d8 55%, #ede8df 100%)" }}
      >
        <FadeIn className="w-full max-w-md">
          <div className="relative bg-brand-navy rounded-sm overflow-hidden shadow-[0_24px_64px_-12px_rgba(15,25,45,0.45)] p-8 sm:p-10">
            {/* Decorative circles */}
            <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-brand-gold/3 pointer-events-none" />

            <div className="relative flex flex-col gap-8">
              {/* Eyebrow + heading */}
              <div>
                <span className="text-brand-gold text-[10px] font-bold tracking-[0.2em] uppercase block mb-4">
                  Get in Touch
                </span>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                  Tell us about
                  <br />
                  your project.
                </h1>
                <p className="text-white/55 text-sm leading-relaxed">
                  Whether you know exactly what you need or you&apos;re still figuring it out — we&apos;d love to hear from you.
                </p>
              </div>

              {/* Promise list */}
              <div className="space-y-3">
                {promises.map((p) => (
                  <div key={p} className="flex items-center gap-3">
                    <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                    <span className="text-white/70 text-sm">{p}</span>
                  </div>
                ))}
              </div>

              <div className="w-8 h-[2px] bg-brand-gold/40" />

              {/* Contact details */}
              <div className="space-y-3">
                <ContactDetail icon={Phone} label="Phone" value={BUSINESS_PHONE} href={`tel:${BUSINESS_PHONE}`} />
                <ContactDetail icon={Mail} label="Email" value={BUSINESS_EMAIL} href={`mailto:${BUSINESS_EMAIL}`} />
                <ContactDetail icon={MapPin} label="Location" value={`${BUSINESS_CITY}, ${BUSINESS_COUNTRY}`} />
                <ContactDetail icon={Clock} label="Hours" value={OPERATING_HOURS} />
              </div>

              {/* WhatsApp CTA */}
              <a
                href={whatsappUrl("Hi Brightex Solutions Team, I was on your website and I'd like to discuss a project.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-4 py-3 rounded-sm bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/18 transition-colors group"
              >
                <MessageCircle size={15} />
                Chat on WhatsApp
                <span className="ml-auto text-[#25D366]/50 text-xs font-normal">
                  Replies in {WHATSAPP_REPLY_TIME}
                </span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform text-[#25D366]/50" />
              </a>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* ── Right panel — form ── */}
      <div className="dark:bg-brand-navy-dark flex flex-col pt-12 lg:pt-32 pb-16 px-8 sm:px-12 lg:px-16" style={{ background: "linear-gradient(145deg, #f8f7f4 0%, #f0ece5 60%, #ede8df 100%)" }}>
        <FadeIn direction="right" className="w-full max-w-xl mx-auto flex flex-col flex-1">
          {/* Form heading */}
          <div className="mb-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold block mb-3">
              Send a Message
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-navy dark:text-white leading-tight">
              Start the conversation.
            </h2>
            <p className="text-brand-muted text-sm mt-2 leading-relaxed">
              Fill in the details below and we&apos;ll come back to you with a clear plan within 24 hours.
            </p>
          </div>

          <div className="w-8 h-[2px] bg-brand-gold/40 mb-8" />

          <SectionErrorBoundary
            fallback={
              <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border text-center">
                <p className="text-brand-muted mb-4">The form is temporarily unavailable.</p>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#25D366] text-white text-sm font-semibold"
                >
                  Reach us on WhatsApp
                </a>
              </div>
            }
          >
            <ContactForm variant="embedded" />
          </SectionErrorBoundary>
        </FadeIn>
      </div>

    </main>
  );
}

function ContactDetail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-sm bg-white/6 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} className="text-brand-gold" />
      </div>
      <div>
        <div className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5">{label}</div>
        {href ? (
          <a href={href} className="text-white/80 text-sm hover:text-brand-gold transition-colors">{value}</a>
        ) : (
          <span className="text-white/80 text-sm">{value}</span>
        )}
      </div>
    </div>
  );
}
