import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendExistingClientIntakeAck } from "@/lib/intake-mail";
import { sendAdminPush } from "@/lib/push";
import {
  IntakeSubmissionSchema, buildIntakeRow, insertIntake, summariseSubmission,
} from "@/lib/intake-submission";
import { resolveCc } from "@/lib/cc-recipients";

async function getClient(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, email, company, phone")
    .eq("intake_token", token)
    .is("deleted_at", null)
    .single();
  return data ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const client = await getClient(token);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    clientName: client.name,
    clientEmail: client.email ?? "",
    clientCompany: client.company ?? "",
    clientPhone: client.phone ?? "",
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const client = await getClient(token);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const data = result.data;
  const supabase = createAdminClient();

  const { error } = await insertIntake(supabase, buildIntakeRow(data, client.id));
  if (error) {
    console.error("[intake/POST]", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  // Keep the client record current with anything newly supplied. A blank
  // answer never overwrites a value we already hold.
  const clientUpdates: Record<string, string> = {};
  if (data.submitter_phone && !client.phone) clientUpdates.phone = data.submitter_phone;
  if (data.submitter_company && !client.company) clientUpdates.company = data.submitter_company;
  if (Object.keys(clientUpdates).length > 0) {
    await supabase.from("clients").update(clientUpdates).eq("id", client.id);
  }

  // Fire and forget: acknowledgement email plus admin push.
  if (data.submitter_email) {
    resolveCc({
      clientId: client.id,
      scope: "intake",
      extra: data.contact_consent === false ? [] : (data.cc_emails ?? []),
      to: data.submitter_email,
    })
      .then((cc) =>
        sendExistingClientIntakeAck({
          to: data.submitter_email,
          cc,
          name: data.submitter_name,
          serviceType: data.service_type,
          serviceTypes: data.service_types,
          projectTitle: data.project_title,
          description: data.description,
        })
      )
      .catch((err) => console.error("[intake/POST] ack email:", err));
  }

  sendAdminPush({
    title: "New intake submission",
    body: summariseSubmission(data),
    url: "/admin/clients",
    tag: "new-intake",
  }).catch((err) => console.error("[intake/POST] push:", err));

  return NextResponse.json({ success: true }, { status: 201 });
}
