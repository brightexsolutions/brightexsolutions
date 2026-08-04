"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, User, Mail, Phone, Building2, Briefcase, Calendar, FileText, Tag, Sparkles, Loader2, FileSignature, Archive, Download, Users, ClipboardList, Pencil } from "lucide-react";
import { sopsForServices } from "@/lib/sop-library";
import { cn } from "@/lib/utils";
import {
  SERVICE_LABELS as SCHEMA_SERVICE_LABELS,
  readAnswerGroups,
  serviceTypesOf,
  buildIntakeBrief,
  DECISION_STAGE_OPTIONS,
  BUDGET_CONFIDENCE_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
} from "@/lib/intake-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntakeAnalysis = {
  summary: string;
  considerations: string[];
  action_items: { label: string; type: "generate_proposal" | "note" }[];
};

export type IntakeDetail = {
  id: string;
  /** Primary service. Always present, including on v1 records. */
  service_type: string;
  /** Every service asked for. Absent on v1 records. */
  service_types?: string[] | null;
  project_title?: string | null;
  description: string;
  problem_statement?: string | null;
  success_criteria?: string | null;
  reference_links?: string | null;
  specifics?: Record<string, unknown> | null;
  timeline?: string | null;
  hard_deadline?: string | null;
  budget_range?: string | null;
  budget_confidence?: string | null;
  decision_stage?: string | null;
  additional_notes?: string | null;
  // Business context
  industry?: string | null;
  business_summary?: string | null;
  target_audience?: string | null;
  online_presence?: string | null;
  // Submitter
  submitter_name: string;
  submitter_email: string;
  submitter_role?: string | null;
  submitter_phone?: string | null;
  submitter_company?: string | null;
  preferred_contact?: string | null;
  cc_emails?: string[] | null;
  heard_from?: string | null;
  status: string;
  submitted_at: string;
  reviewed_at?: string | null;
  // Client-side revisions (migration 037)
  edit_count?: number | null;
  last_edited_at?: string | null;
  edited_after_review?: boolean | null;
  revisions?: { edited_at: string; changed_fields: string[] }[] | null;
  ai_analysis?: IntakeAnalysis | null;
  ai_analyzed_at?: string | null;
};

// ─── Label maps ───────────────────────────────────────────────────────────────

/** Re-exported so existing importers keep working from one source of truth. */
export const SERVICE_LABELS = SCHEMA_SERVICE_LABELS;

