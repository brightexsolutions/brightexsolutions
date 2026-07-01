import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logSystemAction } from "@/lib/audit";
import { transporter } from "@/lib/mail";
import { SITE_NAME, BUSINESS_EMAIL, BUSINESS_WEBSITE } from "@/lib/constants";
import { emailTemplate, emailInfoCard, emailParagraph, emailSignoff } from "@/lib/email-templates";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  body: z.string().max(500).trim().optional(),
  type: z.enum(["info", "offer", "promo", "alert"]).optional(),
  cta_label: z.string().max(80).trim().optional(),
  cta_url: z.union([z.string().url(), z.string().regex(/^\//), z.literal("")]).optional(),
  display_location: z.array(z.enum(["banner", "home_hero", "contact_page"])).optional(),
  active: z.boolean().optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data: before } = await supabase.from("announcements").select("active, title, type, body").eq("id", id).single();

  const { data, error } = await supabase
    .from("announcements")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify internal team when an announcement is first published
  if (result.data.active === true && before?.active === false) {
    const typeLabel = (data.type as string | null)?.toUpperCase() ?? "INFO";
    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      to: BUSINESS_EMAIL,
      subject: `Announcement published: ${data.title}`,
      html: emailTemplate({
        title: "Announcement Published",
        preheader: `A new ${typeLabel} announcement is now live on the website`,
        heroLabel: `Announcement · ${typeLabel}`,
        heroTitle: "New announcement\nis now live.",
        body:
          emailParagraph("The following announcement has just been published on the website.") +
          emailInfoCard("📢", "Title", data.title as string) +
          emailInfoCard("🏷️", "Type", typeLabel) +
          (data.body ? emailParagraph(`<em>${data.body}</em>`) : "") +
          (data.cta_label && data.cta_url
            ? emailInfoCard("🔗", "CTA", `<a href="${data.cta_url}" style="color:#f9a825;font-weight:600">${data.cta_label}</a>`)
            : "") +
          emailInfoCard("🌐", "View on site", `<a href="${BUSINESS_WEBSITE}" style="color:#152238;font-weight:600">${BUSINESS_WEBSITE}</a>`) +
          emailSignoff(),
      }),
    }).catch(() => {});

    await logSystemAction({
      action: "published",
      entity_type: "announcement",
      entity_id: id,
      entity_label: data.title as string,
      notes: `Announcement published — type: ${data.type ?? "info"}`,
    });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("announcements").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
