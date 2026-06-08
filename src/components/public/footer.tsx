import Link from "next/link";
import { Logo } from "@/components/public/logo";
import {
  SITE_NAME,
  BUSINESS_PHONE,
  BUSINESS_EMAIL,
  BUSINESS_CITY,
  BUSINESS_COUNTRY,
  SOCIAL_FACEBOOK,
  SOCIAL_INSTAGRAM,
  SOCIAL_TIKTOK,
  SOCIAL_LINKEDIN,
  SOCIAL_TWITTER,
  whatsappUrl,
} from "@/lib/constants";

const services = [
  "Web Development",
  "UI/UX Design",
  "SEO & Growth",
  "Branding & Identity",
  "AI & Automation",
  "ERP Systems",
  "Technology Consultancy",
];

const navigation = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Book a Call", href: "/book" },
];

// ── Inline SVG helpers ────────────────────────────────────────────────────────

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-sm border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:border-brand-gold/50 hover:text-brand-gold hover:bg-brand-gold/8 transition-all duration-200"
    >
      {children}
    </a>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PublicFooter() {
  return (
    <footer className="bg-[#090f1a] text-white">

      {/* ── 1. CTA STRIP — cinematic background ────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2400&q=80')" }}
        />
        {/* Cinematic overlay — deep navy gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#090f1a]/96 via-[#090f1a]/88 to-[#090f1a]/80" />
        {/* Subtle gold radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_50%,rgba(249,168,37,0.06)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">

            {/* Headline */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-gold" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-gold/80">
                  {BUSINESS_CITY}, {BUSINESS_COUNTRY}
                </span>
              </div>
              <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.1] text-white">
                Let&apos;s build something
                <br />
                <span className="text-brand-gold">great together.</span>
              </h2>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 lg:shrink-0 lg:pb-1">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-bold hover:bg-brand-gold-hover transition-colors"
              >
                Start a project <IconArrow />
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-sm border border-white/15 text-white text-sm font-medium hover:border-white/35 hover:bg-white/[0.04] transition-all duration-200"
              >
                Book a call
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. COLUMNS ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1.4fr_1.4fr] gap-10 lg:gap-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo inverted className="mb-5" />
            <p className="text-white/40 text-sm leading-relaxed mb-7 max-w-[260px]">
              Nairobi-based digital agency building custom websites, platforms, AI tools, and ERP systems for businesses across Kenya and East Africa.
            </p>

            {/* Social row */}
            <div className="flex gap-2">
              {SOCIAL_FACEBOOK && (
                <SocialIcon href={`https://facebook.com/${SOCIAL_FACEBOOK}`} label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </SocialIcon>
              )}
              {SOCIAL_INSTAGRAM && (
                <SocialIcon href={`https://instagram.com/${SOCIAL_INSTAGRAM}`} label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </SocialIcon>
              )}
              {SOCIAL_TIKTOK && (
                <SocialIcon href={`https://tiktok.com/@${SOCIAL_TIKTOK}`} label="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z" />
                  </svg>
                </SocialIcon>
              )}
              {SOCIAL_LINKEDIN && (
                <SocialIcon href={`https://linkedin.com/company/${SOCIAL_LINKEDIN}`} label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </SocialIcon>
              )}
              {SOCIAL_TWITTER && (
                <SocialIcon href={`https://x.com/${SOCIAL_TWITTER}`} label="X (Twitter)">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.639L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                </SocialIcon>
              )}
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Navigate</p>
            <ul className="space-y-3.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/50 hover:text-white transition-colors leading-none"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Services</p>
            <ul className="space-y-3.5">
              {services.map((s) => (
                <li key={s}>
                  <Link
                    href="/services"
                    className="text-sm text-white/50 hover:text-white transition-colors leading-none"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Get in Touch</p>
            <ul className="space-y-4">
              <li>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <span className="mt-0.5 w-5 h-5 shrink-0 text-[#25D366]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.553 4.108 1.523 5.831L0 24l6.336-1.502A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.802 9.802 0 01-5.006-1.371l-.36-.214-3.72.882.93-3.626-.234-.373A9.77 9.77 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                    </svg>
                  </span>
                  <span>WhatsApp Chat</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${BUSINESS_PHONE}`}
                  className="flex items-start gap-3 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <span className="mt-0.5 w-5 h-5 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.72A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
                    </svg>
                  </span>
                  <span>{BUSINESS_PHONE}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS_EMAIL}`}
                  className="flex items-start gap-3 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <span className="mt-0.5 w-5 h-5 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <span className="break-all">{BUSINESS_EMAIL}</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/35">
                <span className="mt-0.5 w-5 h-5 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span>{BUSINESS_CITY}, {BUSINESS_COUNTRY}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── 3. BOTTOM BAR ───────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/25 tracking-wide">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[11px] text-white/25">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
            <span className="w-px h-3 bg-white/15" />
            <Link href="/contact" className="hover:text-white/50 transition-colors">Contact</Link>
          </div>
        </div>
      </div>

      {/* ── 4. WATERMARK ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: "clamp(5rem, 12vw, 9rem)" }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[20%] whitespace-nowrap select-none pointer-events-none">
          <span
            className="font-display font-black leading-none tracking-[-0.04em] text-white/[0.028]"
            style={{ fontSize: "clamp(5rem, 16vw, 14rem)" }}
          >
            Brightex
          </span>
        </div>
      </div>

    </footer>
  );
}
