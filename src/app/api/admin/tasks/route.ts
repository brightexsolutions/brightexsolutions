import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const VALID_STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const;

const CreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  status: z.enum(VALID_STATUSES).default("todo"),
  due_date: z.string().date().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  category: z.string().max(80).trim().optional(),
  board_order: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const project_id = searchParams.get("project_id");
  const assigned_to = searchParams.get("assigned_to");
  const standalone = searchParams.get("standalone"); // 'true' = no project

  let q = supabase
    .from("tasks")
    .select("*, team_members(id, name, role), projects(id, name, status, clients(id, name, email))")
    .is("deleted_at", null)
    .order("board_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (project_id) q = q.eq("project_id", project_id);
  if (assigned_to) q = q.eq("assigned_to", assigned_to);
  if (standalone === "true") q = q.is("project_id", null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json().catch(() => ({}));
  const result = CreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: result.data.title,
      description: result.data.description,
      priority: result.data.priority,
      status: result.data.status,
      due_date: result.data.due_date,
      assigned_to: result.data.assigned_to ?? null,
      project_id: result.data.project_id ?? null,
      category: result.data.category ?? "general",
      board_order: result.data.board_order ?? 0,
    })
    .select("*, team_members(id, name, role), projects(id, name, status)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create calendar event for due_date
  if (result.data.due_date) {
    await supabase.from("calendar_events").insert({
      title: result.data.title,
      type: "task_deadline",
      start_at: new Date(result.data.due_date).toISOString(),
      all_day: true,
      entity_type: "task",
      entity_id: task.id as string,
    });
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created_task",
    entity_type: "task",
    entity_id: task.id,
    entity_label: task.title,
    notes: task.project_id
      ? `Linked to project · Assigned to: ${(task.team_members as { name?: string } | null)?.name ?? "unassigned"}`
      : "Standalone task",
  });

  return NextResponse.json({ data: task }, { status: 201 });
}
