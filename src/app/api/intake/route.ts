import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendNewClientIntakeAck, sendExistingClientIntakeAck } from "@/lib/intake-mail";
import { sendAdminPush } from "@/lib/push";

const PostSchema = z.object({
  service_type: z.enum(["website", "mobile", "erp", "design", "consultancy", "other"]),
  project_title: z.string().max(200).trim().optional(),
  description: z.string().min(10).max(5000).trim(),
  problem_statement: z.string().max(2000).trim().optional(),
  specifics: z.record(z.string(), z.unknown()).optional(),
  timeline: z.string().max(100).trim().optional(),
  budget_range: z.string().max(100).trim().optional(),
  additional_notes: z.string().max(2000).trim().optional(),
  submitter_name: z.string().min(2).max(100).trim(),
  submitter_email: z.string().email().max(200).trim(),
  submitter_company: z.string().max(200).trim().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = PostSchema.safeParse(body);
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
    .select("id")
    .eq("email", data.submitter_email)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
  } else {
    isNewClient = true;
    const { data: created, error: createErr } = await supabase
      .from("clients")
      .insert({
        name: data.submitter_name,
        email: data.submitter_email,
        company: data.submitter_company ?? null,
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

  const { error } = await supabase.from("client_intakes").insert({
    client_id: clientId,
    service_type: data.service_type,
    project_title: data.project_title ?? null,
    description: data.description,
    problem_statement: data.problem_statement ?? null,
    specifics: data.specifics ?? {},
    timeline: data.timeline ?? null,
    budget_range: data.budget_range ?? null,
    additional_notes: data.additional_notes ?? null,
    submitter_name: data.submitter_name,
    submitter_email: data.submitter_email,
    status: "new",
  });

  if (error) {
    console.error("[intake/POST generic]", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  // Fire-and-forget: ack email + admin push notification
  const ackFn = isNewClient ? sendNewClientIntakeAck : sendExistingClientIntakeAck;
  ackFn({
    to: data.submitter_email,
    name: data.submitter_name,
    serviceType: data.service_type,
    projectTitle: data.project_title,
    description: data.description,
  }).catch((err) => console.error("[intake/POST generic] ack email:", err));

  sendAdminPush({
    title: "New intake submission",
    body: `${data.submitter_name} submitted a ${data.service_type} requirement${data.project_title ? `: ${data.project_title}` : ""}${isNewClient ? " (new client)" : ""}`,
    url: "/admin/clients",
    tag: "new-intake",
  }).catch((err) => console.error("[intake/POST generic] push:", err));

  return NextResponse.json({ success: true }, { status: 201 });
}
