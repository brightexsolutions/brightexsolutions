import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) return NextResponse.json({ clients: [], projects: [], invoices: [], posts: [] });

  const supabase = createAdminClient();
  const like = `%${q}%`;

  const [clientsRes, projectsRes, invoicesRes, postsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, email, company, classification")
      .or(`name.ilike.${like},email.ilike.${like},company.ilike.${like}`)
      .is("deleted_at", null)
      .limit(5),

    supabase
      .from("projects")
      .select("id, name, status, clients(name)")
      .ilike("name", like)
      .limit(5),

    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, clients(name)")
      .or(`invoice_number.ilike.${like}`)
      .limit(5),

    supabase
      .from("social_posts")
      .select("id, caption, status, platforms")
      .ilike("caption", like)
      .limit(5),
  ]);

  return NextResponse.json({
    clients:  clientsRes.data  ?? [],
    projects: projectsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    posts:    postsRes.data    ?? [],
  });
}
