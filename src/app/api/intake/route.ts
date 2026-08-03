import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendNewClientIntakeAck, sendExistingClientIntakeAck } from "@/lib/intake-mail";
import { sendAdminPush } from "@/lib/push";
import {
  IntakeSubmissionSchema, buildIntakeRow, insertIntake, summariseSubmission,
} from "@/lib/intake-submission";
import { resolveCc, normaliseEmail } from "@/lib/cc-recipients";

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

  const { error } = await insertIntake(supabase, buildIntakeRow(data, clientId));
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
    .then((cc) =>
      ackFn({
        to: data.submitter_email,
        cc,
        name: data.submitter_name,
        serviceType: data.service_type,
        serviceTypes: data.service_types,
        projectTitle: data.project_title,
        description: data.description,
      })
    )
    .catch((err) => console.error("[intake/POST generic] ack email:", err));

  sendAdminPush({
    title: "New intake submission",
    body: `${summariseSubmission(data)}${isNewClient ? " (new client)" : ""}`,
    url: "/admin/clients",
    tag: "new-intake",
  }).catch((err) => console.error("[intake/POST generic] push:", err));

  return NextResponse.json({ success: true }, { status: 201 });
}
