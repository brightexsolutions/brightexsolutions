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
  description: "Get in touch with Brightex Solutions. Tell us about your project and we'll respond within 24 hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main
      className="min-h-screen pt-24"
      style={{ background: "linear-gradient(160deg, #fafaf8 0%, #f4f0ea 55%, #f8f5f1 100%)" }}
    >
      {/* ── Page header ── */}
      <FadeIn className="max-w-2xl mx-auto px-6 sm:px-8 pt-16 pb-14 text-center">
        <span className="text-brand-gold text-[10px] font-bold tracking-[0.22em] uppercase block mb-5">
          Get in Touch
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-navy leading-tight mb-4">
          Tell us about your project.
        </h1>
        <p className="text-brand-muted text-base leading-relaxed">
          Whether you know exactly what you need or you&apos;re still figuring it out — we&apos;d love to hear from you. We reply within 24 hours.
        </p>
      </FadeIn>

      {/* ── Two-column content ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16 items-start">

        {/* Left — contact info */}
        <FadeIn className="space-y-8">
          {/* Contact details */}
          <div className="space-y-5">
            {[
              { icon: Phone,       label: "Phone",    value: BUSINESS_PHONE,   href: `tel:${BUSINESS_PHONE}` },
              { icon: Mail,        label: "Email",    value: BUSINESS_EMAIL,   href: `mailto:${BUSINESS_EMAIL}` },
              { icon: MapPin,      label: "Location", value: `${BUSINESS_CITY}, ${BUSINESS_COUNTRY}` },
              { icon: Clock,       label: "Hours",    value: OPERATING_HOURS },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-brand-border flex items-center justify-center shrink-0 shadow-sm">
                  <Icon size={14} className="text-brand-gold" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-muted/60 mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm font-medium text-brand-navy hover:text-brand-gold transition-colors">
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-brand-navy">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-brand-border" />

          {/* WhatsApp */}
          <a
            href={whatsappUrl("Hi Brightex Solutions Team, I was on your website and I'd like to discuss a project.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 px-5 py-4 rounded-xl bg-white border border-brand-border hover:border-[#25D366]/40 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-[#25D366]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-navy">Chat on WhatsApp</p>
              <p className="text-xs text-brand-muted">Replies within {WHATSAPP_REPLY_TIME}</p>
            </div>
            <svg className="ml-auto w-4 h-4 text-brand-muted/40 group-hover:text-[#25D366] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>

          {/* Promises */}
          <div className="space-y-2.5">
            {[
              "We reply within 24 hours",
              "No sales pitch — just a conversation",
              "Clear scope and honest timeline from day one",
            ].map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-sm text-brand-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0" />
                {p}
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Right — form */}
        <FadeIn direction="right">
          <div className="bg-white rounded-2xl border border-brand-border shadow-[0_2px_24px_-4px_rgba(15,25,45,0.08)] p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">
              Send a message
            </h2>
            <p className="text-sm text-brand-muted mb-8">
              Fill in the details and we&apos;ll come back with a clear plan within 24 hours.
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
                    Reach us on WhatsApp
                  </a>
                </div>
              }
            >
              <ContactForm variant="embedded" />
            </SectionErrorBoundary>
          </div>
        </FadeIn>
      </div>
    </main>
  );
}
