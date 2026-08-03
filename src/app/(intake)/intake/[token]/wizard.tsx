"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SITE_NAME, BUSINESS_WHATSAPP } from "@/lib/constants";
import {
  SERVICE_TYPES, SERVICE_META, SERVICE_SECTIONS,
  INDUSTRY_OPTIONS, TIMELINE_OPTIONS, BUDGET_OPTIONS,
  BUDGET_CONFIDENCE_OPTIONS, DECISION_STAGE_OPTIONS,
  PREFERRED_CONTACT_OPTIONS, HEARD_FROM_OPTIONS,
  readAnswerGroups,
  type ServiceType, type IntakeField, type IntakeSection,
} from "@/lib/intake-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntakeState {
  /**
   * Step 1. Enquiries are regularly combined (a website, plus branding, plus
   * an assistant on WhatsApp), so this is a list. The first entry is the
   * primary service and drives the copy, the emails and the admin filters.
   */
  service_types: ServiceType[];
  // Step 2: business context
  submitter_company: string;
  industry: string;
  business_summary: string;
  target_audience: string;
  online_presence: string;
  // Step 3: the project
  project_title: string;
  description: string;
  problem_statement: string;
  success_criteria: string;
  reference_links: string;
  /** Step 4. Answers nested per service, since keys collide across types. */
  specifics: Record<string, Record<string, unknown>>;
  // Step 5: timeline, budget, decision
  timeline: string;
  hard_deadline: string;
  budget_range: string;
  budget_confidence: string;
  decision_stage: string;
  additional_notes: string;
  // Step 6: contact
  submitter_name: string;
  submitter_role: string;
  submitter_email: string;
  submitter_phone: string;
  preferred_contact: string;
  cc_emails: string[];
  heard_from: string;
  contact_consent: boolean;
}

const EMPTY: IntakeState = {
  service_types: [],
  submitter_company: "", industry: "", business_summary: "", target_audience: "", online_presence: "",
  project_title: "", description: "", problem_statement: "", success_criteria: "", reference_links: "",
  specifics: {},
  timeline: "", hard_deadline: "", budget_range: "", budget_confidence: "", decision_stage: "", additional_notes: "",
  submitter_name: "", submitter_role: "", submitter_email: "", submitter_phone: "",
  preferred_contact: "", cc_emails: [], heard_from: "", contact_consent: true,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = "#152238";
const GOLD = "#f9a825";

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  "What you need",
  "Your business",
  "The project",
  "Requirements",
  "Timeline & budget",
  "Your details",
];

/**
 * Only these steps hold anything we genuinely cannot proceed without. Every
 * other step can be skipped outright, and every field inside them is optional.
 */
const REQUIRED_STEPS = new Set([1, 3, 6]);

const DRAFT_KEY_PREFIX = "brightex-intake-draft";

