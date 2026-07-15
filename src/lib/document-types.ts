/** Structured content shapes for AI-generated documents. Rendered exclusively
 * through src/lib/document-html/* (the skill-compliant HTML system) —
 * these types have no rendering dependency of their own. */

export type PaymentMilestone = { label: string; amount: number; due: string };
export type AgreementData = {
  agreement_number: string;
  created_at: string;
  project_title: string;
  scope_summary: string;
  deliverables: string[];
  total_fees: number;
  payment_milestones: PaymentMilestone[];
  timeline: string;
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null };
  special_terms?: string | null;
};

export type SopStep = { step: string; description: string };
export type SopResponsibility = { role: string; responsibility: string };
export type SopData = {
  sop_number: string;
  title: string;
  area: string;
  effective_date: string;
  revision: string;
  purpose: string;
  scope: string;
  responsibilities: SopResponsibility[];
  procedure_steps: SopStep[];
  tools_systems: string[];
  escalation: string;
};
