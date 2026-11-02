import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle, Mail, CalendarDays, User, Users, CheckCircle2, MapPin, Code2, PenTool, Workflow, Sparkles, Plug, Compass } from "lucide-react";
import { FadeIn, FadeInStagger, StaggerChild } from "@/components/public/fade-in";
import { SHOWCASE_CLIENTS } from "@/lib/client-showcase";
import {
  SITE_NAME, SITE_URL, BUSINESS_PHONE, BUSINESS_CITY, BUSINESS_COUNTRY,
  SOCIAL_LINKEDIN, whatsappUrl,
} from "@/lib/constants";

export const revalidate = 3600;

const FOUNDER = {
  email: "godwinochieng05@gmail.com",
  role: "Software Engineer · Full-Stack Developer · Product Designer",
  name: "Godwin Ochieng",
  title: "Lead at Brightex Solutions",
};

export const metadata: Metadata = {
  title: `${FOUNDER.name}, Software Engineer and ${FOUNDER.title}`,
  description: `${FOUNDER.name} is a software engineer and full-stack developer with hands-on product design skills, and leads Brightex Solutions, a technology consultancy in Nairobi building websites, ERP systems and AI tools. Hire Godwin directly or the Brightex team.`,
  alternates: { canonical: "/about" },
  openGraph: { type: "profile", title: `${FOUNDER.name} | ${SITE_NAME}`, url: `${SITE_URL}/about` },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: FOUNDER.name,
  jobTitle: "Software Engineer",
  hasOccupation: [
    { "@type": "Occupation", name: "Software Engineer" },
    { "@type": "Occupation", name: "Full-Stack Developer" },
    { "@type": "Occupation", name: "Product Designer" },
  ],
  url: `${SITE_URL}/about`,
  email: `mailto:${FOUNDER.email}`,
  telephone: BUSINESS_PHONE,
  address: { "@type": "PostalAddress", addressLocality: BUSINESS_CITY, addressCountry: "KE" },
  worksFor: { "@type": "ProfessionalService", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
  knowsAbout: [
    "Software engineering", "Full-stack development", "Web development", "UI/UX design", "Product design",
    "AI integration", "System integrations", "API integrations", "ERP systems", "Technology consulting", "SEO",
    "TypeScript", "React", "Next.js", "Node.js", "Python", "FastAPI", "PostgreSQL", "Docker",
  ],
};

const SKILLS = [
  {
    icon: Code2,
    title: "Software engineering",
    body: "Full-stack web applications built to last, with clean code that a team can keep extending.",
    points: ["Front end, back end and APIs", "Databases, auth and payments", "Docker for consistent builds and deploys"],
  },
  {
    icon: PenTool,
    title: "Product and UI/UX design",
    body: "Interfaces designed around how people actually work, then built exactly as designed.",
    points: ["User flows and wireframes", "Design systems", "Brand and visual identity"],
  },
  {
    icon: Sparkles,
    title: "AI integration",
    body: "AI built into real workflows, with a person approving what matters and clear limits on what it may say.",
    points: ["Claude and Gemini integrations", "Assistants grounded in live data", "Drafting, summaries and digests"],
  },
  {
    icon: Plug,
    title: "Systems integration",
    body: "Connecting a business to the services it already relies on, so data moves without retyping.",
    points: ["M-Pesa (Daraja) and KRA eTIMS", "Trading and third-party platform APIs", "WhatsApp, SMS and email"],
  },
  {
    icon: Workflow,
    title: "Business systems",
    body: "ERPs, dashboards and internal tools that replace spreadsheets and give owners a clear view.",
    points: ["ERP and admin dashboards", "Orders, stock and finance", "Reporting and audit trails"],
  },
  {
    icon: Compass,
    title: "Technology consultancy",
    body: "A clear technical answer before you spend, from someone who builds these systems every day.",
    points: ["Platform and architecture choices", "Reviews of quotes and existing systems", "Roadmaps: what to build first"],
  },
];

const UPCOMING = [
  {
    name: "TradeBridge",
    kind: "Trading tool",
    body: "Fast order entry from TradingView analysis into MetaTrader 5. Every order passes an explicit confirm step, and an optional AI market digest summarises the day's calendar and news without giving advice.",
    stack: ["Python", "FastAPI", "React", "MetaApi", "AI digest"],
  },
  {
    name: "DesignScents",
    kind: "E-commerce",
    body: "An online perfume shop for a Nairobi brand: catalogue with a scent-finder quiz, cart and checkout with M-Pesa, delivery across all 47 counties, and its own admin for orders, stock and promotions.",
    stack: ["Next.js", "Supabase", "M-Pesa", "Admin dashboard"],
  },
];

const STACK = [
  "Next.js", "React", "TypeScript", "Node.js", "Python", "FastAPI", "PostgreSQL", "Supabase",
  "Tailwind CSS", "Docker", "Claude and Gemini APIs", "WordPress", "Vercel",
];

const PATHS = [
  {
    icon: User,
    eyebrow: "Work with Godwin",
    title: "Engineering, design and advice",
    body: "Bring me in to design and build a product hands-on, to lead the technical side of your project, or for a clear answer before you spend: choosing a platform, reviewing a quote, or planning what to build first.",
    points: ["One-to-one advisory calls", "Hands-on full-stack development and design", "Review of an existing website or system", "Technical lead on your project"],
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
            <p className="mt-4 text-xl text-brand-gold font-medium">{FOUNDER.role}</p>
            <p className="mt-1 text-white/65">{FOUNDER.title}</p>
            <p className="mt-6 text-white/75 text-lg leading-relaxed max-w-xl">
              I&apos;m a software engineer and full-stack developer, and I design the products I build too.
              I take them end to end, from the first sketch of the interface to the database, the APIs and
              the integrations that make a system useful day to day.
            </p>
            <p className="mt-4 text-white/75 text-lg leading-relaxed max-w-xl">
              I lead Brightex Solutions from Nairobi and work directly with every client, so the person who
              scopes your project is the same person accountable for delivering it.
            </p>
            <p className="mt-4 text-white/75 text-lg leading-relaxed max-w-xl">
              I don&apos;t do it alone. I work with a team of dedicated developers, designers and specialists,
              and on larger projects we join forces so each part is handled by someone who does it well and
              the whole system is delivered on time.
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
            <a href={`mailto:${FOUNDER.email}`} className="mt-5 inline-flex items-center gap-2 text-sm text-white/75 hover:text-white">
              <Mail size={15} /> {FOUNDER.email}
            </a>
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

      {/* What I do */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase">What I do</p>
            <h2 className="font-display text-4xl font-bold text-brand-navy mt-3">Engineering, design, AI and the systems in between</h2>
          </FadeIn>
          <FadeInStagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKILLS.map((sk) => (
              <StaggerChild key={sk.title}>
                <div className="h-full rounded-2xl border border-brand-border bg-brand-bg/50 p-6">
                  <span className="size-11 rounded-xl bg-brand-navy text-brand-gold flex items-center justify-center mb-5">
                    <sk.icon size={20} />
                  </span>
                  <h3 className="font-semibold text-brand-navy text-lg leading-snug mb-2">{sk.title}</h3>
                  <p className="text-sm text-brand-muted leading-relaxed mb-4">{sk.body}</p>
                  <ul className="space-y-1.5">
                    {sk.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-brand-text">
                        <CheckCircle2 size={15} className="text-brand-gold mt-0.5 shrink-0" />{pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerChild>
            ))}
          </FadeInStagger>

          <FadeIn className="mt-12 rounded-2xl bg-brand-navy px-6 py-6 sm:px-8 flex flex-col lg:flex-row lg:items-center gap-5">
            <p className="text-white font-semibold shrink-0">Tools I build with</p>
            <ul className="flex flex-wrap gap-2">
              {STACK.map((t) => (
                <li key={t} className="h-9 px-4 inline-flex items-center rounded-full bg-white/10 text-white/90 text-sm font-medium">{t}</li>
              ))}
            </ul>
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

      {/* In development */}
      <section className="py-20 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-10">
            <p className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Coming soon</p>
            <h2 className="font-display text-4xl font-bold text-brand-navy mt-3">In development now</h2>
            <p className="text-brand-muted mt-3">Two products I&apos;m building that launch soon.</p>
          </FadeIn>
          <FadeInStagger className="grid md:grid-cols-2 gap-5">
            {UPCOMING.map((u) => (
              <StaggerChild key={u.name}>
                <div className="relative h-full overflow-hidden rounded-3xl bg-brand-navy p-8 text-white">
                  <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-brand-gold/15 blur-2xl" />
                  <div className="relative flex items-center justify-between gap-3 mb-5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-white/65">{u.kind}</span>
                    <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-semibold">
                      <span className="size-1.5 rounded-full bg-brand-gold animate-pulse" /> Launching soon
                    </span>
                  </div>
                  <h3 className="relative font-display text-3xl font-bold mb-3">{u.name}</h3>
                  <p className="relative text-white/75 leading-relaxed mb-6">{u.body}</p>
                  <ul className="relative flex flex-wrap gap-2">
                    {u.stack.map((t) => (
                      <li key={t} className="h-8 px-3 inline-flex items-center rounded-full bg-white/10 text-white/85 text-xs font-medium">{t}</li>
                    ))}
                  </ul>
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
            <a href={`mailto:${FOUNDER.email}`} className="inline-flex items-center gap-2 mt-3 text-brand-gold font-medium hover:underline">
              <Mail size={16} /> {FOUNDER.email}
            </a>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={whatsappUrl("Hi Godwin, I'd like to talk to you about")} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href={`mailto:${FOUNDER.email}`} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/5">
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
