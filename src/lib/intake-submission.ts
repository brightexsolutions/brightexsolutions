/**
 * Shared validation and persistence for intake submissions.
 *
 * Both entry points (the public /api/intake form and a client's tokenised
 * /api/intake/[token] link) accept the same payload and write the same row,
 * so the two can never drift apart the way they had.
 *
 * Backwards compatibility matters here: intake links were circulating before
 * the v2 rebuild, so a browser tab left open on the old form can still post
 * the v1 shape (single service_type, flat specifics, no phone or CC). Every
 * v2 field is therefore optional, and a v1 payload validates untouched.
 */

import { z } from "zod";
import {
  SERVICE_TYPES, migrateLegacyAnswers, applyLegacyFieldMoves, type ServiceType,
} from "@/lib/intake-schema";

const ServiceEnum = z.enum(SERVICE_TYPES);

export const IntakeSubmissionSchema = z.object({
  // ── What they want ─────────────────────────────────────────────────────────
  service_type: ServiceEnum,
  service_types: z.array(ServiceEnum).max(SERVICE_TYPES.length).optional(),

  // ── The project ────────────────────────────────────────────────────────────
  project_title: z.string().max(200).trim().optional(),
  description: z.string().min(10).max(5000).trim(),
  problem_statement: z.string().max(2000).trim().optional(),
  success_criteria: z.string().max(2000).trim().optional(),
  reference_links: z.string().max(2000).trim().optional(),

  // Per-service answers. Kept loose on purpose: v1 posted a flat object and
  // v2 posts one nested per service. normaliseSpecifics() reads either.
  specifics: z.record(z.string(), z.unknown()).optional(),

  // ── Business context ───────────────────────────────────────────────────────
  submitter_company: z.string().max(200).trim().optional(),
  industry: z.string().max(120).trim().optional(),
  business_summary: z.string().max(2000).trim().optional(),
  target_audience: z.string().max(2000).trim().optional(),
  online_presence: z.string().max(1000).trim().optional(),

  // ── Commercial ─────────────────────────────────────────────────────────────
  timeline: z.string().max(100).trim().optional(),
  hard_deadline: z.string().max(300).trim().optional(),
  budget_range: z.string().max(100).trim().optional(),
  budget_confidence: z.string().max(50).trim().optional(),
  decision_stage: z.string().max(50).trim().optional(),
  additional_notes: z.string().max(2000).trim().optional(),

  // ── Contact ────────────────────────────────────────────────────────────────
  submitter_name: z.string().min(2).max(100).trim(),
  submitter_email: z.string().email().max(200).trim(),
  submitter_role: z.string().max(120).trim().optional(),
  submitter_phone: z.string().max(50).trim().optional(),
  preferred_contact: z.string().max(30).trim().optional(),
  cc_emails: z.array(z.string().email().max(200).trim()).max(5).optional(),
  heard_from: z.string().max(120).trim().optional(),
  contact_consent: z.boolean().optional(),

  completed_steps: z.number().int().min(0).max(20).optional(),
});

export type IntakeSubmission = z.infer<typeof IntakeSubmissionSchema>;

/** Columns added by migration 032, stripped if that migration has not run. */
const V2_COLUMNS = [
  "service_types", "submitter_company", "submitter_role", "submitter_phone",
  "cc_emails", "preferred_contact", "industry", "business_summary",
  "target_audience", "online_presence", "success_criteria", "reference_links",
  "assets", "hard_deadline", "decision_stage", "budget_confidence",
  "heard_from", "contact_consent", "is_partial", "completed_steps",
] as const;