// Options that mean "no answer" and should clear the rest of a multi-select.
const EXCLUSIVE_OPTIONS = ["Not sure yet", "None", "None of these yet", "No payments in the app", "Just me"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 " +
  "placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#f9a825]/40 focus:border-[#f9a825]";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function StepHeading({ title, subtitle, optional }: { title: string; subtitle?: string; optional?: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {optional && (
          <span className="shrink-0 mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
            Optional
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function FieldLabel({ label, note, required }: { label: string; note?: string; required?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-slate-700">
        {label}{" "}
        {required
          ? <span className="text-red-400">*</span>
          : <span className="text-slate-300 font-normal text-xs">(optional)</span>}
      </p>
      {note && <p className="text-xs text-slate-400 leading-relaxed">{note}</p>}
    </div>
  );
}

function TextField({ label, note, required, value, onChange, placeholder, type = "text" }: {
  label: string; note?: string; required?: boolean;
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} note={note} required={required} />
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className={INPUT_CLASS} />
    </div>
  );
}

function TextArea({ label, note, required, value, onChange, placeholder, rows = 3 }: {
  label: string; note?: string; required?: boolean;
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} note={note} required={required} />
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className={cn(INPUT_CLASS, "resize-none")} />
    </div>
  );
}

function Chips({ options, selected, onToggle }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-all",
              active
                ? "border-[#f9a825] bg-[#f9a825]/10 text-[#152238] font-semibold"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RadioList({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all",
              active
                ? "border-[#f9a825] bg-[#f9a825]/8 font-semibold text-[#152238]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}>
            <span className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
              active ? "border-[#f9a825] bg-[#f9a825]" : "border-slate-300"
            )}>
              {active && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleYesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button key={String(v)} type="button"
          onClick={() => onChange(value === v ? null : v)}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm border font-medium transition-all",
            value === v
              ? "border-[#f9a825] bg-[#f9a825]/10 text-[#152238]"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          )}>
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

// ─── Schema-driven field renderer ─────────────────────────────────────────────

function SchemaField({ field, answers, setAnswer }: {
  field: IntakeField;
  answers: Record<string, unknown>;
  setAnswer: (key: string, value: unknown) => void;
}) {
  if (field.showIf && !field.showIf(answers)) return null;

  const value = answers[field.key];

  function toggleChip(opt: string) {
    const multi = field.multi !== false;
    if (!multi) {
      setAnswer(field.key, value === opt ? "" : opt);
      return;
    }
    const current = Array.isArray(value) ? (value as string[]) : [];
    let next: string[];
    if (current.includes(opt)) {
      next = current.filter((v) => v !== opt);
    } else if (EXCLUSIVE_OPTIONS.includes(opt)) {
      next = [opt];
    } else {
      next = [...current.filter((v) => !EXCLUSIVE_OPTIONS.includes(v)), opt];
    }
    setAnswer(field.key, next);
  }

  const selectedChips = field.multi === false
    ? (typeof value === "string" && value ? [value] : [])
    : (Array.isArray(value) ? (value as string[]) : []);

  return (
    <div className="space-y-2">
      <FieldLabel label={field.label} note={field.note} />

      {field.kind === "text" && (
        <input type="text" value={(value as string) ?? ""} placeholder={field.placeholder}
          onChange={(e) => setAnswer(field.key, e.target.value)} className={INPUT_CLASS} />
      )}

      {field.kind === "textarea" && (
        <textarea rows={field.rows ?? 3} value={(value as string) ?? ""} placeholder={field.placeholder}
          onChange={(e) => setAnswer(field.key, e.target.value)} className={cn(INPUT_CLASS, "resize-none")} />
      )}

      {field.kind === "chips" && (
        <>
          <Chips options={field.options ?? []} selected={selectedChips} onToggle={toggleChip} />
          {field.allowOther && (
            <input type="text" value={(answers[`${field.key}_other`] as string) ?? ""}
              placeholder="Something else? Type it here"
              onChange={(e) => setAnswer(`${field.key}_other`, e.target.value)}
              className={cn(INPUT_CLASS, "mt-2")} />
          )}
        </>
      )}

      {field.kind === "yesno" && (
        <>
          <ToggleYesNo
            value={typeof value === "boolean" ? value : null}
            onChange={(v) => setAnswer(field.key, v)}
          />
          {value === true && field.followUp && (
            <div className="mt-3 pl-3 border-l-2 border-[#f9a825]/30">
              <SchemaField field={field.followUp} answers={answers} setAnswer={setAnswer} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SchemaSection({ section, answers, setAnswer }: {
  section: IntakeSection;
  answers: Record<string, unknown>;
  setAnswer: (key: string, value: unknown) => void;
}) {
  const visible = section.fields.filter((f) => !f.showIf || f.showIf(answers));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#f9a825]">{section.title}</p>
        {section.intro && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{section.intro}</p>}
      </div>
      <div className="space-y-5">
        {visible.map((field) => (
          <SchemaField key={field.key} field={field} answers={answers} setAnswer={setAnswer} />
        ))}
      </div>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  const selected = state.service_types;

  function toggle(value: ServiceType) {
    if (selected.includes(value)) {
      // Dropping a service also drops the answers given for it, so a
      // de-selected service cannot quietly submit stale requirements.
      const nextSpecifics = { ...state.specifics };
      delete nextSpecifics[value];
      update({ service_types: selected.filter((v) => v !== value), specifics: nextSpecifics });
    } else {
      update({ service_types: [...selected, value] });
    }
  }

  /** Promotes a service to primary, which drives our copy and follow-up. */
  function makePrimary(value: ServiceType) {
    update({ service_types: [value, ...selected.filter((v) => v !== value)] });
  }

  return (
    <div className="space-y-4">
      <StepHeading
        title="What are you looking for?"
        subtitle="Choose as many as apply. Plenty of projects combine a few, like a website with branding and an assistant to answer WhatsApp."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICE_TYPES.map((value) => {
          const meta = SERVICE_META[value];
          const active = selected.includes(value);
          const isPrimary = selected[0] === value;
          return (
            <button key={value} type="button" onClick={() => toggle(value)}
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                active
                  ? "border-[#f9a825] bg-[#f9a825]/8 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              )}>
              <span className="text-2xl shrink-0 mt-0.5">{meta.icon}</span>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", active ? "text-[#152238]" : "text-slate-700")}>
                  {meta.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{meta.sub}</p>
                {isPrimary && selected.length > 1 && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#f9a825]">
                    Main focus
                  </span>
                )}
              </div>
              <span className={cn(
                "ml-auto shrink-0 w-5 h-5 rounded-md border flex items-center justify-center text-xs",
                active ? "border-[#f9a825] bg-[#f9a825] text-white" : "border-slate-200 text-transparent"
              )}>
                ✓
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600">
            Which of these matters most?
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            We will lead with it when we come back to you. The next steps will ask about each one in turn.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {selected.map((value) => (
              <button key={value} type="button" onClick={() => makePrimary(value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border transition-all",
                  selected[0] === value
                    ? "border-[#f9a825] bg-white text-[#152238] font-semibold"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                )}>
                {SERVICE_META[value].icon} {SERVICE_META[value].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step2({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  return (
    <div className="space-y-5">
      <StepHeading
        optional
        title="A little about your business"
        subtitle="Context helps us propose something that fits you rather than a generic package. Skip anything that does not apply."
      />

      <TextField label="Business or organisation name"
        value={state.submitter_company} onChange={(v) => update({ submitter_company: v })}
        placeholder="Your business name" />

      <div className="space-y-2">
        <FieldLabel label="What industry are you in?" />
        <Chips options={INDUSTRY_OPTIONS} selected={state.industry ? [state.industry] : []}
          onToggle={(v) => update({ industry: state.industry === v ? "" : v })} />
      </div>

      <TextArea label="What does your business actually do?"
        note="One or two sentences, as if explaining to a new customer."
        value={state.business_summary} onChange={(v) => update({ business_summary: v })}
        placeholder="We supply and install solar water heaters for homes and small hotels across Nairobi."
        rows={3} />

      <TextArea label="Who are your customers?"
        note="Knowing who this is for changes almost every decision we make."
        value={state.target_audience} onChange={(v) => update({ target_audience: v })}
        placeholder="Homeowners in Nairobi, plus small hotels and Airbnb hosts."
        rows={2} />

      <TextArea label="Where can you already be found online?"
        note="Website, Facebook, Instagram, TikTok, a Google listing. Anything at all."
        value={state.online_presence} onChange={(v) => update({ online_presence: v })}
        placeholder="instagram.com/ourbrand, and a Facebook page"
        rows={2} />
    </div>
  );
}

function Step3({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  // With several services selected the work is one project made of parts, so
  // the copy stays deliberately general rather than naming one of them.
  const noun = state.service_types.length === 1
    ? SERVICE_META[state.service_types[0]].noun
    : "project";

  return (
    <div className="space-y-5">
      <StepHeading
        title="Tell us about the project"
        subtitle={state.service_types.length > 1
          ? "Describe the whole thing here, across everything you picked. We will ask about each part separately next."
          : "In your own words. There are no wrong answers, and you do not need any technical language."}
      />

      <TextField label={`What would you call this ${noun}?`}
        value={state.project_title} onChange={(v) => update({ project_title: v })}
        placeholder={`e.g. "Our new online store"`} />

      <TextArea label="Describe what you want" required
        note="This is the one thing we really need. Write as much as you like."
        value={state.description} onChange={(v) => update({ description: v })}
        placeholder={`What do you have in mind for this ${noun}? Describe your vision as freely as you like...`}
        rows={5} />

      <TextArea label="What problem does this solve for you?"
        note="What is happening today that made you start looking?"
        value={state.problem_statement} onChange={(v) => update({ problem_statement: v })}
        placeholder="Customers cannot find us online. We manage everything on paper. Our current system is too slow..."
        rows={3} />

      <TextArea label="How will you know it worked?"
        note="What should be different once this is done and live?"
        value={state.success_criteria} onChange={(v) => update({ success_criteria: v })}
        placeholder="We get at least 10 enquiries a month through the site, and I stop writing orders by hand."
        rows={3} />

      <TextArea label="Anything you have seen that you like?"
        note="Links, names, screenshots you can describe. Inspiration saves us both a lot of guessing."
        value={state.reference_links} onChange={(v) => update({ reference_links: v })}
        placeholder="I like how jumia.co.ke handles checkout, and the look of a brand called..."
        rows={2} />
    </div>
  );
}

/** One collapsible service block on the requirements step. */
function ServiceRequirements({ serviceType, answers, setAnswer, defaultOpen, index, total }: {
  serviceType: ServiceType;
  answers: Record<string, unknown>;
  setAnswer: (key: string, value: unknown) => void;
  defaultOpen: boolean;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SERVICE_META[serviceType];
  const sections = SERVICE_SECTIONS[serviceType];
  const answered = Object.values(answers).filter(
    (v) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
  ).length;

  // A single service needs no accordion chrome around it.
  if (total === 1) {
    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <SchemaSection key={section.title} section={section} answers={answers} setAnswer={setAnswer} />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          open ? "bg-[#f9a825]/8" : "bg-slate-50 hover:bg-slate-100"
        )}>
        <span className="text-xl shrink-0">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#152238] truncate">{meta.label}</p>
          <p className="text-[11px] text-slate-400">
            Part {index + 1} of {total}
            {answered > 0 && ` · ${answered} answered`}
          </p>
        </div>
        <span className={cn("shrink-0 text-slate-400 text-xs transition-transform", open && "rotate-180")}>▼</span>
      </button>
      {open && (
        <div className="px-4 py-5 space-y-6 bg-white border-t border-slate-200">
          {sections.map((section) => (
            <SchemaSection key={section.title} section={section} answers={answers} setAnswer={setAnswer} />
          ))}
        </div>
      )}
    </div>
  );
}

function Step4({ state, setAnswer }: {
  state: IntakeState;
  setAnswer: (service: ServiceType, key: string, value: unknown) => void;
}) {
  const services = state.service_types;

  if (services.length === 0) {
    return (
      <div className="space-y-4">
        <StepHeading title="Requirements" subtitle="Go back a step and choose what you are looking for first." />
      </div>
    );
  }

  const title = services.length === 1
    ? `Your ${SERVICE_META[services[0]].noun} in more detail`
    : "Each part in more detail";

  return (
    <div className="space-y-6">
      <StepHeading
        optional
        title={title}
        subtitle={services.length === 1
          ? "These are the questions we would otherwise ask on a call. Answer what you can and leave the rest, including any you are not sure about."
          : "One set of questions per thing you picked. Open the ones you have answers for and skip the rest, including any you are not sure about."}
      />
      <div className={cn(services.length > 1 && "space-y-3")}>
        {services.map((serviceType, i) => (
          <ServiceRequirements
            key={serviceType}
            serviceType={serviceType}
            answers={state.specifics[serviceType] ?? {}}
            setAnswer={(key, value) => setAnswer(serviceType, key, value)}
            defaultOpen={i === 0}
            index={i}
            total={services.length}
          />
        ))}
      </div>
    </div>
  );
}

function Step5({ state, update }: { state: IntakeState; update: (p: Partial<IntakeState>) => void }) {
  return (
    <div className="space-y-6">
      <StepHeading
        optional
        title="Timeline and budget"
        subtitle="Nothing here is binding. It just helps us propose something realistic instead of guessing."
      />

      <div className="space-y-2">
        <FieldLabel label="When would you like this ready?" />
        <RadioList
          options={TIMELINE_OPTIONS.map((t) => ({ value: t, label: t }))}
          value={state.timeline}
          onChange={(v) => update({ timeline: v })}
        />
      </div>

      <TextField label="Is a fixed date driving this?"
        note="A launch, an event, a tender, a new financial year."
        value={state.hard_deadline} onChange={(v) => update({ hard_deadline: v })}
        placeholder="We open the new branch on 1 December" />

      <div className="space-y-2">
        <FieldLabel label="What budget range are you working with?"
          note="An honest range gets you an honest proposal. If you genuinely do not know, say so and we will guide you." />
        <RadioList
          options={BUDGET_OPTIONS.map((b) => ({ value: b, label: b }))}
          value={state.budget_range}
          onChange={(v) => update({ budget_range: v })}
        />
      </div>

      {state.budget_range && (
        <div className="space-y-2">
          <FieldLabel label="How firm is that?" />
          <RadioList options={BUDGET_CONFIDENCE_OPTIONS} value={state.budget_confidence}
            onChange={(v) => update({ budget_confidence: v })} />
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel label="Where are you in your decision?" />
        <RadioList options={DECISION_STAGE_OPTIONS} value={state.decision_stage}
          onChange={(v) => update({ decision_stage: v })} />
      </div>

      <TextArea label="Anything else we should know?"
        note="Questions, concerns, constraints, or anything we have not thought to ask."
        value={state.additional_notes} onChange={(v) => update({ additional_notes: v })}
        placeholder="Anything at all..."
        rows={3} />
    </div>
  );
}

function CcEditor({ emails, onChange }: { emails: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (!isValidEmail(value)) { setError("That does not look like a valid email address."); return; }
    if (emails.some((e) => e.toLowerCase() === value.toLowerCase())) { setDraft(""); return; }
    if (emails.length >= 5) { setError("You can add up to 5 people here."); return; }
    onChange([...emails, value]);
    setDraft("");
    setError("");
  }

  return (
    <div className="space-y-2">
      <FieldLabel
        label="Should anyone else be copied on our emails?"
        note="A colleague, your accountant, a business partner. They will be copied on correspondence about this project."
      />
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <span key={email}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200">
              {email}
              <button type="button" onClick={() => onChange(emails.filter((e) => e !== email))}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-colors"
                aria-label={`Remove ${email}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="email" value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="colleague@company.co.ke"
          className={INPUT_CLASS} />
        <button type="button" onClick={add}
          className="shrink-0 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-[#f9a825] hover:text-[#152238] transition-colors">
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ReviewBlock({ state }: { state: IntakeState }) {
  const rows: { label: string; value: string }[] = [];

  const push = (label: string, value?: string | null) => {
    if (value && value.trim()) rows.push({ label, value: value.trim() });
  };

  push("What you need", state.service_types.map((s) => SERVICE_META[s].label).join(", "));
  push("Business", state.submitter_company);
  push("Industry", state.industry);
  push("Project", state.project_title);
  push("Description", state.description);
  push("Problem to solve", state.problem_statement);
  push("Success looks like", state.success_criteria);
  push("Timeline", state.timeline);
  push("Fixed date", state.hard_deadline);
  push("Budget", state.budget_range);
  push("Decision stage", DECISION_STAGE_OPTIONS.find((d) => d.value === state.decision_stage)?.label);

  const groups = readAnswerGroups(state.service_types, state.specifics);
  const isEmpty = rows.length === 0 && groups.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 bg-white">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Everything you have told us</p>
      </div>
      <div className="px-4 py-1 max-h-72 overflow-y-auto">
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="py-2 border-b border-slate-200/70 last:border-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{row.label}</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">{row.value}</p>
          </div>
        ))}
        {groups.map((group) => (
          <div key={group.serviceType} className="py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#f9a825] pt-1 pb-0.5">
              {group.serviceLabel}
            </p>
            {group.rows.map((row) => (
              <div key={row.key} className="py-2 border-b border-slate-200/70 last:border-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{row.label}</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-0.5">{row.value}</p>
              </div>
            ))}
          </div>
        ))}
        {isEmpty && <p className="text-xs text-slate-400 py-3">Nothing captured yet.</p>}
      </div>
    </div>
  );
}

function Step6({ state, update, isGeneric }: {
  state: IntakeState;
  update: (p: Partial<IntakeState>) => void;
  isGeneric: boolean;
}) {
  return (
    <div className="space-y-5">
      <StepHeading
        title="How do we reach you?"
        subtitle={isGeneric
          ? "Almost done. We only need a name and an email to get back to you."
          : "Almost done. Your details are pre-filled, so just correct anything that has changed."}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Your name" required
          value={state.submitter_name} onChange={(v) => update({ submitter_name: v })}
          placeholder="Full name" />
        <TextField label="Your role"
          value={state.submitter_role} onChange={(v) => update({ submitter_role: v })}
          placeholder="Owner, Manager, Director..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Email" required type="email"
          value={state.submitter_email} onChange={(v) => update({ submitter_email: v })}
          placeholder="you@example.com" />
        <TextField label="Phone or WhatsApp"
          note="Often the fastest way for us to reach you."
          value={state.submitter_phone} onChange={(v) => update({ submitter_phone: v })}
          placeholder="07xx xxx xxx" />
      </div>

      <div className="space-y-2">
        <FieldLabel label="How would you prefer we get in touch?" />
        <Chips
          options={PREFERRED_CONTACT_OPTIONS.map((o) => o.label)}
          selected={PREFERRED_CONTACT_OPTIONS.filter((o) => o.value === state.preferred_contact).map((o) => o.label)}
          onToggle={(label) => {
            const opt = PREFERRED_CONTACT_OPTIONS.find((o) => o.label === label);
            update({ preferred_contact: opt && state.preferred_contact !== opt.value ? opt.value : "" });
          }}
        />
      </div>

      <CcEditor emails={state.cc_emails} onChange={(next) => update({ cc_emails: next })} />

      <div className="space-y-2">
        <FieldLabel label="How did you hear about us?" />
        <Chips options={HEARD_FROM_OPTIONS} selected={state.heard_from ? [state.heard_from] : []}
          onToggle={(v) => update({ heard_from: state.heard_from === v ? "" : v })} />
      </div>

      <ReviewBlock state={state} />

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={state.contact_consent}
          onChange={(e) => update({ contact_consent: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-[#f9a825]" />
        <span className="text-xs text-slate-500 leading-relaxed">
          I am happy for {SITE_NAME} to contact me about this enquiry, and to copy in anyone I listed above.
        </span>
      </label>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function IntakeWizard({
  token = "",
  clientName = "",
  clientEmail = "",
  clientCompany = "",
  clientPhone = "",
  isGeneric = false,
  defaultServiceType = "",
  editToken = "",
  initialState,
  editsRemaining = 0,
  maxEdits = 0,
}: {
  token?: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  clientPhone?: string;
  isGeneric?: boolean;
  /** Pre-selects step 1, e.g. arriving from /contact after picking a service. */
  defaultServiceType?: string;
  /** Set when reopening an already-submitted intake. Switches the wizard from
   * creating a submission to revising one. */
  editToken?: string;
  /** Previous answers, so an edit opens with everything already filled in. */
  initialState?: Partial<IntakeState>;
  editsRemaining?: number;
  maxEdits?: number;
}) {
  const isEditing = !!editToken;
  const defaultServices: ServiceType[] = (SERVICE_TYPES as readonly string[]).includes(defaultServiceType)
    ? [defaultServiceType as ServiceType]
    : [];

  // Scoped per intake when editing, so a revision in progress can never be
  // confused with a draft of a brand new submission.
  const draftKey = `${DRAFT_KEY_PREFIX}:${editToken ? `edit-${editToken}` : token || "generic"}`;

  const [step, setStep] = useState(1);
  const [state, setState] = useState<IntakeState>({
    ...EMPTY,
    service_types: defaultServices,
    submitter_name: clientName,
    submitter_email: clientEmail,
    submitter_company: clientCompany,
    submitter_phone: clientPhone,
    ...initialState,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  /** Returned on submission, so the client can come back and revise. */
  const [editUrl, setEditUrl] = useState("");
  const [remainingEdits, setRemainingEdits] = useState(editsRemaining);
  const [scrolled, setScrolled] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore an unfinished draft. A six-step form on a phone gets interrupted;
  // losing everything on a dropped connection is the single biggest reason
  // these forms get abandoned halfway.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { state: IntakeState; step: number };
        if (parsed?.state) {
          setState((prev) => ({ ...prev, ...parsed.state }));
          setStep(Math.min(Math.max(parsed.step ?? 1, 1), TOTAL_STEPS));
          setDraftRestored(true);
        }
      }
    } catch {
      // A corrupt draft must never block the form.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || submitted) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ state, step }));
    } catch {
      // Storage full or blocked (private mode): saving is best-effort only.
    }
  }, [state, step, hydrated, submitted, draftKey]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Moving between steps should always land at the top of the new step.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // The furthest step reached, so someone who jumps back to fix an answer can
  // jump forward again rather than clicking Continue through everything.
  const [maxStepReached, setMaxStepReached] = useState(1);
  useEffect(() => {
    setMaxStepReached((prev) => Math.max(prev, step));
  }, [step]);

  const update = useCallback((patch: Partial<IntakeState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setError("");
  }, []);

  const setAnswer = useCallback((service: ServiceType, key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      specifics: {
        ...prev.specifics,
        [service]: { ...(prev.specifics[service] ?? {}), [key]: value },
      },
    }));
  }, []);

  const stepError = useMemo(() => {
    if (step === 1 && state.service_types.length === 0) {
      return "Choose at least one thing you are looking for to continue.";
    }
    if (step === 3) {
      const desc = state.description.trim();
      if (!desc) return "A short description of what you want is the one thing we need.";
      if (desc.length < 20) return `Please add a little more detail (${desc.length} of 20 characters).`;
    }
    if (step === 6) {
      if (state.submitter_name.trim().length < 2) return "Please enter your name.";
      if (!isValidEmail(state.submitter_email)) return "Please enter a valid email address.";
      if (!state.contact_consent) return "Please confirm we may contact you about this enquiry.";
    }
    return "";
  }, [step, state]);

  const canAdvance = stepError === "";

  async function handleSubmit() {
    if (stepError) { setError(stepError); return; }

    setSubmitting(true);
    setError("");
    try {
      const url = isEditing
        ? `/api/intake/edit/${editToken}`
        : token ? `/api/intake/${token}` : "/api/intake";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          // The primary service stays in service_type so the admin filters,
          // acknowledgement emails and AI prompts keep a single lead service.
          service_type: state.service_types[0],
          completed_steps: TOTAL_STEPS,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const fieldErrors: string[] = [];
        if (j.details?.fieldErrors) {
          const FIELD_LABELS: Record<string, string> = {
            description: "Project description",
            submitter_name: "Your name",
            submitter_email: "Your email",
            service_type: "What you need",
          };
          for (const [field, msgs] of Object.entries(j.details.fieldErrors as Record<string, string[]>)) {
            fieldErrors.push(`${FIELD_LABELS[field] ?? field}: ${(msgs as string[])[0]?.toLowerCase()}`);
          }
        }
        setError(fieldErrors.length
          ? `Please fix the following:\n• ${fieldErrors.join("\n• ")}`
          : (j.error ?? "Submission failed. Please try again."));
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (isEditing) {
        setRemainingEdits(Number(payload.editsRemaining ?? 0));
      } else if (payload.editUrl) {
        setEditUrl(String(payload.editUrl));
        setRemainingEdits(Number(payload.editsRemaining ?? maxEdits));
      }
      try { window.localStorage.removeItem(draftKey); } catch { /* best effort */ }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function discardDraft() {
    try { window.localStorage.removeItem(draftKey); } catch { /* best effort */ }
    setState({
      ...EMPTY,
      service_types: defaultServices,
      submitter_name: clientName,
      submitter_email: clientEmail,
      submitter_company: clientCompany,
      submitter_phone: clientPhone,
    });
    setStep(1);
    setDraftRestored(false);
  }

  // ── Edit budget spent ──────────────────────────────────────────────────────
  // Checked before the form renders. Letting someone rewrite six steps and
  // only then telling them it cannot be saved would be the worse failure.

  if (isEditing && remainingEdits <= 0 && !submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#f1f5f9" }}>
        <div style={{ background: NAVY }} className="px-4 pt-5 pb-6 shrink-0">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-extrabold shrink-0 shadow-sm"
              style={{ background: GOLD, color: NAVY }}>B</div>
            <p className="text-white font-semibold text-sm tracking-wide">{SITE_NAME}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 sm:p-12 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6 text-2xl">
              📋
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">This submission is now final</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              You have already updated it {maxEdits} times, which is the limit. Nothing is lost, we still have
              everything you sent. If something else needs changing, message us and we will update it for you.
            </p>
            <a href={`https://wa.me/${BUSINESS_WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#25D366" }}>
              💬 Message us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Thank you screen ───────────────────────────────────────────────────────

  if (submitted) {
    const firstName = state.submitter_name.trim().split(" ")[0] || "there";
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#f1f5f9" }}>
        <div style={{ background: NAVY }} className="px-4 pt-5 pb-6 shrink-0">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-extrabold shrink-0 shadow-sm"
              style={{ background: GOLD, color: NAVY }}>B</div>
            <p className="text-white font-semibold text-sm tracking-wide">{SITE_NAME}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 sm:p-12 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              {isEditing ? "Your changes are saved" : "We have your requirements"}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-2">
              {isEditing
                ? `Thank you, ${firstName}. We have the updated version and will work from that.`
                : `Thank you, ${firstName}. We are reviewing what you sent and will reach out to arrange a discovery call so we can go through it together.`}
            </p>
            {!isEditing && state.cc_emails.length > 0 && (
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                We have also copied {state.cc_emails.join(", ")} on the confirmation.
              </p>
            )}

            {/* Coming back to change something is expected, not an exception,
                so the way to do it is offered here rather than left to be
                found in the email. */}
            {(editUrl || isEditing) && (
              <div className="mt-5 pt-5 border-t border-slate-200 text-left">
                {remainingEdits > 0 ? (
                  <>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Remembered something? You can update this submission{" "}
                      <strong className="text-slate-700">
                        {remainingEdits} more {remainingEdits === 1 ? "time" : "times"}
                      </strong>
                      . We have emailed you the link as well.
                    </p>
                    <a
                      href={editUrl || `/intake/edit/${editToken}`}
                      className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-[#152238] underline"
                    >
                      Update my answers
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    That was your last available update. If anything else needs changing, just reply to
                    our email and we will take care of it.
                  </p>
                )}
              </div>
            )}

            <a href={`https://wa.me/${BUSINESS_WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mt-5"
              style={{ background: "#25D366" }}>
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const isOptionalStep = !REQUIRED_STEPS.has(step);

  const navButtons = (
    <div className="space-y-2">
      <div className="flex gap-3">
        {step > 1 && (
          <button type="button" onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all">
            Back
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button type="button" onClick={() => canAdvance ? setStep((s) => s + 1) : setError(stepError)}
            disabled={!canAdvance}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed"
            style={canAdvance ? { background: GOLD, color: NAVY } : { background: "#e2e8f0", color: "#94a3b8" }}>
            Continue
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || !canAdvance}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: NAVY, color: "#ffffff" }}>
            {submitting
              ? (isEditing ? "Saving..." : "Submitting...")
              : (isEditing ? "Save my changes" : "Submit requirements")}
          </button>
        )}
      </div>
      {isOptionalStep && step < TOTAL_STEPS && (
        <button type="button" onClick={() => setStep((s) => s + 1)}
          className="w-full py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
          Skip this step
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f1f5f9" }}>

      {/* Full header */}
      <div style={{ background: NAVY }} className="shrink-0">
        <div style={{ height: 3, background: GOLD }} />

        <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-extrabold shrink-0 shadow-sm"
              style={{ background: GOLD, color: NAVY }}>B</div>
            <p className="text-white font-semibold text-sm tracking-wide">{SITE_NAME}</p>
          </div>
          <h1 className="text-white text-xl font-bold leading-snug">
            {isEditing ? "Update your requirements" : "Tell us about your project"}
          </h1>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            {isEditing
              ? `Your previous answers are all here. Change whatever you need and submit again. This is update ${maxEdits - remainingEdits + 1} of ${maxEdits}.`
              : "Six short steps, and only three answers are actually required. Skip anything that does not apply, and your progress saves as you go."}
          </p>
        </div>

        {/* Progress. Any step already reached is clickable, on every screen
            size, so nothing feels like a trap and a correction does not mean
            paging through the whole form again. When editing, every step is
            open immediately because all the answers already exist. */}
        <div className="px-4 pb-5 max-w-lg mx-auto">
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "none" }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const reachable = isEditing || n <= maxStepReached;
              const current = n === step;
              return (
                <button key={label} type="button"
                  onClick={() => reachable && setStep(n)}
                  disabled={!reachable}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors",
                    current
                      ? "bg-[#f9a825] text-[#152238]"
                      : reachable
                        ? "text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                        : "text-white/25 cursor-not-allowed"
                  )}>
                  <span className={cn(
                    "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0",
                    current ? "bg-[#152238] text-[#f9a825]" : "bg-white/10"
                  )}>
                    {n}
                  </span>
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: GOLD }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/40 text-[11px]">Step {step} of {TOTAL_STEPS}</span>
            <span style={{ color: GOLD }} className="text-[11px] font-medium">{STEP_LABELS[step - 1]}</span>
          </div>
        </div>
      </div>

      {/* Sticky mini header */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      )} style={{ background: NAVY, borderBottom: `2px solid ${GOLD}` }}>
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0"
              style={{ background: GOLD, color: NAVY }}>B</div>
            <span className="text-white font-semibold text-sm truncate">{STEP_LABELS[step - 1]}</span>
          </div>
          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(249,168,37,0.15)", color: GOLD }}>
            {step}/{TOTAL_STEPS}
          </span>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: GOLD, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 pb-40 sm:pb-6">
        <div className="max-w-lg mx-auto space-y-3">

          {/* A submission made before the questionnaire was expanded opens
              with new, unanswered questions. Saying so prevents it reading as
              though their original answers were lost. */}
          {isEditing && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
              <span className="shrink-0 mt-0.5">✏️</span>
              <span className="flex-1 leading-relaxed">
                Everything you told us before is already filled in. We have since added a few more
                questions, all optional, so you may see some blanks. Answer any that are useful and
                leave the rest.
              </span>
            </div>
          )}

          {draftRestored && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
              <span className="shrink-0 mt-0.5">💾</span>
              <span className="flex-1 leading-relaxed">
                We picked up where you left off.{" "}
                <button type="button" onClick={discardDraft}
                  className="font-semibold text-slate-700 underline hover:text-[#152238]">
                  Start over
                </button>
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8">
            {step === 1 && <Step1 state={state} update={update} />}
            {step === 2 && <Step2 state={state} update={update} />}
            {step === 3 && <Step3 state={state} update={update} />}
            {step === 4 && <Step4 state={state} setAnswer={setAnswer} />}
            {step === 5 && <Step5 state={state} update={update} />}
            {step === 6 && <Step6 state={state} update={update} isGeneric={isGeneric} />}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line leading-relaxed">
                {error}
              </div>
            )}

            <div className="hidden sm:block mt-8">{navButtons}</div>
          </div>
        </div>
      </div>

      {/* Fixed bottom nav, mobile only */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pt-3"
        style={{
          background: "rgba(255,255,255,0.97)",
          WebkitBackdropFilter: "blur(12px)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}>
        {navButtons}
      </div>
    </div>
  );
}
