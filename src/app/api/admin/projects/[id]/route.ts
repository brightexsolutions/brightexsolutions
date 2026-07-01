import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { transporter, SENDERS } from "@/lib/mail";
import { SITE_NAME, BUSINESS_PHONE, whatsappUrl } from "@/lib/constants";
import {
  emailTemplate,
  emailParagraph,
  emailInfoCard,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const STAGE_INFO: Record<string, { heading: string; detail: string }> = {
  discovery:   { heading: "We're in discovery",       detail: "We're gathering all the details about your project and aligning on goals. Expect to hear from us soon with next steps." },
  design:      { heading: "Design is underway",        detail: "We're crafting the visual direction for your project. We'll share designs for your review once they're ready." },
  development: { heading: "Development has started",   detail: "Hands on keyboards — we're building your project. We'll keep you updated on progress." },
  review:      { heading: "Ready for your review",     detail: "Your project is ready for a first look. We'll be reaching out shortly to walk you through what we've built." },
  live:        { heading: "Your project is live",      detail: "We're proud to announce that your project is now live. Thank you for working with us — here's to its success." },
  paused:      { heading: "Project temporarily paused", detail: "We've paused work on your project for now. We'll be back in touch with a timeline for resuming." },
  completed:   { heading: "Project complete",          detail: "Your project is officially complete. It has been a genuine pleasure working with you." },
};

const UpdateProjectSchema = z.object({
  client_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).trim().optional(),
  type: z.string().max(80).trim().optional(),
  status: z.enum(["discovery", "design", "development", "review", "live", "paused", "completed"]).optional(),
  budget: z.number().min(0).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  is_retainer: z.boolean().optional(),
  retainer_cycle: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  monthly_rate: z.number().min(0).optional(),
  notes: z.string().max(2000).trim().optional(),
  auto_complete_on_tasks: z.boolean().optional(),
  client_comms_enabled: z.boolean().optional(),
  comm_trigger: z.enum(["on_approval", "on_completion"]).optional(),
  portal_enabled: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(id, name, company, email), tasks(*), invoices(*, payments(*)), consultancy_rate_history(id, monthly_rate, effective_from, notes, created_at)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = UpdateProjectSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data: before } = await supabase.from("projects").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("projects").update(result.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changedFields = Object.keys(result.data) as (keyof typeof result.data)[];
  const changes = changedFields.reduce<Record<string, { from: unknown; to: unknown }>>((acc, field) => {
    const prev = before?.[field as keyof typeof before];
    const next = result.data[field];
    if (prev !== next) acc[field] = { from: prev, to: next };
    return acc;
  }, {});

  // ── Calendar sync ────────────────────────────────────────────────────────────

  // 1. Sync deadline event when end_date changes
  if ("end_date" in result.data) {
    const newEnd = result.data.end_date ?? null;
    const { data: existingDeadline } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("entity_type", "project")
      .eq("entity_id", id)
      .eq("type", "project_milestone")
      .ilike("title", "% — deadline")
      .maybeSingle();

    if (newEnd) {
      if (existingDeadline) {
        await supabase.from("calendar_events").update({ start_at: new Date(newEnd).toISOString() }).eq("id", existingDeadline.id);
      } else {
        await supabase.from("calendar_events").insert({
          title: `${data.name} — deadline`,
          type: "project_milestone",
          start_at: new Date(newEnd).toISOString(),
          all_day: true,
          entity_type: "project",
          entity_id: id,
        });
      }
    } else if (existingDeadline) {
      await supabase.from("calendar_events").delete().eq("id", existingDeadline.id);
    }
  }

  // 2. Insert a one-time milestone event when project goes live or completes
  const prevStatus = before?.status as string | undefined;
  const newStatus = result.data.status;
  const milestoneStatuses = ["live", "completed"] as const;
  if (newStatus && milestoneStatuses.includes(newStatus as "live" | "completed") && prevStatus !== newStatus) {
    const label = newStatus === "live" ? "goes live" : "completed";
    await supabase.from("calendar_events").insert({
      title: `${data.name} — ${label}`,
      type: "project_milestone",
      start_at: new Date().toISOString(),
      all_day: true,
      entity_type: "project",
      entity_id: id,
    });
  }

  // ── /Calendar sync ───────────────────────────────────────────────────────────

  // ── Project stage notification ───────────────────────────────────────────────
  if (newStatus && prevStatus !== newStatus && data.client_comms_enabled !== false && data.client_id) {
    const stage = STAGE_INFO[newStatus];
    if (stage) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("name, email")
        .eq("id", data.client_id as string)
        .single();

      if (clientData?.email) {
        const firstName = (clientData.name as string).split(" ")[0];
        const html = emailTemplate({
          title: `Project Update — ${data.name}`,
          subtitle: data.name as string,
          preheader: `${stage.heading} — ${data.name}`,
          heroLabel: `Project Update · ${data.name}`,
          heroTitle: `${stage.heading},\n${firstName}.`,
          body:
            emailParagraph(stage.detail) +
            emailInfoCard("📁", "Project", data.name as string) +
            emailInfoCard("📊", "Current Stage", newStatus.charAt(0).toUpperCase() + newStatus.slice(1)) +
            emailDivider() +
            emailParagraph(
              `Questions or feedback? Reply to this email or reach us on WhatsApp: <a href="${whatsappUrl()}" style="color:#f9a825;font-weight:600">${BUSINESS_PHONE}</a>`
            ) +
            emailSignoff(),
        });

        await transporter.sendMail({
          from: SENDERS.payments,
          to: clientData.email as string,
          subject: `Project Update — ${data.name}: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          html,
        }).catch(() => {});

        await supabase.from("communications").insert({
          client_id: data.client_id as string,
          type: "email",
          subject: `Project stage update sent — ${data.name} → ${newStatus}`,
          direction: "out",
          status: "sent",
        });
      }
    }
  }
  // ── /Project stage notification ──────────────────────────────────────────────

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "updated",
    entity_type: "project",
    entity_id: id,
    entity_label: data.name,
    changes: Object.keys(changes).length ? changes : undefined,
  });

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { data: project } = await supabase.from("projects").select("name").eq("id", id).single();
  const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "deleted",
    entity_type: "project",
    entity_id: id,
    entity_label: project?.name ?? id,
  });

  return NextResponse.json({ success: true });
}
