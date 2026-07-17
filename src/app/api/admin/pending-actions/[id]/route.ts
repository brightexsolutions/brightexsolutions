import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { transporter, SENDERS } from "@/lib/mail";
import { emailTemplate, emailBodyFromPlainText } from "@/lib/email-templates";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  action: z.enum(["approve", "dismiss"]),
  subject: z.string().max(200).trim().optional(),
  body: z.string().max(5000).trim().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = PatchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const supabase = createAdminClient();
  const { data: pending } = await supabase.from("pending_ai_actions").select("*, clients(id, name, email)").eq("id", id).maybeSingle();
  if (!pending) return NextResponse.json({ error: "Pending action not found" }, { status: 404 });
  if (pending.status !== "pending") return NextResponse.json({ error: `Already ${pending.status}` }, { status: 409 });

  if (result.data.action === "dismiss") {
    const { data, error } = await supabase
      .from("pending_ai_actions")
      .update({ status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // ── Approve: send the (possibly edited) draft, exactly like the composer's send path ──
  const client = pending.clients as { id: string; name: string; email: string | null } | null;
  if (!client?.email) return NextResponse.json({ error: "Client has no email on file" }, { status: 400 });

  const subject = result.data.subject ?? pending.draft_subject ?? "Message from Brightex";
  const emailBody = result.data.body ?? pending.draft_body ?? "";

  try {
    const html = emailTemplate({
      title: subject,
      subtitle: client.name,
      preheader: subject,
      body: emailBodyFromPlainText(emailBody),
    });
    await transporter.sendMail({
      from: pending.sender && pending.sender in SENDERS ? SENDERS[pending.sender as keyof typeof SENDERS] : SENDERS.info,
      to: client.email,
      subject,
      html,
      text: emailBody,
    });
  } catch (mailError) {
    console.error("[pending-actions-approve]", mailError);
    return NextResponse.json({ error: "Email delivery failed" }, { status: 500 });
  }

  const { data: commRow } = await supabase
    .from("communications")
    .insert({
      client_id: client.id,
      type: "email",
      subject,
      body: emailBody,
      direction: "out",
      status: "sent",
      sender: pending.sender,
    })
    .select()
    .single();

  await supabase.from("clients").update({ last_contacted_at: new Date().toISOString() }).eq("id", client.id);

  const { data, error } = await supabase
    .from("pending_ai_actions")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "approved_ai_action",
    entity_type: "pending_ai_action",
    entity_id: id,
    entity_label: pending.title,
    notes: `Sent to ${client.email}${commRow ? ` · communication ${commRow.id}` : ""}`,
  });

  return NextResponse.json({ data });
}
