"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, User, Mail, Briefcase, Calendar, DollarSign, FileText, Tag, Sparkles, Loader2, ArrowRight, FileSignature, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntakeAnalysis = {
  summary: string;
  considerations: string[];
  action_items: { label: string; type: "generate_proposal" | "note" }[];
};

export type IntakeDetail = {
  id: string;
  service_type: string;
  project_title?: string | null;
  description: string;
  problem_statement?: string | null;
  specifics?: Record<string, unknown> | null;
  timeline?: string | null;
  budget_range?: string | null;
  additional_notes?: string | null;
  submitter_name: string;
  submitter_email: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string | null;
  ai_analysis?: IntakeAnalysis | null;
  ai_analyzed_at?: string | null;
};

// ─── Label maps ───────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  website:       "Website / Web App",
  mobile:        "Mobile App",
  erp:           "Software / ERP System",
  design:        "Design & Branding",
  consultancy:   "Business Consultancy",
  ai_automation: "AI & Automation",
  other:         "General Enquiry",
};

const STATUS_COLOUR: Record<string, string> = {
  new:      "bg-amber-50 text-amber-700 border-amber-200",
  reviewed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ─── Specifics renderers per service type ────────────────────────────────────

function WebsiteSpecifics({ sp }: { sp: Record<string, unknown> }) {
  return (
    <>
      <SpecRow label="Has existing website" value={boolVal(sp.has_existing_site)} />
      {sp.existing_url && <SpecRow label="Current site URL" value={sp.existing_url as string} link />}
      <SpecRow label="Needs e-commerce" value={boolVal(sp.needs_ecommerce)} />
      <SpecRow label="Has existing branding" value={boolVal(sp.has_branding)} />
      {arrVal(sp.pages).length > 0 && <SpecRow label="Pages needed" value={arrVal(sp.pages).join(", ")} />}
      {sp.references && <SpecRow label="Reference sites" value={sp.references as string} />}
    </>
  );
}

function MobileSpecifics({ sp }: { sp: Record<string, unknown> }) {
  return (
    <>
      {arrVal(sp.platforms).length > 0 && <SpecRow label="Platforms" value={arrVal(sp.platforms).join(", ")} />}
      {sp.audience && <SpecRow label="Primary audience" value={sp.audience as string} />}
      <SpecRow label="Has reference app" value={boolVal(sp.has_reference)} />
      {sp.reference_apps && <SpecRow label="Reference apps" value={sp.reference_apps as string} />}
      {sp.features && <SpecRow label="Key features" value={sp.features as string} multiline />}
    </>
  );
}

function ERPSpecifics({ sp }: { sp: Record<string, unknown> }) {
  return (
    <>
      {sp.business_process && <SpecRow label="Business process" value={sp.business_process as string} multiline />}
      {sp.team_size && <SpecRow label="Number of users" value={sp.team_size as string} />}
      <SpecRow label="Has current system" value={boolVal(sp.has_current_system)} />
      {sp.current_system && <SpecRow label="Current system" value={sp.current_system as string} />}
      {sp.integrations && <SpecRow label="Required integrations" value={sp.integrations as string} multiline />}
    </>
  );
}

function DesignSpecifics({ sp }: { sp: Record<string, unknown> }) {
  return (
    <>
      {arrVal(sp.design_types).length > 0 && <SpecRow label="What needs designing" value={arrVal(sp.design_types).join(", ")} />}
      <SpecRow label="Has existing brand" value={boolVal(sp.has_existing_brand)} />
      {sp.style_notes && <SpecRow label="Style & look" value={sp.style_notes as string} multiline />}
    </>
  );
}

function ConsultancySpecifics({ sp }: { sp: Record<string, unknown> }) {
  return (
    <>
      {arrVal(sp.focus_areas).length > 0 && <SpecRow label="Focus areas" value={arrVal(sp.focus_areas).join(", ")} />}
      {sp.challenge && <SpecRow label="Challenge / context" value={sp.challenge as string} multiline />}
    </>
  );
}

function AiAutomationSpecifics({ sp }: { sp: Record<string, unknown> }) {
  return (
    <>
      {arrVal(sp.focus_areas).length > 0 && <SpecRow label="Type of automation" value={arrVal(sp.focus_areas).join(", ")} />}
      <SpecRow label="Currently done manually / with another tool" value={boolVal(sp.has_current_process)} />
      {sp.current_process && <SpecRow label="Current process" value={sp.current_process as string} />}
      {sp.automation_goal && <SpecRow label="What to automate" value={sp.automation_goal as string} multiline />}
    </>
  );
}

function OtherSpecifics({ sp }: { sp: Record<string, unknown> }) {
  if (sp.extra) return <SpecRow label="Additional context" value={sp.extra as string} multiline />;
  return null;
}

// ─── Utility components ───────────────────────────────────────────────────────

function boolVal(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function arrVal(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  return [];
}

function SpecRow({ label, value, multiline, link }: {
  label: string;
  value: string;
  multiline?: boolean;
  link?: boolean;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary underline break-all">{value}</a>
      ) : (
        <p className={cn("text-xs text-foreground", multiline ? "whitespace-pre-wrap leading-relaxed" : "")}>{value}</p>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function IntakeAiPanel({
  intake, clientId, sp, serviceLabel,
}: {
  intake: IntakeDetail;
  clientId: string;
  sp: Record<string, unknown>;
  serviceLabel: string;
}) {
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(intake.ai_analysis ?? null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(intake.ai_analyzed_at ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");

  async function analyzeWithAI() {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/intakes/analyze?intakeId=${intake.id}`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Analysis failed");
      setAnalysis(payload.data);
      setAnalyzedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateProposal() {
    setGenerating(true);
    setError("");
    try {
      const summary = [
        `Service requested: ${serviceLabel}`,
        intake.project_title && `Project title: ${intake.project_title}`,
        `Description: ${intake.description}`,
        intake.problem_statement && `Problem / challenge: ${intake.problem_statement}`,
        Object.keys(sp).length > 0 && `Project specifics: ${JSON.stringify(sp)}`,
        intake.budget_range && `Client's stated budget range: ${intake.budget_range}`,
        intake.additional_notes && `Additional notes: ${intake.additional_notes}`,
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/admin/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "proposal",
          clientId,
          engagementSummary: summary,
          timeline: intake.timeline || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Proposal generation failed");
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Section title="AI Analysis" icon={Sparkles}>
      {!analysis ? (
        <button
          type="button"
          onClick={analyzeWithAI}
          disabled={analyzing}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-sm border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50"
        >
          {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {analyzing ? "Analyzing…" : "Analyze with AI"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            {analyzedAt && (
              <p className="text-[10px] text-muted-foreground">
                Analyzed {new Date(analyzedAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
            <button
              type="button"
              onClick={analyzeWithAI}
              disabled={analyzing}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {analyzing ? "Re-analyzing…" : "Re-analyze"}
            </button>
          </div>
          <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>

          {analysis.considerations.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Worth clarifying</p>
              <ul className="space-y-1">
                {analysis.considerations.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-primary">-</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.action_items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested next steps</p>
              {analysis.action_items.map((item, i) =>
                item.type === "generate_proposal" ? (
                  <button
                    key={i}
                    type="button"
                    onClick={generateProposal}
                    disabled={generating || generated}
                    className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-sm bg-brand-gold/10 border border-brand-gold/30 text-xs font-semibold text-brand-navy dark:text-brand-gold hover:bg-brand-gold/20 transition-colors disabled:opacity-60"
                  >
                    <span className="flex items-center gap-1.5">
                      {generating ? <Loader2 size={12} className="animate-spin" /> : generated ? <CheckCircle size={12} /> : <FileSignature size={12} />}
                      {generated ? "Proposal generated" : generating ? "Generating…" : item.label}
                    </span>
                    {!generated && !generating && <ArrowRight size={12} />}
                  </button>
                ) : (
                  <div key={i} className="flex items-start gap-1.5 px-3 py-1.5 text-xs text-foreground">
                    <span className="text-primary mt-0.5">-</span>{item.label}
                  </div>
                )
              )}
              {generated && (
                <a href="/admin/documents" className="text-[11px] text-primary underline">View it in Documents →</a>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </Section>
  );
}

interface Props {
  intake: IntakeDetail | null;
  clientId?: string | null;
  onClose: () => void;
  onMarkReviewed?: (id: string) => Promise<void>;
  marking?: boolean;
  onEmailClient?: () => void;
  onArchive?: (id: string) => Promise<void>;
  archiving?: boolean;
}

export function IntakeDetailSheet({ intake, clientId, onClose, onMarkReviewed, marking, onEmailClient, onArchive, archiving }: Props) {
  if (!intake) return null;

  const sp = (intake.specifics ?? {}) as Record<string, unknown>;
  const serviceLabel = SERVICE_LABELS[intake.service_type] ?? intake.service_type;

  function renderSpecifics() {
    switch (intake!.service_type) {
      case "website":     return <WebsiteSpecifics sp={sp} />;
      case "mobile":      return <MobileSpecifics sp={sp} />;
      case "erp":         return <ERPSpecifics sp={sp} />;
      case "design":      return <DesignSpecifics sp={sp} />;
      case "consultancy": return <ConsultancySpecifics sp={sp} />;
      case "ai_automation": return <AiAutomationSpecifics sp={sp} />;
      case "other":       return <OtherSpecifics sp={sp} />;
      default:            return null;
    }
  }

  return (
    <Sheet open={!!intake} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0"
        side="right"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-[#152238] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  STATUS_COLOUR[intake.status] ?? "bg-muted text-muted-foreground border-border"
                )}>
                  {intake.status}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(intake.submitted_at).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </div>
              <SheetTitle className="text-white font-bold text-base leading-snug truncate">
                {intake.project_title || serviceLabel}
              </SheetTitle>
              {intake.project_title && (
                <p className="text-[#f9a825] text-xs font-medium mt-0.5">{serviceLabel}</p>
              )}
            </div>
          </div>
        </div>

        {/* Gold accent bar */}
        <div className="h-[3px] bg-[#f9a825] flex-shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Submitter */}
          <Section title="Submitted by" icon={User}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User size={12} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{intake.submitter_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-muted-foreground" />
                <a href={`mailto:${intake.submitter_email}`}
                  className="text-xs text-primary underline">{intake.submitter_email}</a>
              </div>
            </div>
          </Section>

          {/* Project overview */}
          <Section title="Project overview" icon={Briefcase}>
            <div className="space-y-0">
              <SpecRow label="Description" value={intake.description} multiline />
              {intake.problem_statement && (
                <SpecRow label="Problem / challenge" value={intake.problem_statement} multiline />
              )}
            </div>
          </Section>

          {/* Type-specific details */}
          {Object.keys(sp).length > 0 && (
            <Section title="Project details" icon={Tag}>
              <div className="space-y-0">
                {renderSpecifics()}
              </div>
            </Section>
          )}

          {/* Timeline & Budget */}
          {(intake.timeline || intake.budget_range) && (
            <Section title="Timeline & budget" icon={Calendar}>
              <div className="space-y-0">
                {intake.timeline && <SpecRow label="Desired timeline" value={intake.timeline} />}
                {intake.budget_range && <SpecRow label="Budget range" value={intake.budget_range} />}
              </div>
            </Section>
          )}

          {/* Additional notes */}
          {intake.additional_notes && (
            <Section title="Additional notes" icon={FileText}>
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {intake.additional_notes}
              </p>
            </Section>
          )}

          {/* AI analysis & action items */}
          {clientId && (
            <IntakeAiPanel key={intake.id} intake={intake} clientId={clientId} sp={sp} serviceLabel={serviceLabel} />
          )}

          {/* Reviewed info */}
          {intake.status === "reviewed" && intake.reviewed_at && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircle size={13} />
              Reviewed on {new Date(intake.reviewed_at).toLocaleDateString("en-KE", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(onMarkReviewed || onEmailClient || onArchive) && intake.status !== "archived" && (
          <div className="flex-shrink-0 border-t border-border px-5 py-4 space-y-2">
            <div className="flex gap-2">
              {intake.status === "new" && onMarkReviewed && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => onMarkReviewed(intake.id)}
                  disabled={marking}
                  size="sm"
                >
                  <CheckCircle size={14} />
                  {marking ? "Marking…" : "Mark as reviewed"}
                </Button>
              )}
              {onEmailClient && (
                <Button className="flex-1 gap-2" variant="outline" onClick={onEmailClient} size="sm">
                  <Mail size={14} /> Reply by Email
                </Button>
              )}
            </div>
            {onArchive && (
              <button
                type="button"
                onClick={() => onArchive(intake.id)}
                disabled={archiving}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <Archive size={12} /> {archiving ? "Archiving…" : "Archive this submission"}
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
