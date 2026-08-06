import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { CC_SCOPES, CC_SCOPE_ALL, contactLabel } from "@/lib/cc-recipients";

export const dynamic = "force-dynamic";

const ScopeEnum = z.enum([...CC_SCOPES, CC_SCOPE_ALL] as [string, ...string[]]);

const PatchSchema = z.object({
  // Blank is allowed, so a name added by mistake can be cleared again.
  name: z.string().max(200).trim().optional(),
  email: z.string().email().max(200).trim().optional(),
  role: z.string().max(120).trim().optional(),
  cc_scopes: z.array(ScopeEnum).max(CC_SCOPES.length + 1).optional(),
  notes: z.string().max(1000).trim().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, contactId } = await params;

  const body = await request.json().catch(() => ({}));
  const result = PatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .update(result.data)
    .eq("id", contactId)
    // Scoped to the client in the URL so a contact id alone cannot be used to
    // edit a contact belonging to a different client.
    .eq("client_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "updated",
    entity_type: "client_contact",
    entity_id: data.id,
    entity_label: contactLabel(data),
    notes: `Scopes: ${data.cc_scopes?.join(", ") || "none"}`,
  });

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, contactId } = await params;
  const supabase = createAdminClient();

  // Soft delete, matching the rest of the schema, so the comms history that
  // references this address stays explainable.
  const { data, error } = await supabase
    .from("client_contacts")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", contactId)
    .eq("client_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "deleted",
    entity_type: "client_contact",
    entity_id: contactId,
    entity_label: data ? contactLabel(data) : contactId,
  });

  return NextResponse.json({ success: true });
}
