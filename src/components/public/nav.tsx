"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", href: "/", exact: true },
  { label: "Services", href: "/services", exact: false },
  { label: "Products", href: "/products", exact: false },
  { label: "Blog", href: "/blog", exact: false },
  { label: "Contact", href: "/contact", exact: true },
];

// Routes where the top of the page is a full-width dark hero — nav starts transparent with white text
const DARK_HERO_ROUTES = ["/", "/services", "/products", "/blog", "/book"];

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

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
          <Image
            src={
              solid
                ? "/assets/Brightex Solutions Logo-dark-v1-no-bg.png"
                : "/assets/Brightex Solutions Logo-light-v1-no-bg.png"
            }
            alt="Brightex Solutions"
            width={200}
            height={50}
            priority
            className="h-10 lg:h-12 w-auto transition-all duration-300"
          />
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
                      ? "text-brand-gold font-semibold"
                      : "text-brand-text hover:text-brand-navy"
                    : active
                      ? "text-brand-gold font-semibold"
                      : "text-white/90 hover:text-white",
                  active && "after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-brand-gold after:rounded-full"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* CTA + Theme toggle + Mobile toggle */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "p-2 rounded-sm transition-colors",
                solid ? "text-brand-navy hover:bg-brand-bg" : "text-white/80 hover:text-white"
              )}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <Link
            href="/book"
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
              href="/book"
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
