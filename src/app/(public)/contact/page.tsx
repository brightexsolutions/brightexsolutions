import type { Metadata } from "next";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ContactForm } from "@/components/public/contact-form";
import { FadeIn } from "@/components/public/fade-in";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Brightex Solutions. Tell us about your project and we'll respond within 24 hours.",
  alternates: { canonical: "/contact" },
};

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+254 741 980 127", href: "tel:+254741980127" },
  { icon: Mail, label: "Email", value: "info.brightexsolutions@gmail.com", href: "mailto:info.brightexsolutions@gmail.com" },
  { icon: MapPin, label: "Location", value: "Nairobi, Kenya", href: null },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-[--color-brand-navy]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl">
            <span className="text-[--color-brand-gold] text-xs font-semibold tracking-widest uppercase mb-4 block">
              Get in Touch
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Let's Talk About
              <br />
              Your Project
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Tell us what you're building and we'll get back to you within 24 hours
              with a clear assessment and next steps.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Content */}
      <section className="py-24 bg-[--color-brand-bg] dark:bg-[--color-brand-navy-dark]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16">
            {/* Left — contact info */}
            <FadeIn direction="left" className="space-y-10">
              <div>
                <h2 className="font-display text-2xl font-bold text-[--color-brand-navy] dark:text-white mb-6">
                  Contact Details
                </h2>
                <div className="space-y-5">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-sm bg-[--color-brand-gold]/10 flex items-center justify-center flex-shrink-0">
                        <item.icon size={18} className="text-[--color-brand-gold]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[--color-brand-muted] uppercase tracking-wider mb-1">
                          {item.label}
                        </div>
                        {item.href ? (
                          <a
                            href={item.href}
                            className="text-[--color-brand-navy] dark:text-white text-sm hover:text-[--color-brand-gold] transition-colors"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <span className="text-[--color-brand-navy] dark:text-white text-sm">
                            {item.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp direct */}
              <div className="p-6 rounded-sm bg-white dark:bg-[--color-brand-navy-light] border border-[--color-brand-border] dark:border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <MessageCircle size={20} className="text-[#25D366]" />
                  <span className="font-semibold text-[--color-brand-navy] dark:text-white text-sm">
                    Prefer WhatsApp?
                  </span>
                </div>
                <p className="text-[--color-brand-muted] text-sm mb-4 leading-relaxed">
                  Send us a message directly — we typically reply within 2 hours during business hours (Mon–Fri, 8am–6pm EAT).
                </p>
                <a
                  href="https://wa.me/254741980127?text=Hi%20Godwin%2C%20I%20was%20on%20the%20Brightex%20website%20and%20I%27d%20like%20to%20discuss%20a%20project."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </a>
              </div>
            </FadeIn>

            {/* Right — form */}
            <SectionErrorBoundary
              fallback={
                <div className="p-8 rounded-sm bg-white dark:bg-[--color-brand-navy-light] border border-[--color-brand-border] text-center">
                  <p className="text-[--color-brand-muted] mb-4">
                    The form is temporarily unavailable.
                  </p>
                  <a
                    href="https://wa.me/254741980127"
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
          </div>
        </div>
      </section>
    </>
  );
}
