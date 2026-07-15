"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar, MessageSquare, Briefcase, ArrowLeft, ArrowRight, Globe, Smartphone, Cog, Palette, Users, Wrench, Bot, ClipboardList } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";
import { BookingForm } from "@/components/public/booking-form";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { whatsappUrl } from "@/lib/constants";

type Intent = "book_call" | "general" | "service";

const INTENTS: { value: Intent; icon: typeof Calendar; title: string; description: string }[] = [
  { value: "book_call", icon: Calendar, title: "Book a Consultation", description: "A focused 30-minute call to talk through your project — no obligation." },
  { value: "general", icon: MessageSquare, title: "General Inquiry", description: "Have a question, or just want to say hello? Send us a message." },
  { value: "service", icon: Briefcase, title: "Inquiry About a Specific Service", description: "Tell us exactly what you need — we'll ask the right questions." },
];

const SERVICES: { value: string; label: string; icon: typeof Globe; sub: string }[] = [
  { value: "website", label: "Website / Web App", icon: Globe, sub: "New site, redesign, or web application" },
  { value: "mobile", label: "Mobile App", icon: Smartphone, sub: "iOS, Android, or both" },
  { value: "erp", label: "Software / ERP System", icon: Cog, sub: "Custom software or business management system" },
  { value: "design", label: "Design & Branding", icon: Palette, sub: "Logo, brand identity, graphics, or marketing materials" },
  { value: "consultancy", label: "Business Consultancy", icon: Users, sub: "Strategy, digital transformation, or advisory" },
  { value: "ai_automation", label: "AI & Automation", icon: Bot, sub: "AI assistants, workflow automation, or integrations" },
  { value: "other", label: "Something Else", icon: Wrench, sub: "Tell us what you have in mind" },
];

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-navy transition-colors mb-6"
    >
      <ArrowLeft size={13} /> Back
    </button>
  );
}

function ContactExperienceInner() {
  const searchParams = useSearchParams();
  const rawIntent = searchParams.get("intent");
  const validIntent: Intent | null = INTENTS.some((i) => i.value === rawIntent) ? (rawIntent as Intent) : null;

  const [intent, setIntent] = useState<Intent | null>(validIntent);
  const [service, setService] = useState<string | null>(null);

  // The ?intent= param isn't reliably known on the very first render of a
  // statically-rendered page (useSearchParams resolves after hydration) —
  // re-sync once it does, without clobbering a manual "Back" click afterwards.
  const [syncedIntent, setSyncedIntent] = useState(validIntent);
  if (validIntent !== syncedIntent) {
    setSyncedIntent(validIntent);
    if (validIntent) setIntent(validIntent);
  }

  // ── Step: pick intent ──────────────────────────────────────────────────
  if (!intent) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">How can we help?</h2>
        <p className="text-sm text-brand-muted mb-8">Pick what best describes why you&apos;re reaching out.</p>
        <div className="space-y-3">
          {INTENTS.map(({ value, icon: Icon, title, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setIntent(value)}
              className="w-full flex items-start gap-4 p-5 rounded-xl border border-brand-border bg-white hover:border-brand-gold/50 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-brand-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-navy">{title}</p>
                <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">{description}</p>
              </div>
              <ArrowRight size={15} className="text-brand-muted/40 group-hover:text-brand-gold transition-colors shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: book a consultation ──────────────────────────────────────────
  if (intent === "book_call") {
    return (
      <div>
        <BackButton onClick={() => setIntent(null)} />
        <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">Pick your preferred time</h2>
        <p className="text-sm text-brand-muted mb-8">We&apos;ll confirm the slot with a calendar invite within 24 hours.</p>
        <SectionErrorBoundary
          fallback={
            <div className="py-10 text-center">
              <p className="text-brand-muted mb-4 text-sm">The form is temporarily unavailable.</p>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold">
                Book via WhatsApp
              </a>
            </div>
          }
        >
          <BookingForm variant="embedded" />
        </SectionErrorBoundary>
      </div>
    );
  }

  // ── Step: general inquiry ──────────────────────────────────────────────
  if (intent === "general") {
    return (
      <div>
        <BackButton onClick={() => setIntent(null)} />
        <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">Send a message</h2>
        <p className="text-sm text-brand-muted mb-8">Fill in the details and we&apos;ll come back with a clear plan within 24 hours.</p>
        <SectionErrorBoundary
          fallback={
            <div className="py-10 text-center">
              <p className="text-brand-muted mb-4 text-sm">The form is temporarily unavailable.</p>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold">
                Reach us on WhatsApp
              </a>
            </div>
          }
        >
          <ContactForm variant="embedded" hideService />
        </SectionErrorBoundary>
      </div>
    );
  }

  // ── Step: specific service — pick which, then hand off to the full intake questionnaire ──
  if (!service) {
    return (
      <div>
        <BackButton onClick={() => setIntent(null)} />
        <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">Which service?</h2>
        <p className="text-sm text-brand-muted mb-8">We&apos;ll ask a few quick, relevant questions so we can give you an accurate plan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICES.map(({ value, label, icon: Icon, sub }) => (
            <button
              key={value}
              type="button"
              onClick={() => setService(value)}
              className="flex items-start gap-3 p-4 rounded-xl border border-brand-border bg-white hover:border-brand-gold/50 hover:shadow-sm transition-all text-left"
            >
              <Icon size={17} className="text-brand-gold shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-navy">{label}</p>
                <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-brand-border flex items-center justify-between gap-3">
          <p className="text-xs text-brand-muted">Not sure which fits, or need something broader?</p>
          <Link
            href="/intake"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy hover:text-brand-gold transition-colors"
          >
            <ClipboardList size={13} /> Go straight to our full intake form
          </Link>
        </div>
      </div>
    );
  }

  const chosen = SERVICES.find((s) => s.value === service)!;
  return (
    <div>
      <BackButton onClick={() => setService(null)} />
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
          <chosen.icon size={17} className="text-brand-gold" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-navy mb-1">{chosen.label}</h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            Good choice. Next, a short questionnaire tailored to {chosen.label.toLowerCase()} projects, so we understand exactly what you need before we quote.
          </p>
        </div>
      </div>
      <Link
        href={`/intake?service=${service}`}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-navy text-white font-bold text-sm hover:bg-brand-navy-hover transition-colors"
      >
        Continue to questionnaire <ArrowRight size={15} />
      </Link>
      <p className="text-[11px] text-brand-muted/70 text-center mt-3">Takes about 3 minutes — no account needed.</p>
    </div>
  );
}

export function ContactExperience() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-border/20" />}>
      <ContactExperienceInner />
    </Suspense>
  );
}
