import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = await rateLimit(request, "public");
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const supabase = createAdminClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id, name, type, status, start_date, end_date, is_retainer, portal_enabled, portal_token,
      clients(id, name, company),
      tasks(id, title, status, due_date, completed_at)
    `)
    .eq("portal_token", token)
    .is("deleted_at", null)
    .single();

  if (error || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!project.portal_enabled) return NextResponse.json({ error: "This link is not active" }, { status: 403 });

  // Fetch outbound communications for this client
  const { data: comms } = await supabase
    .from("communications")
    .select("id, type, subject, sent_at, created_at")
    .eq("client_id", (project.clients as unknown as { id: string } | null)?.id ?? "")
    .eq("direction", "out")
    .order("sent_at", { ascending: false })
    .limit(20);

  // Strip internal data — only expose what's safe for client view
  const tasks = (project.tasks as Array<{
    id: string;
    title: string;
    status: string;
    due_date?: string | null;
    completed_at?: string | null;
  }> ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    due_date: t.due_date ?? null,
    completed_at: t.completed_at ?? null,
  }));

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      is_retainer: project.is_retainer,
      client_name: (project.clients as { name?: string | null } | null)?.name ?? null,
      client_company: (project.clients as { company?: string | null } | null)?.company ?? null,
    },
    tasks,
    comms: (comms ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      subject: c.subject,
      date: c.sent_at ?? c.created_at,
    })),
  });
}
