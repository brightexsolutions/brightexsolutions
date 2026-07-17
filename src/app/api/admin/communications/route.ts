import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { transporter, SENDERS } from "@/lib/mail";
import { emailTemplate, emailBodyFromPlainText, emailButton } from "@/lib/email-templates";
import { compressFile, mimeToExt } from "@/lib/compress";
import { SITE_URL } from "@/lib/constants";

const SENDER_KEYS = Object.keys(SENDERS) as [keyof typeof SENDERS, ...(keyof typeof SENDERS)[]];

// Combined attachment budget — comfortably under typical serverless request-body limits.
const MAX_ATTACHMENTS_BYTES = 6 * 1024 * 1024;

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
  sender: z.enum(SENDER_KEYS).optional(),
  attachments: z.array(z.object({
    filename: z.string().max(255).trim(),
    contentType: z.string().max(100).trim(),
    base64: z.string(),
  })).max(5).optional(),
  // Generated proposal/agreement to link in the email — server builds the
  // branded "view online" button (see documents-client.tsx / email-composer.tsx).
  // Deliberately no PDF fallback attachment: a PDF would carry the full
  // document even when the link is gated, defeating the gate entirely.
  documentLink: z.object({ id: z.string().uuid() }).optional(),
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

  function buildQuery(withDocument: boolean) {
    let q = supabase
      .from("communications")
      .select(withDocument ? "*, clients(id, name, company), generated_documents(id, title, type)" : "*, clients(id, name, company)")
      .is("deleted_at", null)
      .order("sent_at", { ascending: false });
    if (type && type !== "all") q = q.eq("type", type);
    if (client_id) q = q.eq("client_id", client_id);
    return q;
  }

  // document_id / the generated_documents relation need migration
  // 031_document_lifecycle.sql — degrade gracefully if it hasn't run yet.
  let { data, error } = await buildQuery(true);
  if (error) ({ data, error } = await buildQuery(false));
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

  // Shrink image attachments before storing/sending — PDFs/docs pass through
  // unchanged (see compressFile), so this only ever helps, never corrupts.
  const compressedAttachments = await Promise.all(
    (result.data.attachments ?? []).map(async (a) => {
      const rawBuffer = Buffer.from(a.base64, "base64");
      const rawBytes = rawBuffer.buffer.slice(rawBuffer.byteOffset, rawBuffer.byteOffset + rawBuffer.byteLength);
      const { buffer, mimeType } = await compressFile(rawBytes, a.contentType, a.filename);
      const filename = mimeType !== a.contentType
        ? a.filename.replace(/\.[^.]+$/, `.${mimeToExt(mimeType)}`)
        : a.filename;
      return { filename, contentType: mimeType, base64: buffer.toString("base64") };
    })
  );

  // Linked document: a real "view online" button (not a bare link, and no
  // PDF fallback — see the documentLink schema comment above for why).
  let documentButtonHtml = "";
  if (result.data.documentLink) {
    const { data: doc } = await supabase
      .from("generated_documents")
      .select("type, title")
      .eq("id", result.data.documentLink.id)
      .maybeSingle();

    if (doc && doc.type !== "sop") {
      const url = `${SITE_URL}/api/public/documents/${result.data.documentLink.id}`;
      documentButtonHtml = emailButton(`View ${doc.title}`, url);
    }
  }

  if (result.data.type === "email" && result.data.send_email && recipientEmail) {
    const totalAttachmentBytes = compressedAttachments.reduce((sum, a) => sum + Math.ceil((a.base64.length * 3) / 4), 0);
    if (totalAttachmentBytes > MAX_ATTACHMENTS_BYTES) {
      return NextResponse.json({ error: "Attachments too large — max 6MB combined." }, { status: 413 });
    }

    try {
      const subject = result.data.subject ?? "Message from Brightex";
      const html = emailTemplate({
        title: subject,
        subtitle: recipientName,
        preheader: subject,
        body: emailBodyFromPlainText(String(result.data.body ?? "")) + documentButtonHtml,
      });

      await transporter.sendMail({
        from: result.data.sender ? SENDERS[result.data.sender] : SENDERS.info,
        to: recipientEmail,
        subject,
        html,
        text: result.data.body ?? "",
        attachments: compressedAttachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.base64, "base64"),
          contentType: a.contentType,
        })),
      });
    } catch (mailError) {
      console.error("[communications-send-mail]", mailError);
      return NextResponse.json({ error: "Email delivery failed" }, { status: 500 });
    }
  }

  const { send_email: _sendEmail, to_email: _toEmail, to_name: _toName, attachments: _attachments, sender: _sender, documentLink: _documentLink, ...persistedData } = result.data;

  // Never persist attachment bytes — just enough metadata for the activity trail.
  const attachmentMeta = compressedAttachments.map((a) => ({
    filename: a.filename,
    size: Math.ceil((a.base64.length * 3) / 4),
  }));

  const baseRow = {
    ...persistedData,
    client_id: persistedClientId,
    sent_at: result.data.sent_at ?? new Date().toISOString(),
    status: result.data.status || (result.data.send_email ? "sent" : "logged"),
    body: result.data.body ?? null,
    subject: result.data.subject ?? null,
  };
  // sender/attachments need migration 024_communications_composer.sql,
  // document_id needs 031_document_lifecycle.sql — degrade gracefully (log
  // without them) if not yet applied, rather than failing the whole request
  // after the email has already sent.
  const rowWithNewColumns = {
    ...baseRow,
    sender: result.data.sender ?? null,
    attachments: attachmentMeta.length ? attachmentMeta : null,
    document_id: result.data.documentLink?.id ?? null,
  };

  let { data, error } = await supabase.from("communications").insert(rowWithNewColumns).select().single();
  if (error && /column/i.test(error.message)) {
    ({ data, error } = await supabase.from("communications").insert(baseRow).select().single());
  }

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