const STATUS_COLOUR: Record<string, string> = {
  new:      "bg-amber-50 text-amber-700 border-amber-200",
  reviewed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function optionLabel(options: { value: string; label: string }[], value?: string | null): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

// ─── Utility components ───────────────────────────────────────────────────────

function SpecRow({ label, value, multiline, link }: {
  label: string;
  value: string;
  multiline?: boolean;
  link?: boolean;
}) {
  if (!value) return null;
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
  intake, clientId, onAnalysisSaved,
}: {
  intake: IntakeDetail;
  clientId: string;
  /** Bubbles the fresh analysis up to the parent's cached intake list -
   * without this, reopening the panel later re-reads stale pre-analysis
   * data that was fetched before this analyze call ever ran. */
  onAnalysisSaved?: (analysis: IntakeAnalysis, analyzedAt: string) => void;
}) {
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(intake.ai_analysis ?? null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(intake.ai_analyzed_at ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function analyzeWithAI() {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/intakes/analyze?intakeId=${intake.id}`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Analysis failed");
      const now = new Date().toISOString();
      setAnalysis(payload.data);
      setAnalyzedAt(now);
      onAnalysisSaved?.(payload.data, now);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
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
              {analysis.action_items.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 px-3 py-1.5 text-xs text-foreground">
                  {item.type === "generate_proposal"
                    ? <FileSignature size={12} className="text-brand-gold mt-0.5 shrink-0" />
                    : <span className="text-primary mt-0.5">-</span>}
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </Section>
  );
}

function IntakeProposalPanel({
  intake, clientId, onReady,
}: {
  intake: IntakeDetail;
  clientId: string;
  onReady?: (doc: { id: string; title: string; data: Record<string, unknown> }) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [doc, setDoc] = useState<{ id: string; title: string; data: Record<string, unknown> } | null>(null);
  const [error, setError] = useState("");

  async function generateProposal() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "proposal",
          clientId,
          engagementSummary: buildIntakeBrief(intake),
          timeline: intake.timeline || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Proposal generation failed");
      const created = { id: payload.data.id as string, title: payload.data.title as string, data: payload.data.data as Record<string, unknown> };
      setDoc(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Section title="Generate Proposal" icon={FileSignature}>
      {!doc ? (
        <button
          type="button"
          onClick={generateProposal}
          disabled={generating}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-sm bg-brand-gold/10 border border-brand-gold/30 text-xs font-semibold text-brand-navy dark:text-brand-gold hover:bg-brand-gold/20 transition-colors disabled:opacity-60"
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <FileSignature size={13} />}
          {generating ? "Generating…" : "Generate Proposal from this Intake"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onReady?.(doc)}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-sm bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <Download size={13} /> View / Download / Send to Client
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </Section>
  );
}

interface Props {
  intake: IntakeDetail | null;
  clientId?: string | null;
  onClose: () => void;
  onMarkReviewed?: (id: string, notifyClient: boolean) => Promise<void>;
  marking?: boolean;
  /** Puts a reviewed intake back to "new", which reopens client editing. */
  onReopen?: (id: string) => Promise<void>;
  reopening?: boolean;
  onEmailClient?: () => void;
  onArchive?: (id: string) => Promise<void>;
  archiving?: boolean;
  onAnalysisSaved?: (intakeId: string, analysis: IntakeAnalysis, analyzedAt: string) => void;
  onProposalReady?: (intake: IntakeDetail, doc: { id: string; title: string; data: Record<string, unknown> }) => void;
}

/**
 * Marking reviewed is no longer a private bookkeeping flag: it closes the
 * client's edit window and emails them to say so. The button therefore has to
 * state both consequences before it is pressed, and offer the quiet version for
 * tidying up old submissions.
 *
 * Its own component because IntakeDetailSheet returns early when there is no
 * intake, so state cannot be held above that line.
 */
function MarkReviewedAction({
  intakeId,
  onMarkReviewed,
  marking,
}: {
  intakeId: string;
  onMarkReviewed: (id: string, notifyClient: boolean) => Promise<void>;
  marking?: boolean;
}) {
  const [notify, setNotify] = useState(true);

  return (
    <div className="space-y-2">
      <Button
        className="w-full gap-2"
        onClick={() => onMarkReviewed(intakeId, notify)}
        disabled={marking}
        size="sm"
      >
        <CheckCircle size={14} />
        {marking ? "Marking…" : "Mark as reviewed"}
      </Button>
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="mt-0.5 accent-brand-gold"
        />
        <span className="text-[11px] text-muted-foreground leading-relaxed">
          Email the client to say we have read it. Either way this locks their form, so leaving it
          off means they find a closed link with no warning.
        </span>
      </label>
    </div>
  );
}

export function IntakeDetailSheet({ intake, clientId, onClose, onMarkReviewed, marking, onReopen, reopening, onEmailClient, onArchive, archiving, onAnalysisSaved, onProposalReady }: Props) {
  if (!intake) return null;

  const services = serviceTypesOf(intake);
  const serviceLabel = services.map((s) => SERVICE_LABELS[s] ?? s).join(" + ");
  const answerGroups = readAnswerGroups(services, intake.specifics);

  const hasBusinessContext = !!(
    intake.submitter_company || intake.industry || intake.business_summary ||
    intake.target_audience || intake.online_presence
  );
  const hasCommercials = !!(
    intake.timeline || intake.hard_deadline || intake.budget_range ||
    intake.budget_confidence || intake.decision_stage
  );
  const relevantSops = sopsForServices(services);

  return (
    <Sheet open={!!intake} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        // Matches the client panel it opens over, so the one in front is never
        // the narrower of the two.
        className="w-full sm:max-w-lg lg:max-w-xl flex flex-col overflow-hidden p-0"
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
                {intake.submitter_role && (
                  <span className="text-[11px] text-muted-foreground">{intake.submitter_role}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-muted-foreground" />
                <a href={`mailto:${intake.submitter_email}`}
                  className="text-xs text-primary underline">{intake.submitter_email}</a>
              </div>
              {intake.submitter_phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-muted-foreground" />
                  <a href={`tel:${intake.submitter_phone}`}
                    className="text-xs text-primary underline">{intake.submitter_phone}</a>
                </div>
              )}
              {intake.preferred_contact && (
                <p className="text-[11px] text-muted-foreground pl-5">
                  Prefers {optionLabel(PREFERRED_CONTACT_OPTIONS, intake.preferred_contact).toLowerCase()}
                </p>
              )}
              {!!intake.cc_emails?.length && (
                <div className="flex items-start gap-2 pt-1">
                  <Users size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Asked us to copy
                    </p>
                    <p className="text-xs text-foreground break-all">{intake.cc_emails.join(", ")}</p>
                  </div>
                </div>
              )}
              {intake.heard_from && (
                <p className="text-[11px] text-muted-foreground pl-5 pt-0.5">
                  Found us via {intake.heard_from.toLowerCase()}
                </p>
              )}
            </div>
          </Section>

          {/* Business context */}
          {hasBusinessContext && (
            <Section title="Their business" icon={Building2}>
              <div className="space-y-0">
                <SpecRow label="Business" value={intake.submitter_company ?? ""} />
                <SpecRow label="Industry" value={intake.industry ?? ""} />
                <SpecRow label="What they do" value={intake.business_summary ?? ""} multiline />
                <SpecRow label="Their customers" value={intake.target_audience ?? ""} multiline />
                <SpecRow label="Online presence" value={intake.online_presence ?? ""} multiline />
              </div>
            </Section>
          )}

          {/* Project overview */}
          <Section title="Project overview" icon={Briefcase}>
            <div className="space-y-0">
              <SpecRow label="Description" value={intake.description} multiline />
              <SpecRow label="Problem to solve" value={intake.problem_statement ?? ""} multiline />
              <SpecRow label="How they will judge success" value={intake.success_criteria ?? ""} multiline />
              <SpecRow label="References and inspiration" value={intake.reference_links ?? ""} multiline />
            </div>
          </Section>

          {/* Requirements, grouped per service asked for */}
          {answerGroups.map((group) => (
            <Section
              key={group.serviceType}
              title={services.length > 1 ? `${group.serviceLabel} details` : "Project details"}
              icon={Tag}
            >
              <div className="space-y-0">
                {group.rows.map((row) => (
                  <SpecRow
                    key={row.key}
                    label={row.label}
                    value={row.value}
                    multiline={row.multiline}
                    link={/^https?:\/\//.test(row.value)}
                  />
                ))}
              </div>
            </Section>
          ))}

          {/* Timeline, budget and where the decision sits */}
          {hasCommercials && (
            <Section title="Timeline & budget" icon={Calendar}>
              <div className="space-y-0">
                <SpecRow label="Desired timeline" value={intake.timeline ?? ""} />
                <SpecRow label="Fixed deadline" value={intake.hard_deadline ?? ""} />
                <SpecRow label="Budget range" value={intake.budget_range ?? ""} />
                <SpecRow label="Budget position" value={optionLabel(BUDGET_CONFIDENCE_OPTIONS, intake.budget_confidence)} />
                <SpecRow label="Decision stage" value={optionLabel(DECISION_STAGE_OPTIONS, intake.decision_stage)} />
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

          {/* Client revisions. An edit landing after the intake was reviewed is
              the case that matters, because a quote may already have been
              built from the previous version. */}
          {!!intake.edit_count && intake.edit_count > 0 && (
            <div className={cn(
              "rounded-sm border px-3 py-2.5 space-y-1.5",
              intake.edited_after_review
                ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                : "border-border bg-muted/20"
            )}>
              <div className="flex items-center gap-1.5">
                <Pencil size={11} className={intake.edited_after_review ? "text-amber-600" : "text-muted-foreground"} />
                <p className={cn(
                  "text-[11px] font-bold uppercase tracking-widest",
                  intake.edited_after_review ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground"
                )}>
                  {intake.edited_after_review ? "Changed after you reviewed it" : "Updated by the client"}
                </p>
              </div>
              <p className="text-xs text-foreground">
                {intake.edit_count} {intake.edit_count === 1 ? "revision" : "revisions"}
                {intake.last_edited_at && (
                  <span className="text-muted-foreground">
                    {" · last on "}
                    {new Date(intake.last_edited_at).toLocaleDateString("en-KE", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                )}
              </p>
              {!!intake.revisions?.length && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Most recently changed:{" "}
                  {intake.revisions[intake.revisions.length - 1].changed_fields
                    .map((f) => f.replace(/_/g, " "))
                    .join(", ")}
                </p>
              )}
              {intake.edited_after_review && (
                <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                  Worth re-reading before anything is quoted from it.
                </p>
              )}
            </div>
          )}

          {/* The procedures that apply to what this client actually asked
              for, so the right SOP is one click away at the moment it is
              relevant rather than something to go hunting for. */}
          {relevantSops.length > 0 && (
            <Section title="How we run this" icon={ClipboardList}>
              <div className="space-y-1.5">
                {relevantSops.map((sop) => (
                  <a
                    key={sop.key}
                    href={`/api/admin/sops/${sop.key}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-2.5 py-2 rounded-sm border border-border hover:border-brand-gold/40 hover:bg-muted/30 transition-colors"
                  >
                    <ClipboardList size={12} className="text-brand-gold mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug">{sop.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{sop.summary}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* AI analysis & action items */}
          {clientId && (
            <IntakeAiPanel
              key={intake.id}
              intake={intake}
              clientId={clientId}
              onAnalysisSaved={(analysis, analyzedAt) => onAnalysisSaved?.(intake.id, analysis, analyzedAt)}
            />
          )}

          {/* Generate proposal: always available, not just when AI suggests it */}
          {clientId && (
            <IntakeProposalPanel
              key={`proposal-${intake.id}`}
              intake={intake}
              clientId={clientId}
              onReady={(doc) => onProposalReady?.(intake, doc)}
            />
          )}

          {/* Reviewed info */}
          {intake.status === "reviewed" && intake.reviewed_at && (
            <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
              <CheckCircle size={13} className="mt-0.5 shrink-0" />
              <div>
                <p>
                  Reviewed on {new Date(intake.reviewed_at).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
                <p className="text-emerald-600/80 leading-relaxed mt-0.5">
                  The client can no longer edit this. To let them change something, set it back to
                  new, then review it again once they are done.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(onMarkReviewed || onReopen || onEmailClient || onArchive) && intake.status !== "archived" && (
          <div className="flex-shrink-0 border-t border-border px-5 py-4 space-y-2">
            {intake.status === "new" && onMarkReviewed && (
              <MarkReviewedAction
                intakeId={intake.id}
                onMarkReviewed={onMarkReviewed}
                marking={marking}
              />
            )}
            {intake.status === "reviewed" && onReopen && (
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => onReopen(intake.id)}
                disabled={reopening}
                size="sm"
              >
                <Pencil size={14} />
                {reopening ? "Reopening…" : "Reopen for client edits"}
              </Button>
            )}
            {onEmailClient && (
              <Button className="w-full gap-2" variant="outline" onClick={onEmailClient} size="sm">
                <Mail size={14} /> Reply by Email
              </Button>
            )}
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
