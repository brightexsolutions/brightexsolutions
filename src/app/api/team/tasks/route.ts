import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const PatchSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  deliverable_url: z.string().url().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).trim().optional(),
});

const PostSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  due_date: z.string().date().optional(),
});

// GET — fetch tasks assigned to the current team member
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user }, error: authError } = await (await createClient()).auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  // Resolve team_members.id from user_id
  const { data: member } = await supabase
    .from("team_members")
    .select("id, name, role")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "Team member record not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);

  // ?projects=1 — return unique projects this member has tasks on
  if (searchParams.get("projects") === "1") {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("projects(id, name, status)")
      .eq("assigned_to", member.id);

    const seen = new Set<string>();
    const projects: { id: string; name: string; status: string }[] = [];
    for (const t of tasks ?? []) {
      const raw = t.projects;
      const p = Array.isArray(raw) ? raw[0] : raw;
      if (p && typeof p === "object" && "id" in p && !seen.has(p.id as string)) {
        seen.add(p.id as string);
        projects.push(p as { id: string; name: string; status: string });
      }
    }

    return NextResponse.json({ data: projects, member });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, projects(id, name, status)")
    .eq("assigned_to", member.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: tasks ?? [], member });
}

// POST — create a new task on a project the member is already assigned to
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user }, error: authError } = await (await createClient()).auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "Team member record not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const result = PostSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Verify the member has at least one existing task on this project
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", result.data.project_id)
    .eq("assigned_to", member.id)
    .limit(1)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "You are not assigned to this project" }, { status: 403 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: result.data.project_id,
      title: result.data.title,
      description: result.data.description,
      priority: result.data.priority,
      due_date: result.data.due_date,
      assigned_to: member.id,
      status: "todo",
    })
    .select("*, projects(id, name, status)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created_task",
    entity_type: "task",
    entity_id: task.id,
    entity_label: task.title,
    notes: `Project: ${(task.projects as { name?: string } | null)?.name ?? result.data.project_id}`,
  });

  return NextResponse.json({ data: task }, { status: 201 });
}

// PATCH — update task status or deliverable
export async function PATCH(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user }, error: authError } = await (await createClient()).auth.getUser();
  if (!user || authError) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "Team member record not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing task id" }, { status: 400 });

  // Verify the task is assigned to this member
  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, status")
    .eq("id", id)
    .single();

  if (!task || task.assigned_to !== member.id) {
    return NextResponse.json({ error: "Task not found or not assigned to you" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const result = PatchSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updates: Record<string, unknown> = { ...result.data };
  if (result.data.status === "done" && task.status !== "done") {
    updates.completed_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (result.data.status) {
    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: "updated_task_status",
      entity_type: "task",
      entity_id: id,
      entity_label: updated.title,
      notes: `Status → ${result.data.status}`,
    });
  } else if (result.data.deliverable_url) {
    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: "submitted_deliverable",
      entity_type: "task",
      entity_id: id,
      entity_label: updated.title,
    });
  }

  return NextResponse.json({ data: updated });
}
