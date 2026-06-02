import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ContactForm } from "@/components/public/contact-form";
import { FadeIn } from "@/components/public/fade-in";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
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
  description:
    "Get in touch with Brightex Solutions. Tell us about your project and we'll respond within 24 hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1fr]">

      {/* ── Left panel — navy brand panel ── */}
      <div className="relative bg-brand-navy overflow-hidden flex flex-col pt-32 pb-16 px-8 sm:px-12 lg:px-16">
        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute top-40 -right-8 w-48 h-48 rounded-full border border-brand-gold/8 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-brand-gold/3 pointer-events-none" />

        <FadeIn className="relative flex flex-col gap-10 flex-1">
          {/* Eyebrow + heading */}
          <div>
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase block mb-5">
              Get in Touch
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
              Tell us about
              <br />
              your project.
            </h1>
            <p className="text-white/55 text-lg leading-relaxed max-w-md">
              Whether you know exactly what you need or you're still figuring it out — we'd love to hear from you. We reply within 24 hours.
            </p>
          </div>

          {/* Divider */}
          <div className="w-12 h-px bg-brand-gold/40" />

          {/* Contact details */}
          <div className="space-y-5">
            <ContactDetail icon={Phone} label="Phone" value={BUSINESS_PHONE} href={`tel:${BUSINESS_PHONE}`} />
            <ContactDetail icon={Mail} label="Email" value={BUSINESS_EMAIL} href={`mailto:${BUSINESS_EMAIL}`} />
            <ContactDetail icon={MapPin} label="Location" value={`${BUSINESS_CITY}, ${BUSINESS_COUNTRY}`} />
            <ContactDetail icon={Clock} label="Hours" value={OPERATING_HOURS} />
          </div>

          {/* WhatsApp CTA */}
          <div className="mt-auto pt-4">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">Prefer WhatsApp?</p>
            <a
              href={whatsappUrl("Hi Godwin, I was on the Brightex website and I'd like to discuss a project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-3 rounded-sm bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
              <span className="ml-auto text-[#25D366]/60 text-xs font-normal">
                Replies in {WHATSAPP_REPLY_TIME}
              </span>
            </a>
          </div>
        </FadeIn>
      </div>

      {/* ── Right panel — form ── */}
      <div className="bg-brand-bg dark:bg-brand-navy-dark flex items-start lg:items-center pt-12 lg:pt-24 pb-16 px-8 sm:px-12 lg:px-16">
        <FadeIn direction="right" className="w-full max-w-xl mx-auto">
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
            <ContactForm />
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
        <div className="text-white/35 text-[10px] font-semibold uppercase tracking-widest mb-0.5">{label}</div>
        {href ? (
          <a href={href} className="text-white/85 text-sm hover:text-brand-gold transition-colors">
            {value}
          </a>
        ) : (
          <span className="text-white/85 text-sm">{value}</span>
        )}
      </div>
    </div>
  );
}
