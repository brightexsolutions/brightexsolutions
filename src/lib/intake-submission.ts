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
import { SERVICE_TYPES } from "@/lib/intake-schema";

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
export async function insertIntake(
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> } },
  row: Record<string, unknown>
): Promise<{ error: { message: string } | null; degraded: boolean }> {
  const { error } = await supabase.from("client_intakes").insert(row);
  if (!error) return { error: null, degraded: false };

  if (/column|schema cache/i.test(error.message)) {
    const { error: retryError } = await supabase.from("client_intakes").insert(stripV2Columns(row));
    return { error: retryError, degraded: true };
  }
  return { error, degraded: false };
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
