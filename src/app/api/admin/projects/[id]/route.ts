import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

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
