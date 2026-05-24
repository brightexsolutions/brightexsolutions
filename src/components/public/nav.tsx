"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-brand-border"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src={
              scrolled
                ? "/assets/Brightex Solutions Logo-dark-v1-no-bg.png"
                : "/assets/Brightex Solutions Logo-light-v1-no-bg.png"
            }
            alt="Brightex Solutions"
            width={160}
            height={40}
            priority
            className="h-8 lg:h-10 w-auto transition-all duration-300"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                scrolled
                  ? "text-brand-text hover:text-brand-navy"
                  : "text-white/90 hover:text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-3">
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
              scrolled ? "text-brand-navy" : "text-white"
            )}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden bg-white border-t border-brand-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 text-sm font-medium text-brand-text hover:text-brand-navy hover:bg-brand-bg rounded-sm transition-colors"
              >
                {l.label}
              </Link>
            ))}
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