/** Builds the client_intakes row for a validated submission. */
export function buildIntakeRow(data: IntakeSubmission, clientId: string | null) {
  const serviceTypes = data.service_types?.length ? data.service_types : [data.service_type];

  return {
    client_id: clientId,
    // Primary service. Everything downstream that expects one service (admin
    // filters, ack emails, AI prompts) reads this; the full set lives in
    // service_types.
    service_type: data.service_type,
    service_types: serviceTypes,
    project_title: data.project_title ?? null,
    description: data.description,
    problem_statement: data.problem_statement ?? null,
    success_criteria: data.success_criteria ?? null,
    reference_links: data.reference_links ?? null,
    specifics: data.specifics ?? {},
    submitter_company: data.submitter_company ?? null,
    industry: data.industry ?? null,
    business_summary: data.business_summary ?? null,
    target_audience: data.target_audience ?? null,
    online_presence: data.online_presence ?? null,
    timeline: data.timeline ?? null,
    hard_deadline: data.hard_deadline ?? null,
    budget_range: data.budget_range ?? null,
    budget_confidence: data.budget_confidence ?? null,
    decision_stage: data.decision_stage ?? null,
    additional_notes: data.additional_notes ?? null,
    submitter_name: data.submitter_name,
    submitter_email: data.submitter_email,
    submitter_role: data.submitter_role ?? null,
    submitter_phone: data.submitter_phone ?? null,
    preferred_contact: data.preferred_contact ?? null,
    cc_emails: data.cc_emails ?? [],
    heard_from: data.heard_from ?? null,
    contact_consent: data.contact_consent ?? true,
    completed_steps: data.completed_steps ?? 0,
    status: "new",
  };
}

/** The same row with every v2-only column removed. */
export function stripV2Columns(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const column of V2_COLUMNS) delete out[column];
  return out;
}

/**
 * Inserts an intake, retrying without the v2 columns if migration 032 has not
 * been applied yet. A submission is a lead we cannot ask the client to retype,
 * so a missing column must never cost us the whole record.
 */
type InsertQuery = {
  insert: (row: Record<string, unknown>) => {
    select: (cols: string) => {
      single: () => PromiseLike<{ data: { edit_token?: string | null } | null; error: { message: string } | null }>;
    };
  };
};

export async function insertIntake(
  supabase: { from: (table: string) => InsertQuery },
  row: Record<string, unknown>
): Promise<{ error: { message: string } | null; degraded: boolean; editToken: string | null }> {
  // edit_token is generated by a trigger (migration 037), so it has to be read
  // back rather than computed here.
  const { data, error } = await supabase
    .from("client_intakes")
    .insert(row)
    .select("edit_token")
    .single();

  if (!error) return { error: null, degraded: false, editToken: data?.edit_token ?? null };

  if (/column|schema cache/i.test(error.message)) {
    const { data: retryData, error: retryError } = await supabase
      .from("client_intakes")
      .insert(stripV2Columns(row))
      .select("edit_token")
      .single();
    return { error: retryError, degraded: true, editToken: retryData?.edit_token ?? null };
  }
  return { error, degraded: false, editToken: null };
}

// ─── Client-side editing ──────────────────────────────────────────────────────

/**
 * How many times a client may revise their own submission after sending it.
 *
 * Bounded rather than unlimited: an intake is what a quote gets built from, so
 * a document that can change indefinitely after we have priced against it is
 * not a stable basis for anything. Two covers the realistic cases, which are
 * remembering an omission and correcting a detail.
 */
export const MAX_INTAKE_EDITS = 2;

/** Fields a client may change when revising. Excludes everything the admin
 * owns (status, review state, AI analysis) so an edit can never reset those. */
const EDITABLE_FIELDS = [
  "service_type", "service_types", "project_title", "description",
  "problem_statement", "success_criteria", "reference_links", "specifics",
  "submitter_company", "industry", "business_summary", "target_audience",
  "online_presence", "timeline", "hard_deadline", "budget_range",
  "budget_confidence", "decision_stage", "additional_notes",
  "submitter_name", "submitter_email", "submitter_role", "submitter_phone",
  "preferred_contact", "cc_emails", "heard_from",
] as const;

/** Human labels for the fields a revision can touch, for the change summary. */
const FIELD_LABELS: Record<string, string> = {
  service_types: "What they need",
  service_type: "Primary service",
  project_title: "Project title",
  description: "Description",
  problem_statement: "Problem to solve",
  success_criteria: "How they judge success",
  reference_links: "References",
  specifics: "Requirements answers",
  submitter_company: "Business name",
  industry: "Industry",
  business_summary: "What the business does",
  target_audience: "Their customers",
  online_presence: "Online presence",
  timeline: "Timeline",
  hard_deadline: "Fixed deadline",
  budget_range: "Budget range",
  budget_confidence: "Budget position",
  decision_stage: "Decision stage",
  additional_notes: "Additional notes",
  submitter_name: "Name",
  submitter_email: "Email",
  submitter_role: "Role",
  submitter_phone: "Phone",
  preferred_contact: "Preferred contact",
  cc_emails: "People to copy",
  heard_from: "How they found us",
};

