import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendExistingClientIntakeAck } from "@/lib/intake-mail";
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
});

async function getClient(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, email")
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

  const result = PostSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const data = result.data;
  const supabase = createAdminClient();

  const { error } = await supabase.from("client_intakes").insert({
    client_id: client.id,
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
    console.error("[intake/POST]", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  // Fire-and-forget: ack email + admin push notification
  if (data.submitter_email) {
    sendExistingClientIntakeAck({
      to: data.submitter_email,
      name: data.submitter_name,
      serviceType: data.service_type,
      projectTitle: data.project_title,
      description: data.description,
    }).catch((err) => console.error("[intake/POST] ack email:", err));
  }

  sendAdminPush({
    title: "New intake submission",
    body: `${data.submitter_name} submitted a ${data.service_type} requirement${data.project_title ? `: ${data.project_title}` : ""}`,
    url: "/admin/clients",
    tag: "new-intake",
  }).catch((err) => console.error("[intake/POST] push:", err));

  return NextResponse.json({ success: true }, { status: 201 });
}
