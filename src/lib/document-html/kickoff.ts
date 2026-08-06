/**
 * Kick-off: planning the project, tasks and invoices a signed agreement implies.
 *
 * This module PLANS and does not write. Everything it produces is derived from
 * the agreement's own blocks, so the plan can be shown to Godwin for review
 * before anything exists in the database. That separation is deliberate: a
 * wrongly dated project is annoying, but a wrong invoice already in a client's
 * inbox is a phone call and a credibility cost, so the last step before money
 * moves stays a human one.
 *
 * Everything here derives from the agreement rather than being re-entered:
 *   - the project's budget is the contract total
 *   - tasks are the delivery phases, with dates spread across their durations
 *   - invoices are the payment stages the client actually chose
 * Nothing is retyped, so nothing can disagree.
 */
import type { BlockDocument, PaymentSchedule, ScheduleStage } from "./blocks";
import { parseMoney, fmtKes } from "./blocks";

export interface PlannedTask {
  title: string;
  description: string;
  /** Days from the project start on which this task is due. */
  dueOffsetDays: number;
  /** True when completing this task releases a payment stage. */
  isPaymentMilestone: boolean;
  /** Index into the schedule, when this task gates a stage. */
  stageIndex?: number;
}

export interface PlannedInvoice {
  stage: number;
  stageTotal: number;
  label: string;
  amount: number;
  trigger: ScheduleStage["trigger"];
  /** Issued now, or held as a draft until the trigger fires. */
  issueNow: boolean;
  dueOffsetDays: number;
  /** Which planned task releases it, by index into PlannedTask[]. */
  gatedByTaskIndex?: number;
}

export interface KickoffPlan {
  project: {
    name: string;
    budget: number;
    startDate: string;
    endDate: string | null;
    notes: string;
  };
  tasks: PlannedTask[];
  invoices: PlannedInvoice[];
  schedule: PaymentSchedule;
  warnings: string[];
}

/**
 * Reads a duration like "Weeks 2 to 5", "Week 1", "6 to 8 weeks" into a span of
 * days from the project start.
 *
 * Real proposals write durations for humans, not parsers, so this is
 * best-effort by design and anything it cannot read becomes a warning rather
 * than a silently wrong date. A task with no date is obviously incomplete on
 * the board; a task with a confidently wrong date is not.
 */
export function parsePhaseSpan(text: string): { startDay: number; endDay: number } | null {
  const t = text.toLowerCase();
  const weeks = [...t.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (weeks.length === 0) return null;

  const isWeeks = /week/.test(t);
  const unit = isWeeks ? 7 : 1;

  if (weeks.length === 1) {
    // "Week 1" is the first week: days 0 to 7.
    const end = weeks[0] * unit;
    return { startDay: Math.max(0, end - unit), endDay: end };
  }
  const [a, b] = weeks;
  return { startDay: Math.max(0, (a - 1) * unit), endDay: b * unit };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Delivery phases, in order, from whichever block carries them. */
function phasesOf(doc: BlockDocument): { name: string; duration: string; items: string[] }[] {
  const out: { name: string; duration: string; items: string[] }[] = [];
  for (const section of doc.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind === "phases") out.push(...block.phases);
    }
  }
  if (out.length > 0) return out;

  // No explicit phases: fall back to the timeline, which carries the same shape
  // in schedule form.
  for (const section of doc.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind === "timeline") {
        out.push(...block.rows.map((r) => ({ name: r.title, duration: r.week, items: [r.desc] })));
      }
    }
  }
  return out;
}

/** The contract total: the fees section's own total, which derivation already
 * computed and validated, rather than re-summing rows here. */
function contractTotal(doc: BlockDocument): number {
  for (const section of doc.sections) {
    if (section.id !== "fees") continue;
    for (const block of section.blocks) {
      if (block.id === "fees-schedule" && "total" in block) {
        return parseMoney((block.total as { amount: string }).amount)?.min ?? 0;
      }
    }
  }
  // An agreement not produced by deriveAgreement: sum the investment tables.
  let sum = 0;
  for (const section of doc.sections) {
    if (section.hidden || section.indicative) continue;
    for (const block of section.blocks) {
      if (block.kind === "investment_table" || block.kind === "phased_investment_table") {
        for (const row of block.rows as { amount: string }[]) sum += parseMoney(row.amount)?.min ?? 0;
      }
    }
  }
  return sum;
}

export interface PlanOptions {
  /** Normally the signing date: work starts when the contract does. */
  startDate?: string;
  clientLabel: string;
}

