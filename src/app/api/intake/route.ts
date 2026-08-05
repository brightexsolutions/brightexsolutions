import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendNewClientIntakeAck, sendExistingClientIntakeAck } from "@/lib/intake-mail";
import { sendIntakeRecap } from "@/lib/intake-recap";
import { sendAdminPush } from "@/lib/push";
import {
  IntakeSubmissionSchema, buildIntakeRow, insertIntake, summariseSubmission, MAX_INTAKE_EDITS,
} from "@/lib/intake-submission";
import { resolveCc, normaliseEmail } from "@/lib/cc-recipients";
import { SITE_URL } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

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

  const data = result.data;
  const supabase = createAdminClient();

  // Find or create the client by email
  let clientId: string | null = null;
  let isNewClient = false;

  const { data: existing } = await supabase
    .from("clients")
    .select("id, phone, company")
    .eq("email", data.submitter_email)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
    // Fill gaps on the existing record without overwriting known values.
    const updates: Record<string, string> = {};
    if (data.submitter_phone && !existing.phone) updates.phone = data.submitter_phone;
    if (data.submitter_company && !existing.company) updates.company = data.submitter_company;
    if (Object.keys(updates).length > 0) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }
  } else {
    isNewClient = true;
    const { data: created, error: createErr } = await supabase
      .from("clients")
      .insert({
        name: data.submitter_name,
        email: data.submitter_email,
        company: data.submitter_company ?? null,
        phone: data.submitter_phone ?? null,
        classification: "lead",
        source: "contact_form",
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.error("[intake/POST generic] create client:", createErr);
      return NextResponse.json({ error: "Failed to create client record" }, { status: 500 });
    }
    clientId = created.id;
  }

  const { error, editToken } = await insertIntake(supabase, buildIntakeRow(data, clientId));
  if (error) {
    console.error("[intake/POST generic]", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  // Anyone the client asked us to copy becomes a real contact on the record,
  // so future project correspondence reaches them without being re-entered.
  if (data.contact_consent !== false && data.cc_emails?.length && clientId) {
    await supabase
      .from("client_contacts")
      .upsert(
        data.cc_emails.map((email) => ({
          client_id: clientId,
          name: email.split("@")[0],
          // Lowercased to match the (client_id, email) unique constraint that
          // this upsert's conflict target relies on. See migration 035.
          email: normaliseEmail(email),
          role: "Added from intake form",
          cc_scopes: ["intake", "projects", "documents"],
        })),
        { onConflict: "client_id,email", ignoreDuplicates: true }
      )
      // Missing table means migration 033 has not run: the CC list is still
      // stored on the intake row itself, so nothing is lost.
      .then(({ error: ccError }) => {
        if (ccError) console.error("[intake/POST generic] cc contacts:", ccError.message);
      });
  }

  // Fire and forget: acknowledgement email plus admin push.
  const ackFn = isNewClient ? sendNewClientIntakeAck : sendExistingClientIntakeAck;
  resolveCc({
    clientId,
    scope: "intake",
    extra: data.contact_consent === false ? [] : (data.cc_emails ?? []),
    to: data.submitter_email,
  })
    .then(async (cc) => {
      await ackFn({
        to: data.submitter_email,
        cc,
        name: data.submitter_name,
        serviceType: data.service_type,
        serviceTypes: data.service_types,
        projectTitle: data.project_title,
        description: data.description,
        editUrl: editToken ? `/intake/edit/${editToken}` : null,
        editsAllowed: MAX_INTAKE_EDITS,
      });

      // Then the full recap of what they actually submitted. Two emails, in
      // this order, on purpose: the acknowledgement is the reassurance and the
      // recap is the record, and a client wants the reassurance first. The
      // recap is also the thing they forward to whoever signs.
      await sendIntakeRecap(
        { ...data, submitted_at: new Date().toISOString() },
        {
          to: data.submitter_email,
          cc,
          editUrl: editToken ? `${SITE_URL}/intake/edit/${editToken}` : null,
          editsRemaining: MAX_INTAKE_EDITS,
        }
      );
    })
    .catch((err) => console.error("[intake/POST generic] ack email:", err));

  sendAdminPush({
    title: "New intake submission",
    body: `${summariseSubmission(data)}${isNewClient ? " (new client)" : ""}`,
    url: "/admin/clients",
    tag: "new-intake",
  }).catch((err) => console.error("[intake/POST generic] push:", err));

  // The edit link lets the client correct their own submission rather than
  // emailing a change for someone to retype.
  return NextResponse.json(
    {
      success: true,
      editUrl: editToken ? `/intake/edit/${editToken}` : null,
      editsRemaining: MAX_INTAKE_EDITS,
    },
    { status: 201 }
  );
}
