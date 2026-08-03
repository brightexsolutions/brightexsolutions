/**
 * Additional contacts on a client record, and which kinds of outgoing email
 * each should be copied on. See lib/cc-recipients.ts for how the scopes are
 * applied at send time.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { CC_SCOPES, CC_SCOPE_ALL, normaliseEmail } from "@/lib/cc-recipients";

export const dynamic = "force-dynamic";

const ScopeEnum = z.enum([...CC_SCOPES, CC_SCOPE_ALL] as [string, ...string[]]);

const ContactSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(200).trim(),
  role: z.string().max(120).trim().optional(),
  cc_scopes: z.array(ScopeEnum).max(CC_SCOPES.length + 1).default([]),
  notes: z.string().max(1000).trim().optional(),
  active: z.boolean().default(true),
});

/** Missing table means migration 033 has not been applied yet. */
function isMissingTable(message: string): boolean {
  return /relation .*client_contacts.* does not exist|schema cache/i.test(message);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("client_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    // Report an empty list rather than an error page: the feature is simply
    // not available until the migration runs.
    if (isMissingTable(error.message)) {
      return NextResponse.json({ data: [], migrationPending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const body = await request.json().catch(() => ({}));
  const result = ContactSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  // Copying the primary contact on their own mail would double every send.
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (client.email && client.email.toLowerCase() === result.data.email.toLowerCase()) {
    return NextResponse.json(
      { error: "That is already the client's primary email, so they are always the main recipient." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("client_contacts")
    .upsert(
      // Stored lowercase so the (client_id, email) unique constraint stays
      // case-insensitive in practice. See normaliseEmail and migration 035.
      { client_id: id, ...result.data, email: normaliseEmail(result.data.email), deleted_at: null },
      { onConflict: "client_id,email" }
    )
    .select()
    .single();

  if (error) {
    if (isMissingTable(error.message)) {
      return NextResponse.json(
        { error: "Run migration 033_client_contacts_cc.sql before adding CC contacts." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "created",
    entity_type: "client_contact",
    entity_id: data.id,
    entity_label: `${data.name} <${data.email}>`,
    notes: `CC contact for ${client.name} · scopes: ${data.cc_scopes?.join(", ") || "none"}`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
