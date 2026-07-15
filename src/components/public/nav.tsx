"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/public/logo";

const links = [
  { label: "Home", href: "/", exact: true },
  { label: "Services", href: "/services", exact: false },
  { label: "Our Work", href: "/work", exact: false },
  { label: "Blog", href: "/blog", exact: false },
  { label: "Contact", href: "/contact", exact: true },
];

// Routes where the top of the page is a full-width dark hero — nav starts transparent with white text
const DARK_HERO_ROUTES = ["/", "/services", "/work", "/blog"];

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Pages without a full-width dark hero (e.g. contact split layout) need a solid nav from the start
  const hasDarkHero = DARK_HERO_ROUTES.some((r) =>
    r === "/" ? pathname === "/" : pathname === r || pathname.startsWith(r + "/")
  );
  const solid = scrolled || !hasDarkHero;

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        solid
          ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-brand-border"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Logo inverted={!solid} />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => {
            const active = isActive(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-sm font-medium transition-colors relative",
                  solid
                    ? active
                      ? "text-brand-navy font-bold after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2px] after:bg-brand-gold after:rounded-full"
                      : "text-brand-text hover:text-brand-navy"
                    : active
                      ? "text-brand-gold font-semibold after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2px] after:bg-brand-gold after:rounded-full"
                      : "text-white/90 hover:text-white"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-2">
          <Link
            href="/contact?intent=book_call"
            className="hidden lg:inline-flex items-center px-5 py-2.5 rounded-sm text-sm font-semibold bg-brand-gold text-brand-navy hover:bg-brand-gold-hover transition-colors"
          >
            Book a Call
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "lg:hidden p-2 rounded-sm transition-colors",
              solid ? "text-brand-navy" : "text-white"
            )}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden bg-white dark:bg-brand-navy border-t border-brand-border dark:border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {links.map((l) => {
              const active = isActive(l.href, l.exact);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-3 py-3 text-sm font-medium rounded-sm transition-colors",
                    active
                      ? "text-brand-gold bg-brand-gold/8 font-semibold"
                      : "text-brand-text dark:text-white/80 hover:text-brand-navy dark:hover:text-white hover:bg-brand-bg dark:hover:bg-white/5"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link
              href="/contact?intent=book_call"
              onClick={() => setOpen(false)}
              className="mt-2 px-5 py-3 text-center text-sm font-semibold bg-brand-gold text-brand-navy rounded-sm hover:bg-brand-gold-hover transition-colors"
            >
              Book a Call
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
