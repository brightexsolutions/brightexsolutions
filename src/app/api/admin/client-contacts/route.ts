/**
 * Every active CC contact, across all clients, in one call.
 *
 * The per-client route is right for editing one client's list. It is the wrong
 * shape for a page that lists thirty invoices belonging to a dozen clients and
 * wants to show who each send will reach, which would otherwise be a request
 * per row. The whole table is small enough to fetch once per page.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .select("id, client_id, name, email, role, cc_scopes")
    .eq("active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    // Before migration 033 there is no table, which is a client with no extra
    // recipients rather than a fault. Anything else is reported, so a caller
    // can tell "nobody is copied" apart from "we could not find out".
    if (/relation .*client_contacts.* does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ data: [], migrationPending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
