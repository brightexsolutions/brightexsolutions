"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, User, Mail, Briefcase, Calendar, DollarSign, FileText, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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
};

// ─── Label maps ───────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  website:     "Website / Web App",
  mobile:      "Mobile App",
  erp:         "Software / ERP System",
  design:      "Design & Branding",
  consultancy: "Business Consultancy",
  other:       "General Enquiry",
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

interface Props {
  intake: IntakeDetail | null;
  onClose: () => void;
  onMarkReviewed?: (id: string) => Promise<void>;
  marking?: boolean;
}

export function IntakeDetailSheet({ intake, onClose, onMarkReviewed, marking }: Props) {
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

        {/* Footer action */}
        {intake.status === "new" && onMarkReviewed && (
          <div className="flex-shrink-0 border-t border-border px-5 py-4">
            <Button
              className="w-full gap-2"
              onClick={() => onMarkReviewed(intake.id)}
              disabled={marking}
              size="sm"
            >
              <CheckCircle size={14} />
              {marking ? "Marking…" : "Mark as reviewed"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
