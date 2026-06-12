import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  due_date: z.string().date().optional(),
  assigned_to: z.string().uuid().nullable().optional(), // team_members.id or null (Godwin)
});

const PatchTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  due_date: z.string().date().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

// GET — all tasks for this project with assignee names
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("tasks")
    .select("*, team_members(id, name, role)")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("board_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST — create a task on this project
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  // Verify project exists
  const { data: project } = await supabase.from("projects").select("id, name").eq("id", id).single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const result = CreateTaskSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: id,
      title: result.data.title,
      description: result.data.description,
      priority: result.data.priority,
      due_date: result.data.due_date,
      assigned_to: result.data.assigned_to ?? null,
      status: "todo",
      category: "general",
      board_order: 0,
    })
    .select("*, team_members(id, name, role)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const assigneeName = result.data.assigned_to
    ? ((task.team_members as { name?: string } | null)?.name ?? "team member")
    : "unassigned";

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created_task",
    entity_type: "task",
    entity_id: task.id,
    entity_label: task.title,
    notes: `Project: ${project.name} · Assigned to: ${assigneeName}`,
  });

  return NextResponse.json({ data: task }, { status: 201 });
}

// PATCH — update a task (by ?id=)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  if (!taskId) return NextResponse.json({ error: "Missing task_id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const result = PatchTaskSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updates: Record<string, unknown> = { ...result.data };
  if (result.data.status === "done") updates.completed_at = new Date().toISOString();

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("task_id" in updates ? "id" : "id", taskId)
    .eq("project_id", (await params).id)
    .select("*, team_members(id, name, role)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: task });
}

// DELETE — remove a task (by ?task_id=)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  if (!taskId) return NextResponse.json({ error: "Missing task_id" }, { status: 400 });

  const { id } = await params;
  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("calendar_events").delete().eq("entity_type", "task").eq("entity_id", taskId);
  return NextResponse.json({ success: true });
}
