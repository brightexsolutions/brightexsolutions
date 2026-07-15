import type { SopData } from "@/lib/document-types";

/**
 * Single source of truth for how Brightex actually operates. The public
 * "How We Work" section (src/components/public/process-section.tsx) and the
 * always-referenceable internal SOP (served at
 * /api/admin/documents/default-sop/view) both render from this file, so the
 * promise made to clients and the procedure the team actually follows can
 * never drift apart. Edit here, not in either renderer.
 */
export const PROCESS_STAGES = [
  {
    number: "01",
    title: "Discovery",
    clientDescription:
      "We start by understanding your business — goals, audience, constraints, and what success looks like. No assumptions.",
    responsibility: { role: "Account owner", responsibility: "Runs the discovery call, captures the intake form, and confirms scope, budget range, and timeline with the client before anything is quoted." },
    procedureStep: { step: "Discovery", description: "Client intake form is reviewed (AI-assisted analysis where useful), a discovery call is held if needed, and the engagement summary is captured for proposal drafting." },
  },
  {
    number: "02",
    title: "Strategy & Design",
    clientDescription:
      "Architecture decisions, user flows, and visual design — all mapped out before a single line of code.",
    responsibility: { role: "Account owner", responsibility: "Drafts and sends the proposal or agreement, agrees payment terms with the client, and signs off scope before design/build starts." },
    procedureStep: { step: "Proposal & Agreement", description: "A proposal (and, once accepted, a services agreement) is generated, refined with the client's actual pricing/scope decisions, and sent for approval before work begins." },
  },
  {
    number: "03",
    title: "Build",
    clientDescription:
      "Iterative development with regular check-ins. You see progress every week, not just at the end.",
    responsibility: { role: "Delivery team", responsibility: "Delivers against the agreed scope, keeps the project record and tasks up to date, and flags anything that changes timeline, scope, or cost." },
    procedureStep: { step: "Build & Delivery", description: "Work proceeds against tracked tasks under the project record. Invoices are raised per the agreed payment milestones as work progresses, and the client is kept updated." },
  },
  {
    number: "04",
    title: "Launch & Grow",
    clientDescription:
      "Deployment, handover, and post-launch support. We don't disappear after go-live.",
    responsibility: { role: "Account owner", responsibility: "Confirms final payment is settled, hands over access/credentials, and keeps the client relationship active post-launch (updates, support, future work)." },
    procedureStep: { step: "Launch & Handover", description: "Project status moves to live, remaining balance is invoiced and collected, and the client is moved into ongoing relationship management (check-ins, support, upsell where relevant)." },
  },
] as const;

export const DEFAULT_SOP_DATA: SopData = {
  sop_number: "SOP-DEFAULT-001",
  title: "Brightex Standard Operating Procedure",
  area: "Client Engagement Lifecycle",
  effective_date: "2026-01-01T00:00:00.000Z",
  revision: "1.0",
  purpose:
    "This is the default, always-current procedure for how Brightex Solutions runs a client engagement end to end, from first enquiry to live handover and ongoing relationship. It is the same four-stage process described to clients publicly (\"How We Work\") — this document is the internal operational detail behind each of those stages, so every engagement follows the same standard regardless of who is running it.",
  scope:
    "Covers the full client lifecycle for project-based engagements (websites, apps, software, design, consultancy): discovery through launch and post-launch relationship management. Does not cover subscription/product billing cycles, which have their own procedure.",
  responsibilities: PROCESS_STAGES.map((s) => s.responsibility),
  procedure_steps: PROCESS_STAGES.map((s) => s.procedureStep),
  tools_systems: ["Brightex Admin (this system) — intake, proposals, agreements, invoices, tasks, and client communications all in one place."],
  escalation:
    "If a stage stalls (client unresponsive, scope disputed, payment overdue), the account owner flags it in the client's record and decides whether to pause, renegotiate, or escalate directly with the client. Nothing proceeds to the next stage without the current stage's sign-off (proposal accepted before build starts, final payment settled before full handover).",
};
