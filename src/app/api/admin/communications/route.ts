import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { transporter, SENDERS } from "@/lib/mail";

const CommSchema = z.object({
  client_id: z.string().uuid().optional(),
  type: z.enum(["email", "whatsapp", "call", "meeting"]),
  subject: z.string().max(200).trim().optional(),
  body: z.string().max(5000).trim().optional(),
  direction: z.enum(["out", "in"]).default("out"),
  sent_at: z.string().datetime().optional(),
  status: z.string().max(50).trim().default("sent"),
  send_email: z.boolean().optional().default(false),
  to_email: z.string().email().max(200).trim().optional().or(z.literal("")),
  to_name: z.string().max(200).trim().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const client_id = searchParams.get("client_id");

  let query = supabase
    .from("communications")
    .select("*, clients(id, name, company)")
    .is("deleted_at", null)
    .order("sent_at", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);
  if (client_id) query = query.eq("client_id", client_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const supabase = createAdminClient();

  const actor = user ?? (process.env.NODE_ENV !== "production"
    ? { id: "local-dev", email: "local-dev@brightex.local" }
    : null);

  if (!actor) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = CommSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  let recipientEmail = result.data.to_email?.trim() || null;
  let recipientName = result.data.to_name?.trim();
  let persistedClientId: string | null = null;

  if (result.data.client_id) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, email")
      .eq("id", result.data.client_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!clientError && client?.id) {
      persistedClientId = client.id;
      if (!recipientEmail && client.email) {
        recipientEmail = client.email;
      }
      if (!recipientName && client.name) {
        recipientName = client.name;
      }
    }
  }

  if (result.data.type === "email" && result.data.send_email && recipientEmail) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <p><strong>Subject:</strong> ${result.data.subject ?? "No subject"}</p>
          <div style="margin-top: 12px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
            ${String(result.data.body ?? "").replace(/\n/g, "<br />")}
          </div>
          <p style="margin-top: 16px; color: #64748b;">Sent from the Brightex admin dashboard.</p>
        </div>
      `;

      await transporter.sendMail({
        from: SENDERS.info,
        to: recipientEmail,
        subject: result.data.subject ?? "Message from Brightex",
        html,
        text: result.data.body ?? "",
      });
    } catch (mailError) {
      console.error("[communications-send-mail]", mailError);
      return NextResponse.json({ error: "Email delivery failed" }, { status: 500 });
    }
  }

  const { send_email: _sendEmail, to_email: _toEmail, to_name: _toName, ...persistedData } = result.data;

  const { data, error } = await supabase
    .from("communications")
    .insert({
      ...persistedData,
      client_id: persistedClientId,
      sent_at: result.data.sent_at ?? new Date().toISOString(),
      status: result.data.status || (result.data.send_email ? "sent" : "logged"),
      body: result.data.body ?? null,
      subject: result.data.subject ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (result.data.client_id) {
    await supabase.from("clients").update({ last_contacted_at: new Date().toISOString() }).eq("id", result.data.client_id);
  }

  await logAction({
    actor_id: actor.id,
    actor_name: actor.email ?? actor.id,
    action: "logged_comm",
    entity_type: "communication",
    entity_id: data.id,
    entity_label: result.data.subject ?? result.data.type,
    notes: `Type: ${result.data.type} · ${result.data.direction}bound${result.data.send_email ? " · email sent" : ""}`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