/**
 * Which editable fields actually differ. Compared by value rather than
 * reference so an untouched form does not report every field as changed.
 */
export function diffIntake(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { field: string; label: string }[] {
  const changed: { field: string; label: string }[] = [];
  for (const field of EDITABLE_FIELDS) {
    const a = before[field];
    const b = after[field];
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) {
      changed.push({ field, label: FIELD_LABELS[field] ?? field });
    }
  }
  return changed;
}

/** The snapshot stored in `revisions` before an edit overwrites the row. */
export function snapshotOf(row: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) snapshot[field] = row[field] ?? null;
  return snapshot;
}

/**
 * Turns a stored intake row back into the shape the wizard holds in state, so
 * an edit opens with every previous answer already filled in. Anything null
 * becomes an empty string because the form's inputs are all controlled.
 */
export function intakeRowToFormState(row: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // Narrowed to the live union rather than trusted as-is: a service type
  // retired since the row was written must not be handed to the wizard, which
  // would then look up sections that no longer exist.
  const rawTypes = Array.isArray(row.service_types) && row.service_types.length
    ? (row.service_types as string[])
    : row.service_type
      ? [row.service_type as string]
      : [];
  const serviceTypes = rawTypes.filter(
    (t): t is ServiceType => (SERVICE_TYPES as readonly string[]).includes(t)
  );

  // v1 rows stored a flat specifics object against a single service. Nest it
  // so the wizard, which is always per service now, can render it.
  const rawSpecifics = (row.specifics ?? {}) as Record<string, unknown>;
  const isNested = Object.keys(rawSpecifics).some((k) =>
    (SERVICE_TYPES as readonly string[]).includes(k)
  );
  const nested = isNested
    ? (rawSpecifics as Record<string, Record<string, unknown>>)
    : Object.keys(rawSpecifics).length && serviceTypes[0]
      ? { [serviceTypes[0]]: rawSpecifics }
      : {};

  // Answers written under an earlier version of the questionnaire are
  // reshaped to the current one. Without this a v1 submission opens with its
  // answers apparently blank, and worse, a free-text answer sitting in a field
  // that is now a chip list would be wiped the first time the client touched
  // it. See migrateLegacyAnswers for what moves where.
  const migrated: Record<string, Record<string, unknown>> = {};
  for (const [service, answers] of Object.entries(nested)) {
    migrated[service] = migrateLegacyAnswers(service, answers);
  }

  const moved = applyLegacyFieldMoves(migrated, {
    reference_links: row.reference_links ?? "",
  });
  const specifics = moved.specifics;

  return {
    service_types: serviceTypes,
    submitter_company: str(row.submitter_company),
    industry: str(row.industry),
    business_summary: str(row.business_summary),
    target_audience: str(row.target_audience),
    online_presence: str(row.online_presence),
    project_title: str(row.project_title),
    description: str(row.description),
    problem_statement: str(row.problem_statement),
    success_criteria: str(row.success_criteria),
    reference_links: str(moved.topLevel.reference_links),
    specifics,
    timeline: str(row.timeline),
    hard_deadline: str(row.hard_deadline),
    budget_range: str(row.budget_range),
    budget_confidence: str(row.budget_confidence),
    decision_stage: str(row.decision_stage),
    additional_notes: str(row.additional_notes),
    submitter_name: str(row.submitter_name),
    submitter_role: str(row.submitter_role),
    submitter_email: str(row.submitter_email),
    submitter_phone: str(row.submitter_phone),
    preferred_contact: str(row.preferred_contact),
    cc_emails: Array.isArray(row.cc_emails) ? (row.cc_emails as string[]) : [],
    heard_from: str(row.heard_from),
    contact_consent: row.contact_consent !== false,
  };
}

/**
 * A one-line brief for the push notification and admin list, covering every
 * service asked for rather than only the primary one.
 */
export function summariseSubmission(data: IntakeSubmission): string {
  const services = data.service_types?.length ? data.service_types : [data.service_type];
  const label = services.length > 1 ? `${services.length} services` : services[0];
  return `${data.submitter_name} submitted a ${label} requirement${data.project_title ? `: ${data.project_title}` : ""}`;
}
