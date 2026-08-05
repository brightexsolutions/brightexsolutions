/**
 * POST /api/admin/intakes/[id]/recap
 *
 * Sends the client their own submission back, in full.
 *
 * This goes out automatically when a form is submitted, so this route is for
 * the cases where that is not enough: the client says they never received it,
 * the person who filled the form is not the person who signs, or a new contact
 * has joined and needs the same picture as everyone else. Resending is cheap
 * and the alternative is retyping the submission into an email by hand.
 *
 * Recipients follow the same CC routing as every other client email rather than
 * being typed out here, so whoever is set to receive onboarding correspondence
 * gets it without anyone having to remember they exist. An extra address can be
 * added for the one-off case.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { resolveCc } from "@/lib/cc-recipients";
import { sendIntakeRecap } from "@/lib/intake-recap";
import { MAX_INTAKE_EDITS } from "@/lib/intake-submission";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const RecapSchema = z.object({
  /** Extra one-off recipients, on top of the client's usual CC routing. */
  extraCc: z.array(z.string().email()).max(5).optional().default([]),
  /** Send to someone other than the submitter, e.g. a director who needs to
   * see it before signing. The submitter is still copied. */
  to: z.string().email().optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const parsed = RecapSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: intake, error } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !intake) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (!intake.submitter_email) {
    return NextResponse.json({ error: "This submission has no email address on it." }, { status: 400 });
  }

  const to = parsed.data.to ?? intake.submitter_email;

  // When sending to someone else, the person who filled the form is copied:
  // they should know their answers were forwarded.
  const extra = [
    ...parsed.data.extraCc,
    ...(parsed.data.to && parsed.data.to !== intake.submitter_email ? [intake.submitter_email] : []),
    ...(intake.cc_emails ?? []),
  ];

  const cc = await resolveCc({
    clientId: intake.client_id,
    scope: "intake",
    extra,
    to,
  });

  // Edits only remain open while the submission is still unreviewed. Offering
  // the link after that would send them to a closed form.
  const editsUsed = intake.edit_count ?? 0;
  const editsRemaining = intake.reviewed_at ? 0 : Math.max(0, MAX_INTAKE_EDITS - editsUsed);

  try {
    await sendIntakeRecap(intake, {
      to,
      cc,
      editUrl: intake.edit_token && editsRemaining > 0
        ? `${SITE_URL}/intake/edit/${intake.edit_token}`
        : null,
      editsRemaining,
    });
  } catch (err) {
    console.error("[intake-recap]", err);
    return NextResponse.json({ error: "The email could not be sent. Try again shortly." }, { status: 502 });
  }

  if (intake.client_id) {
    await supabase.from("communications").insert({
      client_id: intake.client_id,
      type: "email",
      subject: `Submission recap sent: ${intake.project_title ?? intake.service_type}`,
      body:
        `Full submission recap sent to ${to}` +
        (cc.length ? `, copied to ${cc.join(", ")}` : "") + ".",
      direction: "out",
      status: "sent",
      cc_emails: cc,
    });
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "sent_intake_recap",
    entity_type: "client_intake",
    entity_id: intake.id,
    entity_label: intake.project_title ?? intake.service_type,
    notes: `Sent to ${to}${cc.length ? `, copied to ${cc.join(", ")}` : ""}.`,
  });

  return NextResponse.json({ ok: true, to, cc });
}
