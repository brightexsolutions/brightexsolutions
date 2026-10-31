"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone, Mail, MapPin, ExternalLink, Save,
  Hash, BarChart2, Building2, FileText,
  CheckCircle2, AlertCircle, ChevronRight, Image, Upload, X, Loader2,
  Bot, MailOpen, PenLine,
} from "lucide-react";
import { CLAUDE_MODEL_OPTIONS, GEMINI_MODEL_OPTIONS, AI_MODELS } from "@/lib/ai-models";
import type { AIProvider } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SignatureSettings } from "@/components/admin/signature-settings";

const sections = [
  { id: "business", group: "Company", label: "Business", icon: Building2, description: "Name, tagline and location used across the site and documents." },
  { id: "contact", group: "Company", label: "Contact", icon: Phone, description: "How clients reach you: email, phone, WhatsApp and booking." },
  { id: "brand", group: "Company", label: "Brand assets", icon: Image, description: "Logo variants and where each one appears." },
  { id: "invoice", group: "Money", label: "Invoices and payments", icon: FileText, description: "Payment methods and bank details printed on invoices." },
  { id: "social", group: "Channels", label: "Social media", icon: Hash, description: "Handles linked from the website footer and structured data." },
  { id: "integrations", group: "Channels", label: "Integrations", icon: BarChart2, description: "Analytics and scheduled jobs." },
  { id: "signature", group: "Documents", label: "Signature", icon: PenLine, description: "Your countersignature on agreements." },
  { id: "ai", group: "Documents", label: "AI", icon: Bot, description: "Provider, model and whether AI drafting is on." },
] as const;
const SECTION_GROUPS = ["Company", "Money", "Channels", "Documents"] as const;
type Section = (typeof sections)[number]["id"];

const LOGO_PLACEMENTS = [
  { key: "site_header", label: "Site header (public nav)" },
  { key: "site_footer", label: "Site footer" },
  { key: "invoices", label: "PDF invoices" },
  { key: "reports", label: "Finance reports" },
  { key: "documents", label: "All documents" },
] as const;
type LogoPlacement = (typeof LOGO_PLACEMENTS)[number]["key"];

type LogoVariant = {
  url: string;
  placements: LogoPlacement[];
};

type LogoAssets = {
  dark: LogoVariant;   // dark logo (for light backgrounds)
  light: LogoVariant;  // light logo (for dark/navy backgrounds)
};

const defaults = {
  business_name: "Brightex Solutions",
  tagline: "We Build Digital Things That Work",
  address: "Nairobi, Kenya",
  email: "info.brightexsolutions@gmail.com",
  phone: "+254 741 980 127",
  whatsapp: "254741980127",
  booking_url: "/contact?intent=book_call",
  instagram: "brightexsolutions",
  facebook: "brightexsolutions",
  linkedin: "brightex-solutions",
  youtube: "",
  tiktok: "",
  google_tag: "",
  // Logo assets
  logo_dark_url: "",
  logo_light_url: "",
  logo_dark_placements: JSON.stringify(["site_header", "invoices", "reports", "documents"]),
  logo_light_placements: JSON.stringify(["site_footer"]),
  // Invoice payment details: M-Pesa Send Money
  invoice_mpesa_number: "",
  invoice_mpesa_name: "",
  // M-Pesa Till / Buy Goods
  invoice_till_number: "",
  invoice_till_name: "",
  // PayPal
  invoice_paypal_email: "",
  // Bank transfer
  invoice_bank_name: "",
  invoice_bank_account_name: "",
  invoice_bank_account_number: "",
  invoice_bank_branch: "",
  invoice_footer_note: "",
  // AI settings
  ai_enabled:  "true",
  ai_provider: "anthropic" as AIProvider,
  ai_model:    AI_MODELS.haiku,
};

type SettingsForm = typeof defaults;

