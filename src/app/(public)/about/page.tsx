import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle, Mail, CalendarDays, User, Users, CheckCircle2, MapPin } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { SHOWCASE_CLIENTS } from "@/lib/client-showcase";
import {
  SITE_NAME, SITE_URL, BUSINESS_EMAIL, BUSINESS_PHONE, BUSINESS_CITY, BUSINESS_COUNTRY,
  SOCIAL_LINKEDIN, whatsappUrl,
} from "@/lib/constants";

export const revalidate = 3600;

const FOUNDER = {
  name: "Godwin Ochieng",
  title: "Lead at Brightex Solutions",
};

export const metadata: Metadata = {
  title: `${FOUNDER.name}, ${FOUNDER.title}`,
  description: `${FOUNDER.name} leads Brightex Solutions, a technology consultancy in Nairobi building websites, ERP systems and AI tools. Hire Godwin directly or the Brightex team.`,
  alternates: { canonical: "/about" },
  openGraph: { type: "profile", title: `${FOUNDER.name} | ${SITE_NAME}`, url: `${SITE_URL}/about` },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: FOUNDER.name,
  jobTitle: FOUNDER.title,
  url: `${SITE_URL}/about`,
  email: `mailto:${BUSINESS_EMAIL}`,
  telephone: BUSINESS_PHONE,
  address: { "@type": "PostalAddress", addressLocality: BUSINESS_CITY, addressCountry: "KE" },
  worksFor: { "@type": "ProfessionalService", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
  knowsAbout: ["Technology consulting", "Web development", "ERP systems", "System integrations", "AI automation", "SEO"],
};

const PATHS = [
  {
    icon: User,
    eyebrow: "Work with Godwin",
    title: "Advice and technical leadership",
    body: "For founders and managers who need a clear technical answer before they spend: choosing a platform, reviewing a quote or a system you already have, or planning what to build first.",
    points: ["One-to-one advisory calls", "Review of an existing website or system", "Technical lead on your project"],
    cta: { label: "Message Godwin on WhatsApp", href: whatsappUrl("Hi Godwin, I'd like to talk to you about") , external: true },
  },
  {
    icon: Users,
    eyebrow: "Hire the Brightex team",
    title: "Design, build and support",
    body: "For businesses ready to build: a website that brings in enquiries, an ERP connected to M-Pesa and KRA eTIMS, or automation that takes repetitive work off your staff.",
    points: ["Fixed quote and milestone payments", "Strategy, design and engineering in one team", "Support after launch"],
    cta: { label: "Start a project", href: "/contact", external: false },
  },
];

export default function AboutPage() {
  const initials = FOUNDER.name.split(" ").map((w) => w[0]).join("");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_80%_40%,rgba(249,168,37,0.18),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          <FadeIn>
            <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase mb-5">About</p>
            <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-[1.05] tracking-tight">
              {FOUNDER.name}
            </h1>
            <p className="mt-4 text-xl text-brand-gold font-medium">{FOUNDER.title}</p>
            <p className="mt-6 text-white/75 text-lg leading-relaxed max-w-xl">
              Godwin leads Brightex Solutions from Nairobi. He works directly with every client, from the
              first call through design, build and launch, so the person who scopes your project is the same
              person accountable for delivering it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={whatsappUrl("Hi Godwin, I'd like to talk to you about")}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm shadow-[0_10px_30px_-10px_rgba(249,168,37,0.8)] hover:bg-brand-gold-hover transition-colors"
              >
                <MessageCircle size={16} /> Talk to Godwin
              </a>
              <Link
                href="/contact?intent=book_call"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
              >
                <CalendarDays size={16} /> Book a call
              </Link>
            </div>
          </FadeIn>

          {/* Portrait placeholder: a monogram until a real photo is added to /public/images/godwin.webp */}
          <FadeIn direction="right" className="hidden lg:block">
            <div className="relative mx-auto w-[340px] h-[400px]">
              <div aria-hidden className="absolute inset-x-6 bottom-0 top-10 rounded-t-full bg-gradient-to-b from-brand-gold to-brand-gold-hover" />
              <div aria-hidden className="absolute inset-0 rounded-t-full border border-white/10" />
              <div className="absolute inset-x-6 bottom-0 top-10 flex items-center justify-center">
                <span className="font-display text-[9rem] font-bold text-brand-navy/90 leading-none">{initials}</span>
              </div>
              <div className="absolute -left-6 bottom-12 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-xl">
                <MapPin size={16} className="text-brand-navy" />
                <span className="text-sm font-semibold text-brand-navy">{BUSINESS_CITY}, {BUSINESS_COUNTRY}</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Two ways to hire */}
      <section className="py-20 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Hire Godwin or the team</p>
            <h2 className="font-display text-4xl font-bold text-brand-navy mt-3">Two ways to work together</h2>
          </FadeIn>
          <FadeInStagger className="grid md:grid-cols-2 gap-5">
            {PATHS.map((p) => (
              <StaggerChild key={p.eyebrow}>
                <div className="h-full flex flex-col rounded-3xl bg-white border border-brand-border p-8 shadow-[0_20px_50px_-30px_rgba(21,34,56,0.35)]">
                  <span className="size-12 rounded-2xl bg-brand-navy text-brand-gold flex items-center justify-center mb-6">
                    <p.icon size={22} />
                  </span>
                  <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase">{p.eyebrow}</p>
                  <h3 className="font-display text-2xl font-bold text-brand-navy mt-2 mb-3">{p.title}</h3>
                  <p className="text-brand-muted leading-relaxed mb-5">{p.body}</p>
                  <ul className="space-y-2.5 mb-8">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-sm text-brand-text">
                        <CheckCircle2 size={17} className="text-brand-gold mt-0.5 shrink-0" />{pt}
                      </li>
                    ))}
                  </ul>
                  {p.cta.external ? (
                    <a href={p.cta.href} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-2 self-start px-6 py-3 rounded-full bg-brand-navy text-white font-semibold text-sm hover:bg-brand-navy-hover transition-colors">
                      {p.cta.label} <ArrowRight size={15} />
                    </a>
                  ) : (
                    <Link href={p.cta.href} className="mt-auto inline-flex items-center gap-2 self-start px-6 py-3 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
                      {p.cta.label} <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </StaggerChild>
            ))}
          </FadeInStagger>
        </div>
      </section>

      {/* Work Godwin has led */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Selected work</p>
              <h2 className="font-display text-4xl font-bold text-brand-navy mt-3">Projects Godwin has led</h2>
            </div>
            <Link href="/work" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-gold">
              See all our work <ArrowRight size={15} />
            </Link>
          </FadeIn>
          <FadeInStagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SHOWCASE_CLIENTS.filter((c) => c.screenshot).slice(0, 3).map((c) => (
              <StaggerChild key={c.key}>
                <a href={c.url} target="_blank" rel="noopener" className="group block rounded-3xl overflow-hidden border border-brand-border bg-white hover:shadow-[0_24px_50px_-30px_rgba(21,34,56,0.45)] transition-shadow">
                  <div className="relative aspect-[16/10] overflow-hidden bg-brand-bg">
                    <Image src={c.screenshot!} alt={`${c.name} website`} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="p-5">
                    <p className="font-semibold text-brand-navy">{c.name}</p>
                    <p className="text-sm text-brand-muted">{c.sector}</p>
                  </div>
                </a>
              </StaggerChild>
            ))}
          </FadeInStagger>
        </div>
      </section>

      {/* Contact strip */}
      <section className="py-16 bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Want to hear from Godwin?</h2>
            <p className="text-white/70 mt-2">Pick whichever is easiest. Replies usually come the same day.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={whatsappUrl("Hi Godwin, I'd like to talk to you about")} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href={`mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent("For Godwin")}`} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/5">
              <Mail size={16} /> Email
            </a>
            <Link href="/contact?intent=book_call" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/5">
              <CalendarDays size={16} /> Book a call
            </Link>
            {SOCIAL_LINKEDIN && (
              <a href={`https://linkedin.com/company/${SOCIAL_LINKEDIN}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/5">
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
