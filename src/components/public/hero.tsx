import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SHOWCASE_CLIENTS } from "@/lib/client-showcase";
import { FadeIn } from "./fade-in";

type HeroAnnouncement = { id: string; title: string; body?: string | null; cta_label?: string | null; cta_url?: string | null } | null;

const CAPABILITIES = ["Websites that bring in enquiries", "ERP and business systems", "AI and workflow automation", "Technology consulting"];

export function Hero({ announcement }: { announcement?: HeroAnnouncement }) {
  return (
    <section className="relative overflow-hidden bg-brand-navy">
      {/* Brand backdrop: soft gold glow and a faint grid, no stock photography */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_0%,rgba(249,168,37,0.16),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000,transparent)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-16">
        {announcement && (
          <FadeIn className="mb-6">
            {announcement.cta_url ? (
              <Link
                href={announcement.cta_url}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-white text-xs font-medium hover:bg-white/10 transition-colors"
              >
                {announcement.title}
                {announcement.cta_label && <span className="text-brand-gold">{announcement.cta_label}</span>}
                <ArrowUpRight size={12} />
              </Link>
            ) : (
              <span className="inline-flex px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-white text-xs font-medium">
                {announcement.title}
              </span>
            )}
          </FadeIn>
        )}

        <div className="max-w-4xl">
          <FadeIn>
            <p className="text-brand-gold text-xs font-semibold tracking-[0.2em] uppercase mb-6">
              Technology consultancy in Nairobi, Kenya
            </p>
            <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
              We build the systems your business runs on.
            </h1>
          </FadeIn>

          <FadeIn delay={0.08}>
            <p className="mt-6 text-white/70 text-lg sm:text-xl max-w-2xl leading-relaxed">
              Websites that bring in enquiries, ERPs that replace the spreadsheets, and AI tools that take
              repetitive work off your team. Planned with you, built by us, supported after launch.
            </p>
          </FadeIn>

          <FadeIn delay={0.14}>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
              >
                Start a project
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/work"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/5 hover:border-white/40 transition-colors"
              >
                See our work
              </Link>
            </div>
          </FadeIn>

          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
            {CAPABILITIES.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-brand-gold" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Trusted by: real client logos, linked to the sites we built */}
        <div className="mt-20 border-t border-white/10 pt-8">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-[0.18em] mb-5">
            Trusted by
          </p>
          <ul className="flex flex-wrap items-center gap-3">
            {SHOWCASE_CLIENTS.map((c) => (
              <li key={c.key}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-2.5 h-12 rounded-xl bg-white/95 px-4 hover:bg-white transition-colors"
                >
                  <Image
                    src={c.logo}
                    alt={c.mark ? "" : c.name}
                    width={c.mark ? 28 : 96}
                    height={28}
                    className={c.mark ? "h-7 w-7 rounded object-contain" : "h-7 w-auto object-contain"}
                    style={c.mark ? undefined : { width: "auto" }}
                  />
                  {c.mark && <span className="text-[13px] font-semibold text-brand-navy">{c.name}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