// Keys that belong to each section: used for per-section dirty tracking
const SECTION_KEYS: Record<Section, (keyof SettingsForm)[]> = {
  business:     ["business_name", "tagline", "address"],
  contact:      ["email", "phone", "whatsapp", "booking_url"],
  brand:        ["logo_dark_url", "logo_light_url", "logo_dark_placements", "logo_light_placements"],
  invoice:      ["invoice_mpesa_number", "invoice_mpesa_name", "invoice_till_number", "invoice_till_name",
                 "invoice_paypal_email", "invoice_bank_name", "invoice_bank_account_name",
                 "invoice_bank_account_number", "invoice_bank_branch", "invoice_footer_note"],
  social:       ["instagram", "facebook", "linkedin", "youtube", "tiktok"],
  integrations: ["google_tag"],
  ai:           ["ai_enabled", "ai_provider", "ai_model"],
  // Saves through its own route (it posts an image), so it contributes no
  // keys to the page form and never reads as dirty here.
  signature:    [],
};

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("business");
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [savedForm, setSavedForm] = useState<SettingsForm>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState({ dark: false, light: false });

  useEffect(() => {
    let activeRequest = true;

    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (activeRequest) {
            setLoadError(json.error ?? "Unable to load saved settings.");
          }
          return;
        }

        if (activeRequest) {
          const merged = { ...defaults, ...(json.data ?? {}) } as SettingsForm;
          setForm(merged);
          setSavedForm(merged);
          setLoaded(true);
          setLoadError("");
        }
      } catch {
        if (activeRequest) {
          setLoadError("Network error. Using local defaults until refresh.");
        }
      }
    }

    void loadSettings();

    return () => {
      activeRequest = false;
    };
  }, []);

  function isSectionDirty(section: Section): boolean {
    if (!loaded) return false;
    return SECTION_KEYS[section].some((k) => form[k] !== savedForm[k]);
  }

  function update(key: keyof SettingsForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaveError("");
  }

  async function handleLogoUpload(variant: "dark" | "light", file: File) {
    setUploading((u) => ({ ...u, [variant]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("variant", variant);
      const res = await fetch("/api/admin/settings/logo", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.url) {
        update(variant === "dark" ? "logo_dark_url" : "logo_light_url", json.url as string);
      }
    } finally {
      setUploading((u) => ({ ...u, [variant]: false }));
    }
  }

  function toggleLogoPlacement(
    placementsKey: "logo_dark_placements" | "logo_light_placements",
    placement: LogoPlacement,
    current: LogoPlacement[],
  ) {
    const next = current.includes(placement)
      ? current.filter((p) => p !== placement)
      : [...current, placement];
    update(placementsKey, JSON.stringify(next));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSaveError(json.error ?? "Save failed. Please try again.");
        return;
      }
      setSavedForm(form);
    } finally {
      setSaving(false);
    }
  }

  const activeSection = sections.find((s) => s.id === active)!;

  const dirty = isSectionDirty(active);

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Business details and site setup.</p>
      </div>

      {loadError && (
        <div className="px-4 py-3 rounded-2xl bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          {loadError}
        </div>
      )}

      {/* Phones and tablets: sections as a scrolling chip row */}
      <nav aria-label="Settings sections" className="lg:hidden -mx-4 px-4 flex gap-2 overflow-x-auto scrollbar-overlay pb-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            aria-current={active === s.id ? "page" : undefined}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border text-sm font-medium transition-colors",
              active === s.id ? "bg-brand-gold/20 border-transparent text-foreground" : "border-border text-muted-foreground"
            )}
          >
            <s.icon size={15} />
            {s.label}
          </button>
        ))}
        <Link href="/admin/settings/email-preview" className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border text-sm font-medium text-muted-foreground">
          <MailOpen size={15} /> Email templates
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 lg:flex-1 lg:min-h-0">

        {/* Desktop: grouped navigation list */}
        <nav aria-label="Settings sections" className="hidden lg:block rounded-2xl bg-muted/50 p-2 overflow-y-auto scrollbar-overlay">
          {SECTION_GROUPS.map((group) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              {sections.filter((s) => s.group === group).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  aria-current={active === s.id ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 h-10 px-3 rounded-full text-sm text-left transition-colors",
                    active === s.id
                      ? "bg-brand-gold/25 text-foreground font-semibold"
                      : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  <s.icon size={17} className="shrink-0" />
                  <span className="truncate">{s.label}</span>
                  {isSectionDirty(s.id) && <span className="ml-auto size-2 rounded-full bg-amber-500" aria-label="Unsaved changes" />}
                </button>
              ))}
              {group === "Channels" && (
                <Link
                  href="/admin/settings/email-preview"
                  className="w-full flex items-center gap-3 h-10 px-3 rounded-full text-sm text-foreground/80 hover:bg-muted transition-colors"
                >
                  <MailOpen size={17} className="shrink-0" />
                  <span className="truncate">Email templates</span>
                  <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Section panel: header, fields, and a save bar that stays in view */}
        <form onSubmit={handleSave} className="flex flex-col min-h-0 rounded-2xl border border-border bg-card overflow-hidden">
          <header className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
            <span className="size-10 rounded-full bg-brand-gold/15 text-foreground flex items-center justify-center shrink-0">
              <activeSection.icon size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{activeSection.label}</h2>
              <p className="text-sm text-muted-foreground">{activeSection.description}</p>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-overlay">
            <div className="divide-y divide-border">

              {/* ── Business ── */}
              {active === "business" && (
                <>
                  <SettingRow label="Business Name" hint="Appears on emails, invoices, and documents.">
                    <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Tagline" hint="Short phrase shown in the hero and footer.">
                    <Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Address / Location" hint="Shown on the contact page and in documents.">
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input className="pl-9" value={form.address} onChange={(e) => update("address", e.target.value)} />
                    </div>
                  </SettingRow>
                </>
              )}

              {/* ── Contact ── */}
              {active === "contact" && (
                <>
                  <SettingRow label="Business Email" hint="Used for sending and receiving all business email.">
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input type="email" className="pl-9" value={form.email} onChange={(e) => update("email", e.target.value)} />
                    </div>
                  </SettingRow>
                  <SettingRow label="Phone (display)" hint="Shown on the public contact page and in email footers.">
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input className="pl-9" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                    </div>
                  </SettingRow>
                  <SettingRow label="WhatsApp Number" hint="Digits only with country code: e.g. 254741980127. Used in wa.me links.">
                    <Input placeholder="254741980127" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Public Booking URL" hint="The URL visitors use to book a call. Default: /contact?intent=book_call">
                    <div className="relative">
                      <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input className="pl-9" value={form.booking_url} onChange={(e) => update("booking_url", e.target.value)} />
                    </div>
                  </SettingRow>
                </>
              )}

              {/* ── Brand Assets ── */}
              {active === "brand" && (
                <>
                  <div className="px-6 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo Variants</p>
                  </div>
                  {(["dark", "light"] as const).map((variant) => {
                    const urlKey = variant === "dark" ? "logo_dark_url" : "logo_light_url";
                    const placementsKey = variant === "dark" ? "logo_dark_placements" : "logo_light_placements";
                    const currentUrl = form[urlKey];
                    const currentPlacements: LogoPlacement[] = (() => {
                      try { return JSON.parse(form[placementsKey]) as LogoPlacement[]; }
                      catch { return []; }
                    })();

                    return (
                      <div key={variant} className="px-6 py-5 border-b border-border">
                        <div className="flex items-start gap-6">
                          {/* Upload zone */}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground mb-0.5">
                              {variant === "dark" ? "Dark Logo" : "Light Logo"}
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                              {variant === "dark"
                                ? "For light backgrounds: site header, documents, invoices."
                                : "For dark/navy backgrounds: site footer, dark mode."}
                            </p>
                            <label className={cn(
                              "flex flex-col items-center justify-center w-full h-32 rounded-sm border-2 border-dashed cursor-pointer transition-colors",
                              currentUrl
                                ? "border-border bg-muted/20 hover:border-brand-gold/40"
                                : "border-border bg-muted/10 hover:border-brand-gold/40 hover:bg-brand-gold/5"
                            )}>
                              {uploading[variant] ? (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <Loader2 size={20} className="animate-spin" />
                                  <span className="text-xs">Uploading…</span>
                                </div>
                              ) : currentUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center p-4">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={currentUrl} alt={`${variant} logo preview`} className="max-h-20 max-w-full object-contain" />
                                  <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-background/90 text-muted-foreground border border-border">
                                    Click to replace
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <Upload size={20} />
                                  <span className="text-xs">Click to upload logo</span>
                                  <span className="text-[11px] opacity-60">PNG, SVG, WebP: max 2 MB</span>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/png,image/svg+xml,image/webp,image/jpeg"
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleLogoUpload(variant, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            {currentUrl && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground font-mono truncate flex-1">{currentUrl}</span>
                                <button
                                  type="button"
                                  onClick={() => update(urlKey, "")}
                                  className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 shrink-0"
                                >
                                  <X size={11} /> Remove
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Placement checkboxes */}
                          <div className="w-56 shrink-0 pt-6">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Use this variant for</p>
                            <div className="space-y-2.5">
                              {LOGO_PLACEMENTS.map((p) => (
                                <label key={p.key} className="flex items-center gap-2.5 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={currentPlacements.includes(p.key)}
                                    onChange={() => toggleLogoPlacement(placementsKey, p.key, currentPlacements)}
                                    className="rounded border-border accent-amber-500 w-3.5 h-3.5 shrink-0"
                                  />
                                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                    {p.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-6 py-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Logo files are stored in Supabase Storage. After uploading, click <strong>Save Changes</strong> to persist placement settings.
                    </p>
                  </div>
                </>
              )}

              {/* ── Invoice ── */}
              {active === "invoice" && (
                <>
                  <div className="px-6 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">M-Pesa Send Money</p>
                  </div>
                  <SettingRow label="M-Pesa Number" hint="Phone number clients send money to, e.g. 0741980127.">
                    <Input placeholder="0741980127" value={form.invoice_mpesa_number} onChange={(e) => update("invoice_mpesa_number", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Account Name" hint="Name registered on the M-Pesa account.">
                    <Input placeholder="Godwin Brown" value={form.invoice_mpesa_name} onChange={(e) => update("invoice_mpesa_name", e.target.value)} />
                  </SettingRow>

                  <div className="px-6 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">M-Pesa Till / Buy Goods</p>
                  </div>
                  <SettingRow label="Till Number" hint="Business till number for Buy Goods payments.">
                    <Input placeholder="123456" value={form.invoice_till_number} onChange={(e) => update("invoice_till_number", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Business Name" hint="Name displayed on the till (as registered).">
                    <Input placeholder="Brightex Solutions" value={form.invoice_till_name} onChange={(e) => update("invoice_till_name", e.target.value)} />
                  </SettingRow>

                  <div className="px-6 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PayPal</p>
                  </div>
                  <SettingRow label="PayPal Email" hint="Email address clients use to send PayPal payments.">
                    <Input type="email" placeholder="payments@brightexsolutions.com" value={form.invoice_paypal_email} onChange={(e) => update("invoice_paypal_email", e.target.value)} />
                  </SettingRow>

                  <div className="px-6 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Transfer</p>
                  </div>
                  <SettingRow label="Bank Name" hint="Name of your bank, e.g. Equity Bank.">
                    <Input placeholder="Equity Bank" value={form.invoice_bank_name} onChange={(e) => update("invoice_bank_name", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Account Name" hint="Name on the bank account as it appears on statements.">
                    <Input placeholder="Brightex Solutions Ltd" value={form.invoice_bank_account_name} onChange={(e) => update("invoice_bank_account_name", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Account Number" hint="Your account number for wire transfers.">
                    <Input placeholder="0123456789" value={form.invoice_bank_account_number} onChange={(e) => update("invoice_bank_account_number", e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Branch" hint="Branch name or code (optional).">
                    <Input placeholder="Nairobi CBD Branch" value={form.invoice_bank_branch} onChange={(e) => update("invoice_bank_branch", e.target.value)} />
                  </SettingRow>

                  <div className="px-6 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice Footer</p>
                  </div>
                  <SettingRow label="Footer Note" hint="Closing message shown at the bottom of every invoice.">
                    <Input placeholder="Thank you for your business!" value={form.invoice_footer_note} onChange={(e) => update("invoice_footer_note", e.target.value)} />
                  </SettingRow>
                </>
              )}

              {/* ── Social ── */}
              {active === "social" && (
                <>
                  <SocialRow label="Instagram" prefix="@" value={form.instagram} onChange={(v) => update("instagram", v)} />
                  <SocialRow label="Facebook" prefix="fb.com/" value={form.facebook} onChange={(v) => update("facebook", v)} />
                  <SocialRow label="LinkedIn" prefix="linkedin.com/in/" value={form.linkedin} onChange={(v) => update("linkedin", v)} />
                  <SocialRow label="YouTube" prefix="youtube.com/@" value={form.youtube} placeholder="optional" onChange={(v) => update("youtube", v)} />
                  <SocialRow label="TikTok" prefix="tiktok.com/@" value={form.tiktok} placeholder="optional" onChange={(v) => update("tiktok", v)} />
                </>
              )}

              {/* ── Integrations ── */}
              {active === "integrations" && (
                <>
                  <SettingRow label="Google Tag Manager ID" hint="Paste your GTM container ID (e.g. GTM-XXXXXXX) to enable analytics.">
                    <Input placeholder="GTM-XXXXXXX" value={form.google_tag} onChange={(e) => update("google_tag", e.target.value)} />
                  </SettingRow>
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Cron Secret</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Used to authenticate cron-job.org requests to your API routes.</p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800/40">Env only</span>
                    </div>
                    <div className="mt-2 p-3 rounded-sm bg-muted font-mono text-xs text-muted-foreground border border-border">
                      Set <code className="text-foreground">CRON_SECRET</code> in Vercel → Project → Settings → Environment Variables
                    </div>
                  </div>
                </>
              )}

              {/* ── AI ── */}
              {active === "signature" && <SignatureSettings />}

              {active === "ai" && (
                <>
                  {/* Enable / disable toggle */}
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable AI features</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Powers email drafts, lead scoring, task suggestions, and social captions.
                        Disable to use built-in templates only.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update("ai_enabled", form.ai_enabled === "true" ? "false" : "true")}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        form.ai_enabled === "true" ? "bg-brand-gold" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          form.ai_enabled === "true" ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Provider selector */}
                  <SettingRow
                    label="AI Provider"
                    hint="Choose your AI backend. Claude requires ANTHROPIC_API_KEY; Gemini requires GEMINI_API_KEY (both in Vercel env vars)."
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {(["anthropic", "gemini"] as AIProvider[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            update("ai_provider", p);
                            update(
                              "ai_model",
                              p === "gemini" ? GEMINI_MODEL_OPTIONS[0].value : CLAUDE_MODEL_OPTIONS[0].value
                            );
                          }}
                          className={cn(
                            "flex flex-col items-start gap-1 rounded-sm border px-4 py-3 text-left text-sm transition-colors",
                            form.ai_provider === p
                              ? "border-brand-gold bg-brand-gold/5 text-foreground"
                              : "border-border text-muted-foreground hover:border-brand-gold/50"
                          )}
                        >
                          <span className="font-semibold capitalize">{p === "anthropic" ? "Claude" : "Gemini"}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {p === "anthropic" ? "Anthropic · paid" : "Google · free tier"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  {/* Model selector */}
                  <SettingRow
                    label="Model"
                    hint={
                      form.ai_provider === "gemini"
                        ? "All Gemini models shown are on the free tier (no billing required). Flash 2.0 is recommended."
                        : "Haiku is fastest and cheapest for routine tasks. Use Sonnet or Opus for complex reasoning."
                    }
                  >
                    <div className="space-y-2">
                      {(form.ai_provider === "gemini" ? GEMINI_MODEL_OPTIONS : CLAUDE_MODEL_OPTIONS).map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 transition-colors",
                            form.ai_model === opt.value
                              ? "border-brand-gold bg-brand-gold/5"
                              : "border-border hover:border-brand-gold/50"
                          )}
                        >
                          <input
                            type="radio"
                            name="ai_model"
                            value={opt.value}
                            checked={form.ai_model === opt.value}
                            onChange={() => update("ai_model", opt.value)}
                            className="accent-brand-gold"
                          />
                          <span className="text-sm text-foreground">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </SettingRow>

                  {/* API key instructions */}
                  <div className="px-6 py-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Label className="text-sm font-medium text-foreground">
                          {form.ai_provider === "gemini" ? "Gemini API Key" : "Anthropic API Key"}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {form.ai_provider === "gemini"
                            ? "Get a free key at aistudio.google.com → Get API key. No billing required for free tier."
                            : "Get your key at console.anthropic.com. Haiku costs ~$0.003 per admin AI call."}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800/40">Env only</span>
                    </div>
                    <div className="mt-2 p-3 rounded-sm bg-muted font-mono text-xs text-muted-foreground border border-border">
                      Set{" "}
                      <code className="text-foreground">
                        {form.ai_provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"}
                      </code>{" "}
                      in Vercel → Project → Settings → Environment Variables
                    </div>
                  </div>

                  {/* Fallback note */}
                  <div className="px-6 pb-5">
                    <div className="rounded-sm bg-muted/50 border border-border p-4 text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Fallback behaviour:</strong> If AI is disabled or the API key is missing,
                      email drafts automatically use built-in templates. Lead scoring and task suggestions show a notice instead.
                      The Brixo public chat widget always uses AI when configured.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Save bar: quiet when saved, prominent when there is something to save */}
          <div className={cn(
            "shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-t border-border transition-colors",
            saveError ? "bg-red-500/8" : dirty ? "bg-brand-gold/10" : "bg-card"
          )}>
            <div className="flex items-center gap-2 text-sm min-w-0" role="status" aria-live="polite">
              {saveError ? (
                <>
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                  <span className="text-red-700 dark:text-red-400 font-medium truncate">{saveError}</span>
                </>
              ) : dirty ? (
                <>
                  <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-foreground font-medium">Unsaved changes</span>
                </>
              ) : loaded ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="text-muted-foreground">All changes saved</span>
                </>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:bg-muted disabled:text-muted-foreground shrink-0"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SettingRow({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-2 md:gap-6 px-6 py-4 items-start">
      <div className="md:pt-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="max-w-lg">{children}</div>
    </div>
  );
}

function SocialRow({
  label, prefix, value, placeholder = "", onChange,
}: { label: string; prefix: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-2 md:gap-6 px-6 py-4 items-center">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="max-w-lg flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-ring/40">
        <span className="px-3 py-2 text-xs text-muted-foreground bg-muted border-r border-input shrink-0 whitespace-nowrap select-none">
          {prefix}
        </span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>
    </div>
  );
}
