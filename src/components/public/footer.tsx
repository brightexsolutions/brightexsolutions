import Link from "next/link";
import Image from "next/image";

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
];

export function PublicFooter() {
  return (
    <footer className="bg-brand-navy-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Image
              src="/assets/Brightex Solutions Logo-light-v1-no-bg.png"
              alt="Brightex Solutions"
              width={150}
              height={38}
              className="h-9 w-auto mb-4"
            />
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Nairobi-based. Africa-focused. Globally capable. Building digital
              experiences that drive real business growth.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-sm bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-sm bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              {/* TikTok */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-sm bg-white/10 hover:bg-brand-gold flex items-center justify-center transition-colors"
                aria-label="TikTok"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Navigation
            </h3>
            <ul className="space-y-2.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 hover:text-brand-gold transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Services
            </h3>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s}>
                  <Link
                    href="/services"
                    className="text-sm text-white/70 hover:text-brand-gold transition-colors"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/254741980127"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 hover:text-brand-gold transition-colors flex items-center gap-2"
                >
                  <span className="text-[#25D366]">WhatsApp</span>
                  <span>+254 741 980 127</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+254741980127"
                  className="text-sm text-white/70 hover:text-brand-gold transition-colors"
                >
                  +254 741 980 127
                </a>
              </li>
              <li>
                <a
                  href="mailto:info.brightexsolutions@gmail.com"
                  className="text-sm text-white/70 hover:text-brand-gold transition-colors"
                >
                  info.brightexsolutions@gmail.com
                </a>
              </li>
              <li className="text-sm text-white/50">Nairobi, Kenya</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/40">
          <span>
            © {new Date().getFullYear()} Brightex Solutions. All rights
            reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
