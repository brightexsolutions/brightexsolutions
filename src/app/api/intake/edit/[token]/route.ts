/**
 * Client-side editing of an already-submitted intake.
 *
 * GET  loads the submission back for the wizard to prefill.
 * PUT  applies a revision, up to MAX_INTAKE_EDITS times.
 *
 * The edit token is per intake rather than per client, so a client holding
 * several submissions can only revise the one they were given a link to. The
 * budget is enforced here, never in the browser, because the only thing
 * stopping a determined revision loop is the server's own count.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendAdminPush } from "@/lib/push";
import {
  IntakeSubmissionSchema, buildIntakeRow, stripV2Columns,
  intakeRowToFormState, diffIntake, snapshotOf, intakeEditLock, MAX_INTAKE_EDITS,
} from "@/lib/intake-submission";
import { SERVICE_LABELS } from "@/lib/intake-schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

async function loadIntake(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("edit_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? null;
}

export async function GET(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const intake = await loadIntake(token);
  if (!intake) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const editCount = Number(intake.edit_count ?? 0);
  const lock = intakeEditLock(intake);

  return NextResponse.json({
    state: intakeRowToFormState(intake),
    editsUsed: editCount,
    editsRemaining: lock.locked ? 0 : Math.max(0, MAX_INTAKE_EDITS - editCount),
    maxEdits: MAX_INTAKE_EDITS,
    locked: lock.locked,
    lockReason: lock.reason,
    lockMessage: lock.message,
    submittedAt: intake.submitted_at,
    lastEditedAt: intake.last_edited_at,
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const intake = await loadIntake(token);
  if (!intake) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const editCount = Number(intake.edit_count ?? 0);

  // The only thing standing between a reviewed intake and a client still
  // holding the link is this check. The browser is told the same thing, but a
  // page loaded before we marked it reviewed would otherwise still submit.
  const lock = intakeEditLock(intake);
  if (lock.locked) {
    return NextResponse.json(
      { error: lock.message, locked: true, lockReason: lock.reason, editsRemaining: 0 },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = IntakeSubmissionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Rebuild the row, then drop everything a client must not control. status,
  // review state and AI analysis belong to us, and an edit must never reset
  // them just because the payload has no opinion about them.
  const { client_id: _clientId, status: _status, completed_steps: _steps, ...editable } =
    buildIntakeRow(result.data, intake.client_id);

  const changed = diffIntake(intake, editable);
  if (changed.length === 0) {
    return NextResponse.json({
      success: true,
      unchanged: true,
      editsRemaining: MAX_INTAKE_EDITS - editCount,
    });
  }

  const now = new Date().toISOString();

  const revisions = Array.isArray(intake.revisions) ? intake.revisions : [];
  const update: Record<string, unknown> = {
    ...editable,
    edit_count: editCount + 1,
    last_edited_at: now,
    // Keep what it looked like before, so a revision can be compared against
    // whatever version we actually quoted from.
    revisions: [
      ...revisions,
      { edited_at: now, changed_fields: changed.map((c) => c.field), snapshot: snapshotOf(intake) },
    ],
    // Keyed on reviewed_at rather than current status, because the lock means
    // the only way to reach this line on a read intake is that we deliberately
    // set it back to "new" to let the client change something. That is exactly
    // the case worth flagging: we have already read it, and possibly quoted it.
    edited_after_review: intake.edited_after_review || !!intake.reviewed_at,
  };

  let { error } = await supabase
    .from("client_intakes")
    .update(update)
    .eq("edit_token", token);

  // Edit-tracking columns need migration 037. Rather than reject the client's
  // correction, fall back to applying the content and losing only the counter.
  if (error && /column|schema cache/i.test(error.message)) {
    ({ error } = await supabase
      .from("client_intakes")
      .update(stripV2Columns(editable))
      .eq("edit_token", token));
  }

  if (error) {
    console.error("[intake/edit PUT]", error);
    return NextResponse.json({ error: "Could not save your changes" }, { status: 500 });
  }

  const remaining = Math.max(0, MAX_INTAKE_EDITS - (editCount + 1));
  const serviceLabel = SERVICE_LABELS[result.data.service_type] ?? result.data.service_type;
  const changedLabels = changed.map((c) => c.label).join(", ");

  // An edit on a previously-read intake is the case that actually needs
  // attention, because a quote may already have been built from the previous
  // version. Say so explicitly rather than sending a generic ping.
  const wasReviewed = !!intake.reviewed_at;

  sendAdminPush({
    title: wasReviewed ? "Intake changed after review" : "Client updated their intake",
    body: `${result.data.submitter_name} (${serviceLabel}) changed: ${changedLabels}`,
    url: "/admin/clients",
    tag: `intake-edited-${intake.id}`,
  }).catch((err) => console.error("[intake/edit PUT] push:", err));

  if (intake.client_id) {
    await supabase.from("communications").insert({
      client_id: intake.client_id,
      type: "email",
      subject: wasReviewed
        ? "Client revised their requirements after review"
        : "Client revised their requirements",
      body: `Updated ${changed.length} field(s): ${changedLabels}. Edit ${editCount + 1} of ${MAX_INTAKE_EDITS}.`,
      direction: "in",
      status: "logged",
    });
  }

  return NextResponse.json({ success: true, editsRemaining: remaining, changed: changed.length });
}