export function planKickoff(agreement: BlockDocument, opts: PlanOptions): KickoffPlan {
  const warnings: string[] = [];
  const startDate = (opts.startDate ?? new Date().toISOString()).slice(0, 10);
  const schedule = agreement.schedule ?? { mode: "standard", stages: [
    { label: "Deposit", percent: 60, trigger: "on_signature" },
    { label: "On completion", percent: 40, trigger: "on_completion" },
  ] as ScheduleStage[] };

  const total = contractTotal(agreement);
  if (total <= 0) warnings.push("No contract total could be read from this agreement, so the invoices would be zero.");

  // ── Tasks ────────────────────────────────────────────────────────────────
  const phases = phasesOf(agreement);
  if (phases.length === 0) warnings.push("No delivery phases found, so no tasks will be created.");

  const tasks: PlannedTask[] = [];
  let lastEndDay = 0;

  phases.forEach((phase, i) => {
    const span = parsePhaseSpan(phase.duration);
    if (!span) warnings.push(`Could not read a date range from "${phase.duration}" (${phase.name}), so its task has no due date.`);
    const endDay = span?.endDay ?? 0;
    lastEndDay = Math.max(lastEndDay, endDay);

    tasks.push({
      title: phase.name,
      description: phase.items.join("\n"),
      dueOffsetDays: endDay,
      // Marked below, once the schedule says which phases gate a payment.
      isPaymentMilestone: false,
      stageIndex: i,
    });
  });

  // ── Invoices ─────────────────────────────────────────────────────────────
  // Stage amounts are rounded to the shilling with the last stage taking the
  // remainder, matching the agreement's own milestone table exactly. If these
  // two ever disagreed, the client would be looking at one number in the
  // contract and a different one on the invoice.
  let allocated = 0;
  const invoices: PlannedInvoice[] = schedule.stages.map((stage, i) => {
    const isLast = i === schedule.stages.length - 1;
    const amount = isLast ? total - allocated : Math.round((total * stage.percent) / 100);
    allocated += amount;

    let gatedByTaskIndex: number | undefined;
    let dueOffsetDays = 0;

    if (stage.trigger === "on_signature") {
      dueOffsetDays = 3;
    } else if (stage.trigger === "on_completion") {
      dueOffsetDays = lastEndDay;
    } else if (stage.trigger === "on_milestone") {
      const idx = stage.milestone_index ?? Math.floor(tasks.length / 2);
      gatedByTaskIndex = Math.min(idx, Math.max(0, tasks.length - 1));
      dueOffsetDays = tasks[gatedByTaskIndex]?.dueOffsetDays ?? 0;
      if (tasks[gatedByTaskIndex]) tasks[gatedByTaskIndex].isPaymentMilestone = true;
    } else if (stage.trigger === "on_date") {
      dueOffsetDays = stage.due_date
        ? Math.max(0, Math.round((new Date(stage.due_date).getTime() - new Date(startDate).getTime()) / 86_400_000))
        : lastEndDay;
    }

    return {
      stage: i + 1,
      stageTotal: schedule.stages.length,
      label: stage.label,
      amount,
      trigger: stage.trigger,
      // Only the signature stage is billed immediately. Everything else waits
      // for the thing it is contingent on, because invoicing for work not yet
      // done is how a client stops trusting the invoices.
      issueNow: stage.trigger === "on_signature",
      dueOffsetDays,
      gatedByTaskIndex,
    };
  });

  const sum = invoices.reduce((n, inv) => n + inv.amount, 0);
  if (sum !== total) warnings.push(`Invoice amounts total ${fmtKes(sum)} but the contract is ${fmtKes(total)}.`);

  return {
    project: {
      name: agreement.meta.title.replace(/^Services Agreement:\s*/i, "").trim() || opts.clientLabel,
      budget: total,
      startDate,
      endDate: lastEndDay > 0 ? addDays(startDate, lastEndDay) : null,
      notes:
        `Created from ${agreement.meta.reference_code}, signed ${startDate}. ` +
        `Payment: ${schedule.stages.map((s) => `${s.percent}%`).join(" / ")}.`,
    },
    tasks,
    invoices,
    schedule,
    warnings,
  };
}

/** Resolves the plan's day offsets into real dates for display or insertion. */
export function planDates(plan: KickoffPlan): {
  tasks: (PlannedTask & { dueDate: string | null })[];
  invoices: (PlannedInvoice & { dueDate: string })[];
} {
  return {
    tasks: plan.tasks.map((t) => ({
      ...t,
      dueDate: t.dueOffsetDays > 0 ? addDays(plan.project.startDate, t.dueOffsetDays) : null,
    })),
    invoices: plan.invoices.map((i) => ({
      ...i,
      dueDate: addDays(plan.project.startDate, i.dueOffsetDays),
    })),
  };
}
