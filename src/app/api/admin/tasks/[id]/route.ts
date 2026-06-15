import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { transporter, ADMIN_EMAIL } from "@/lib/mail";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().nullable().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  due_date: z.string().date().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  category: z.string().max(80).trim().optional(),
  board_order: z.number().int().optional(),
  notes: z.string().max(2000).trim().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { id } = await params;

  // Fetch current task state for automation logic
  const { data: current } = await supabase
    .from("tasks")
    .select("*, projects(id, name, status, auto_complete_on_tasks, client_comms_enabled, comm_trigger, clients(id, name, email))")
    .eq("id", id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const result = PatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...result.data };
  const prevStatus = current.status as string;
  const newStatus = result.data.status;

  // Mark completed_at when moving to done
  if (newStatus === "done" && prevStatus !== "done") {
    updates.completed_at = new Date().toISOString();
    // Admin moving from review → done counts as approval
    if (prevStatus === "review") {
      updates.approved_by = user.id;
      updates.approved_at = new Date().toISOString();
    }
  }
  // Clear completed_at if moving back from done
  if (prevStatus === "done" && newStatus && newStatus !== "done") {
    updates.completed_at = null;
    updates.approved_by = null;
    updates.approved_at = null;
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*, team_members(id, name, role), projects(id, name, status, auto_complete_on_tasks, client_comms_enabled, comm_trigger, clients(id, name, email))")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Calendar sync ────────────────────────────────────────────────────────────
  const dueDateChanged = "due_date" in result.data;
  if (dueDateChanged) {
    const newDue = result.data.due_date ?? null;
    if (newDue) {
      // Upsert: update existing event or insert if none
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("entity_type", "task")
        .eq("entity_id", id)
        .eq("type", "task_deadline")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("calendar_events")
          .update({ start_at: new Date(newDue).toISOString(), title: task.title })
          .eq("id", existing.id);
      } else {
        await supabase.from("calendar_events").insert({
          title: task.title,
          type: "task_deadline",
          start_at: new Date(newDue).toISOString(),
          all_day: true,
          entity_type: "task",
          entity_id: id,
        });
      }
    } else {
      // due_date cleared — remove the event
      await supabase
        .from("calendar_events")
        .delete()
        .eq("entity_type", "task")
        .eq("entity_id", id);
    }
  }

  // ── Automation ──────────────────────────────────────────────────────────────

  if (newStatus === "done" && prevStatus !== "done") {
    const project = task.projects as {
      id: string; name: string; status: string;
      auto_complete_on_tasks: boolean; client_comms_enabled: boolean; comm_trigger: string;
      clients: { id: string; name: string; email: string } | null;
    } | null;

    if (project) {
      // 1. Auto-complete project if all its tasks are done
      if (project.auto_complete_on_tasks && project.status !== "completed") {
        const { data: remaining } = await supabase
          .from("tasks")
          .select("id")
          .eq("project_id", project.id)
          .neq("status", "done")
          .is("deleted_at", null);

        if (!remaining || remaining.length === 0) {
          await supabase
            .from("projects")
            .update({ status: "completed" })
            .eq("id", project.id);

          await logAction({
            actor_id: user.id,
            actor_name: user.email ?? user.id,
            action: "updated",
            entity_type: "project",
            entity_id: project.id,
            entity_label: project.name,
            notes: "Auto-completed: all tasks marked done",
            changes: { status: { from: project.status, to: "completed" } },
          });
        }
      }

      // 2. Send client progress comms
      const shouldSend =
        project.client_comms_enabled &&
        project.clients?.email &&
        (
          project.comm_trigger === "on_completion" ||
          (project.comm_trigger === "on_approval" && prevStatus === "review")
        );

      if (shouldSend && project.clients) {
        const clientEmail = project.clients.email;
        const clientName = project.clients.name;
        const taskTitle = task.title;
        const taskDesc = task.description as string | null;
        const triggerLabel = project.comm_trigger === "on_approval" ? "reviewed and approved" : "completed";

        await transporter.sendMail({
          from: `"Brightex Solutions" <${ADMIN_EMAIL}>`,
          to: clientEmail,
          subject: `Project Update — ${project.name}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
              <div style="background:#152238;padding:24px 32px;border-radius:8px 8px 0 0">
                <h2 style="color:#f9a825;margin:0;font-size:20px">Project Progress Update</h2>
                <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:14px">${project.name}</p>
              </div>
              <div style="background:#f8fafc;padding:28px 32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
                <p style="margin:0 0 16px">Dear ${clientName},</p>
                <p style="margin:0 0 20px">We wanted to update you on the progress of your project.</p>
                <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:6px;padding:14px 18px;margin-bottom:20px">
                  <div style="font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">✅ ${triggerLabel.charAt(0).toUpperCase() + triggerLabel.slice(1)}</div>
                  <div style="font-size:15px;font-weight:600;color:#064e3b">${taskTitle}</div>
                  ${taskDesc ? `<div style="font-size:13px;color:#047857;margin-top:6px">${taskDesc}</div>` : ""}
                </div>
                <p style="font-size:13px;color:#64748b;margin:0">We'll continue to keep you updated as we make further progress. Feel free to reach out if you have any questions.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
                <p style="font-size:12px;color:#94a3b8;margin:0">Brightex Solutions · info.brightexsolutions@gmail.com · +254 741 980 127</p>
              </div>
            </div>
          `,
        }).catch((e) => console.error("Comms email failed:", e));

        // Log the communication
        await supabase.from("communications").insert({
          client_id: project.clients.id,
          type: "email",
          subject: `Project Update — ${project.name}`,
          body: `Auto-sent: task "${taskTitle}" was ${triggerLabel}`,
          direction: "out",
          status: "sent",
        });
      }
    }
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "updated_task_status",
    entity_type: "task",
    entity_id: task.id,
    entity_label: task.title,
    notes: newStatus ? `Status: ${prevStatus} → ${newStatus}` : "Task updated",
  });

  return NextResponse.json({ data: task });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { id } = await params;

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove associated calendar events
  await supabase.from("calendar_events").delete().eq("entity_type", "task").eq("entity_id", id);

  return NextResponse.json({ success: true });
}
