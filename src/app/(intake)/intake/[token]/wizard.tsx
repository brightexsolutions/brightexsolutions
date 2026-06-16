"use client";

import { useState, useEffect } from "react";
import { SITE_NAME, BUSINESS_WHATSAPP } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType = "website" | "mobile" | "erp" | "design" | "consultancy" | "other";

interface IntakeState {
  // Step 1
  service_type: ServiceType | "";
  // Step 2
  project_title: string;
  description: string;
  problem_statement: string;
  // Step 3 – type-specific (stored as a flexible object)
  specifics: Record<string, unknown>;
  // Step 4
  timeline: string;
  budget_range: string;
  additional_notes: string;
  // Step 5
  submitter_name: string;
  submitter_email: string;
  submitter_company: string;
}

const EMPTY: IntakeState = {
  service_type: "",
  project_title: "", description: "", problem_statement: "",
  specifics: {},
  timeline: "", budget_range: "", additional_notes: "",
  submitter_name: "", submitter_email: "", submitter_company: "",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = "#152238";
const GOLD = "#f9a825";

const SERVICE_TYPES: { value: ServiceType; label: string; icon: string; sub: string }[] = [
  { value: "website",      label: "Website / Web App",     icon: "🌐", sub: "New site, redesign, or web application" },
  { value: "mobile",       label: "Mobile App",            icon: "📱", sub: "iOS, Android, or both" },
  { value: "erp",          label: "Software / ERP System", icon: "⚙️",  sub: "Custom software or business management system" },
  { value: "design",       label: "Design & Branding",     icon: "🎨", sub: "Logo, brand identity, graphics, or marketing materials" },
  { value: "consultancy",  label: "Business Consultancy",  icon: "💼", sub: "Strategy, digital transformation, or advisory" },
  { value: "other",        label: "Something Else",        icon: "🔧", sub: "Tell us what you have in mind" },
];

const TIMELINE_OPTIONS = [
  "ASAP — as soon as possible",
  "Within a month",
  "1 – 3 months",
  "3 – 6 months",
  "6+ months",
  "Flexible — not sure yet",
];

const BUDGET_OPTIONS = [
  "Under KES 50,000",
  "KES 50,000 – 150,000",
  "KES 100,000 – 300,000",
  "KES 300,000 – 1,000,000",
  "Over KES 1,000,000",
  "Prefer to discuss",
];

const WEBSITE_PAGES = ["Home", "About Us", "Services", "Portfolio / Work", "Blog", "Contact", "Online Store / Shop", "Booking / Appointments", "Custom pages"];
const DESIGN_TYPES  = ["Logo", "Business Card", "Flyer / Poster", "Social Media Kit", "Full Brand Identity", "Packaging Design", "Presentation / Pitch Deck", "Other"];
const CONSULTANCY_AREAS = ["Business Strategy", "Digital Transformation", "Process Optimisation", "Market Entry / Expansion", "Tech / Software Advisory", "Other"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function ChipGroup({ options, selected, onToggle, single }: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-all",
              active
                ? "border-[#f9a825] bg-[#f9a825]/10 text-[#152238] font-semibold"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ToggleYesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2 mt-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm border font-medium transition-all",
            value === v
              ? "border-[#f9a825] bg-[#f9a825]/10 text-[#152238]"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          )}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">What are you looking for?</h2>
        <p className="text-sm text-slate-500 mt-1">Select the option that best describes what you need.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICE_TYPES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => update({ service_type: s.value })}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
              state.service_type === s.value
                ? "border-[#f9a825] bg-[#f9a825]/8 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <span className="text-2xl shrink-0 mt-0.5">{s.icon}</span>
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", state.service_type === s.value ? "text-[#152238]" : "text-slate-700")}>
                {s.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.sub}</p>
            </div>
            {state.service_type === s.value && (
              <span className="ml-auto shrink-0 text-[#f9a825]">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const typeLabelMap: Record<string, string> = {
    website: "website or web app", mobile: "mobile app", erp: "software or system",
    design: "design project", consultancy: "consultancy engagement", other: "project",
  };
  const typeLabel = state.service_type ? typeLabelMap[state.service_type] : "project";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Tell us about it</h2>
        <p className="text-sm text-slate-500 mt-1">In your own words — there are no wrong answers.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          What would you call this {typeLabel}? <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={state.project_title}
          onChange={(e) => update({ project_title: e.target.value })}
          placeholder={`e.g. "My Clothing Brand Website"`}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Describe what you want <span className="text-red-400">*</span>
        </label>
        <textarea
          rows={4}
          value={state.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder={`What do you have in mind? Describe your vision for this ${typeLabel} as freely as you like…`}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          What problem does this solve for your business? <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={state.problem_statement}
          onChange={(e) => update({ problem_statement: e.target.value })}
          placeholder="e.g. Customers can't find us online / We manage everything on paper / Our current system is too slow…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none"
        />
      </div>
    </div>
  );
}

function SpecField({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {note && <p className="text-xs text-slate-400">{note}</p>}
      {children}
    </div>
  );
}

function Step3Website({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const sp = state.specifics as Record<string, unknown>;
  function setSp(k: string, v: unknown) { update({ specifics: { ...sp, [k]: v } }); }
  function togglePage(p: string) {
    const cur = (sp.pages ?? []) as string[];
    setSp("pages", cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">A few more details</h2>
        <p className="text-sm text-slate-500 mt-1">Just a few quick questions about your website.</p>
      </div>

      <SpecField label="Do you have an existing website?">
        <ToggleYesNo value={sp.has_existing_site as boolean ?? null} onChange={(v) => setSp("has_existing_site", v)} />
        {!!sp.has_existing_site && (
          <input type="url" value={(sp.existing_url as string) ?? ""} onChange={(e) => setSp("existing_url", e.target.value)}
            placeholder="https://yourwebsite.com"
            className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]" />
        )}
      </SpecField>

      <SpecField label="Will you need online sales (e-commerce)?">
        <ToggleYesNo value={sp.needs_ecommerce as boolean ?? null} onChange={(v) => setSp("needs_ecommerce", v)} />
      </SpecField>

      <SpecField label="Do you have existing branding (logo, colors, fonts)?">
        <ToggleYesNo value={sp.has_branding as boolean ?? null} onChange={(v) => setSp("has_branding", v)} />
      </SpecField>

      <SpecField label="Which pages will your site need?" note="Select all that apply — you can always add more later.">
        <ChipGroup
          options={WEBSITE_PAGES}
          selected={(sp.pages ?? []) as string[]}
          onToggle={togglePage}
        />
      </SpecField>

      <SpecField label="Any websites you love the look of?" note="Drop links or names — inspiration is helpful.">
        <textarea rows={2} value={(sp.references as string) ?? ""} onChange={(e) => setSp("references", e.target.value)}
          placeholder="e.g. apple.com, or a Kenyan brand you admire…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </SpecField>
    </div>
  );
}

function Step3Mobile({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const sp = state.specifics as Record<string, unknown>;
  function setSp(k: string, v: unknown) { update({ specifics: { ...sp, [k]: v } }); }
  function togglePlatform(p: string) {
    const cur = (sp.platforms ?? []) as string[];
    setSp("platforms", cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">About your mobile app</h2>
        <p className="text-sm text-slate-500 mt-1">Help us understand what you need built.</p>
      </div>

      <SpecField label="Which platforms?">
        <ChipGroup options={["iOS (iPhone)", "Android", "Both"]} selected={(sp.platforms ?? []) as string[]} onToggle={togglePlatform} />
      </SpecField>

      <SpecField label="Who is this app primarily for?">
        <ChipGroup
          options={["My customers / public", "Internal staff / team", "Both"]}
          selected={sp.audience ? [sp.audience as string] : []}
          onToggle={(v) => setSp("audience", v)}
          single
        />
      </SpecField>

      <SpecField label="Do you have a similar app as a reference or inspiration?">
        <ToggleYesNo value={sp.has_reference as boolean ?? null} onChange={(v) => setSp("has_reference", v)} />
        {!!sp.has_reference && (
          <input type="text" value={(sp.reference_apps as string) ?? ""} onChange={(e) => setSp("reference_apps", e.target.value)}
            placeholder="App name or link to the app store…"
            className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]" />
        )}
      </SpecField>

      <SpecField label="List the key features your app must have" note="Don't worry about technical terms — just describe what it should do.">
        <textarea rows={3} value={(sp.features as string) ?? ""} onChange={(e) => setSp("features", e.target.value)}
          placeholder="e.g. User login, View products, Add to cart, Pay via M-Pesa, Get push notifications…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </SpecField>
    </div>
  );
}

function Step3ERP({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const sp = state.specifics as Record<string, unknown>;
  function setSp(k: string, v: unknown) { update({ specifics: { ...sp, [k]: v } }); }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">About your software</h2>
        <p className="text-sm text-slate-500 mt-1">Tell us more about the system you need.</p>
      </div>

      <SpecField label="What business process does this software manage?">
        <textarea rows={2} value={(sp.business_process as string) ?? ""} onChange={(e) => setSp("business_process", e.target.value)}
          placeholder="e.g. School admissions and fee collection, Staff payroll and HR, Inventory and sales tracking…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </SpecField>

      <SpecField label="How many people will use this system?">
        <ChipGroup
          options={["Just me", "2 – 10 people", "11 – 50 people", "50+ people"]}
          selected={sp.team_size ? [sp.team_size as string] : []}
          onToggle={(v) => setSp("team_size", v)}
          single
        />
      </SpecField>

      <SpecField label="Do you currently use any system for this (even Excel or paper)?">
        <ToggleYesNo value={sp.has_current_system as boolean ?? null} onChange={(v) => setSp("has_current_system", v)} />
        {!!sp.has_current_system && (
          <input type="text" value={(sp.current_system as string) ?? ""} onChange={(e) => setSp("current_system", e.target.value)}
            placeholder="e.g. Excel spreadsheets, QuickBooks, a custom system…"
            className="mt-2 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]" />
        )}
      </SpecField>

      <SpecField label="Any key integrations you'll need?" note="e.g. payments, M-Pesa, SMS alerts, other software.">
        <textarea rows={2} value={(sp.integrations as string) ?? ""} onChange={(e) => setSp("integrations", e.target.value)}
          placeholder="e.g. M-Pesa STK push for payments, SMS notifications, Payroll integration…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </SpecField>
    </div>
  );
}

function Step3Design({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const sp = state.specifics as Record<string, unknown>;
  function setSp(k: string, v: unknown) { update({ specifics: { ...sp, [k]: v } }); }
  function toggleType(t: string) {
    const cur = (sp.design_types ?? []) as string[];
    setSp("design_types", cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">About your design project</h2>
        <p className="text-sm text-slate-500 mt-1">Let us know what you need designed.</p>
      </div>

      <SpecField label="What needs designing?" note="Select everything that applies.">
        <ChipGroup options={DESIGN_TYPES} selected={(sp.design_types ?? []) as string[]} onToggle={toggleType} />
      </SpecField>

      <SpecField label="Do you already have a logo or brand guidelines?">
        <ToggleYesNo value={sp.has_existing_brand as boolean ?? null} onChange={(v) => setSp("has_existing_brand", v)} />
      </SpecField>

      <SpecField label="Describe the look and feel you want" note="Colors, mood, style — e.g. 'bold and modern' or 'clean and professional'.">
        <textarea rows={3} value={(sp.style_notes as string) ?? ""} onChange={(e) => setSp("style_notes", e.target.value)}
          placeholder="e.g. Navy and gold, professional and trustworthy. I admire the branding of KCB Bank…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </SpecField>
    </div>
  );
}

function Step3Consultancy({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const sp = state.specifics as Record<string, unknown>;
  function setSp(k: string, v: unknown) { update({ specifics: { ...sp, [k]: v } }); }
  function toggleArea(a: string) {
    const cur = (sp.focus_areas ?? []) as string[];
    setSp("focus_areas", cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Your consultancy needs</h2>
        <p className="text-sm text-slate-500 mt-1">Help us understand the challenge you're facing.</p>
      </div>

      <SpecField label="Area of focus" note="Select all that apply.">
        <ChipGroup options={CONSULTANCY_AREAS} selected={(sp.focus_areas ?? []) as string[]} onToggle={toggleArea} />
      </SpecField>

      <SpecField label="Describe the challenge in your own words">
        <textarea rows={4} value={(sp.challenge as string) ?? ""} onChange={(e) => setSp("challenge", e.target.value)}
          placeholder="What's the situation? What's not working? What outcome are you hoping for?…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </SpecField>
    </div>
  );
}

function Step3Other({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const sp = state.specifics as Record<string, unknown>;
  function setSp(k: string, v: unknown) { update({ specifics: { ...sp, [k]: v } }); }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Tell us more</h2>
        <p className="text-sm text-slate-500 mt-1">Share any extra details that would help us understand what you need.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">Any additional context</label>
        <textarea rows={5} value={(sp.extra as string) ?? ""} onChange={(e) => setSp("extra", e.target.value)}
          placeholder="Describe your project, idea, or need in as much or as little detail as you like…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </div>
    </div>
  );
}

function Step4({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Timeline & Budget</h2>
        <p className="text-sm text-slate-500 mt-1">This helps us plan and give you the right options. Both are optional.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">When do you need this?</label>
        <div className="flex flex-col gap-2">
          {TIMELINE_OPTIONS.map((opt) => (
            <button key={opt} type="button" onClick={() => update({ timeline: state.timeline === opt ? "" : opt })}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
                state.timeline === opt
                  ? "border-[#f9a825] bg-[#f9a825]/8 font-semibold text-[#152238]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}>
              <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                state.timeline === opt ? "border-[#f9a825] bg-[#f9a825]" : "border-slate-300")}>
                {state.timeline === opt && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Budget range</label>
        <div className="flex flex-col gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <button key={opt} type="button" onClick={() => update({ budget_range: state.budget_range === opt ? "" : opt })}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
                state.budget_range === opt
                  ? "border-[#f9a825] bg-[#f9a825]/8 font-semibold text-[#152238]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}>
              <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                state.budget_range === opt ? "border-[#f9a825] bg-[#f9a825]" : "border-slate-300")}>
                {state.budget_range === opt && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Anything else you&apos;d like us to know? <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea rows={3} value={state.additional_notes} onChange={(e) => update({ additional_notes: e.target.value })}
          placeholder="Any questions, concerns, constraints, or things we haven't asked about…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825] resize-none" />
      </div>
    </div>
  );
}

function Step5({ state, update, clientName, clientEmail, clientCompany, isGeneric }: {
  state: IntakeState;
  update: (p: Partial<IntakeState>) => void;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  isGeneric: boolean;
}) {
  const serviceLabel = SERVICE_TYPES.find((s) => s.value === state.service_type)?.label ?? state.service_type;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Almost done — confirm your details</h2>
        <p className="text-sm text-slate-500 mt-1">We&apos;ll use this to follow up with you.{!isGeneric && " Your details are pre-filled — update them if needed."}</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your summary</p>
        <div className="flex gap-2">
          <span className="text-slate-400 w-20 shrink-0">Type</span>
          <span className="font-medium text-slate-700">{serviceLabel}</span>
        </div>
        {state.project_title && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-20 shrink-0">Title</span>
            <span className="font-medium text-slate-700">{state.project_title}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="text-slate-400 w-20 shrink-0">Description</span>
          <span className="text-slate-600 line-clamp-3">{state.description}</span>
        </div>
        {state.timeline && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-20 shrink-0">Timeline</span>
            <span className="text-slate-600">{state.timeline}</span>
          </div>
        )}
        {state.budget_range && (
          <div className="flex gap-2">
            <span className="text-slate-400 w-20 shrink-0">Budget</span>
            <span className="text-slate-600">{state.budget_range}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Your name <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={state.submitter_name !== "" ? state.submitter_name : clientName}
            onChange={(e) => update({ submitter_name: e.target.value })}
            placeholder="Full name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Your email <span className="text-red-400">*</span></label>
          <input
            type="email"
            value={state.submitter_email !== "" ? state.submitter_email : clientEmail}
            onChange={(e) => update({ submitter_email: e.target.value })}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Company / Business <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={state.submitter_company !== "" ? state.submitter_company : clientCompany}
          onChange={(e) => update({ submitter_company: e.target.value })}
          placeholder="Your business or organisation name"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]"
        />
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const STEP_LABELS = ["Service type", "Your idea", "Details", "Timeline & Budget", "Confirm"];

export function IntakeWizard({
  token = "",
  clientName = "",
  clientEmail = "",
  clientCompany = "",
  isGeneric = false,
}: {
  token?: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  isGeneric?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<IntakeState>({
    ...EMPTY,
    submitter_name: clientName,
    submitter_email: clientEmail,
    submitter_company: clientCompany,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function update(patch: Partial<IntakeState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  const resolvedName  = state.submitter_name  || clientName;
  const resolvedEmail = state.submitter_email || clientEmail;

  function canAdvance(): boolean {
    if (step === 1) return !!state.service_type;
    if (step === 2) return !!state.description.trim();
    if (step === 5) return !!resolvedName && !!resolvedEmail;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const url  = token ? `/api/intake/${token}` : "/api/intake";
      const body = {
        ...state,
        submitter_name:    resolvedName,
        submitter_email:   resolvedEmail,
        submitter_company: state.submitter_company || clientCompany,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Submission failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Thank you screen ───────────────────────────────────────────────────────

  if (submitted) {
    const firstName = resolvedName.split(" ")[0] || "there";
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#f1f5f9" }}>
        {/* Header */}
        <div style={{ background: NAVY }} className="px-4 pt-5 pb-6 shrink-0">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-extrabold shrink-0 shadow-sm" style={{ background: GOLD, color: NAVY }}>B</div>
            <p className="text-white font-semibold text-sm tracking-wide">{SITE_NAME}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 sm:p-12 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">We got your requirements!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Thank you, {firstName}. We&apos;ll review your submission and reach out to schedule a discovery call to go through the details together.
            </p>
            <a
              href={`https://wa.me/${BUSINESS_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#25D366" }}
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  // Nav buttons — shared between card (desktop) and fixed bar (mobile)
  const navButtons = (
    <div className="flex gap-3">
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
        >
          ← Back
        </button>
      )}
      {step < TOTAL_STEPS ? (
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          disabled={!canAdvance()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={canAdvance() ? { background: GOLD, color: NAVY } : { background: "#e2e8f0", color: "#94a3b8" }}
        >
          Continue →
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canAdvance()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: NAVY, color: "#ffffff" }}
        >
          {submitting ? "Submitting…" : "Submit Requirements →"}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f1f5f9" }}>

      {/* ── Full header (visible when not scrolled) ── */}
      <div style={{ background: NAVY }} className="shrink-0">
        {/* Gold accent line */}
        <div style={{ height: 3, background: GOLD }} />

        {/* Brand + title */}
        <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-extrabold shrink-0 shadow-sm" style={{ background: GOLD, color: NAVY }}>B</div>
            <p className="text-white font-semibold text-sm tracking-wide">{SITE_NAME}</p>
          </div>
          <h1 className="text-white text-xl font-bold leading-snug">Tell us about your project</h1>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            Answer a few quick questions — no tech knowledge needed. We&apos;ll do the rest.
          </p>
        </div>

        {/* Progress */}
        <div className="px-4 pb-5 max-w-lg mx-auto">
          <div className="flex justify-between mb-2">
            {STEP_LABELS.map((label, i) => (
              <span key={label} className={cn(
                "text-[10px] font-semibold hidden sm:block",
                i + 1 === step ? "text-[#f9a825]" : i + 1 < step ? "text-white/50" : "text-white/20"
              )}>{label}</span>
            ))}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: GOLD }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/40 text-[11px]">Step {step} of {TOTAL_STEPS}</span>
            <span style={{ color: GOLD }} className="text-[11px] font-medium">{STEP_LABELS[step - 1]}</span>
          </div>
        </div>
      </div>

      {/* ── Sticky mini header (appears on scroll) ── */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        )}
        style={{ background: NAVY, borderBottom: `2px solid ${GOLD}` }}
      >
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0" style={{ background: GOLD, color: NAVY }}>B</div>
            <span className="text-white font-semibold text-sm truncate">Tell us about your project</span>
          </div>
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(249,168,37,0.15)", color: GOLD }}
          >
            {step}/{TOTAL_STEPS}
          </span>
        </div>
        {/* Mini progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: GOLD, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Content — extra bottom padding on mobile so fixed nav doesn't overlap */}
      <div className="flex-1 px-4 py-6 pb-36 sm:pb-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8">

            {step === 1 && <Step1 state={state} update={update} />}
            {step === 2 && <Step2 state={state} update={update} />}
            {step === 3 && state.service_type === "website"      && <Step3Website state={state} update={update} />}
            {step === 3 && state.service_type === "mobile"       && <Step3Mobile state={state} update={update} />}
            {step === 3 && state.service_type === "erp"          && <Step3ERP state={state} update={update} />}
            {step === 3 && state.service_type === "design"       && <Step3Design state={state} update={update} />}
            {step === 3 && state.service_type === "consultancy"  && <Step3Consultancy state={state} update={update} />}
            {step === 3 && state.service_type === "other"        && <Step3Other state={state} update={update} />}
            {step === 4 && <Step4 state={state} update={update} />}
            {step === 5 && <Step5 state={state} update={update} clientName={clientName} clientEmail={clientEmail} clientCompany={clientCompany} isGeneric={isGeneric} />}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Navigation — visible on desktop; hidden on mobile (fixed bar used instead) */}
            <div className="hidden sm:block mt-8">
              {navButtons}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed bottom nav bar — mobile only ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pt-3"
        style={{
          background: "rgba(255,255,255,0.97)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        {navButtons}
      </div>
    </div>
  );
}
