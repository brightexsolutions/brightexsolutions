/**
 * Per-scope CC routing for outgoing client email (server side).
 *
 * A client has one primary email, but the people who need to see a given
 * message vary by what the message is: finance wants invoices and receipts,
 * a director wants agreements, an ops lead wants project updates. Extra
 * contacts live in `client_contacts` and declare which scopes they are
 * copied on, so nobody is blanket-CC'd on everything.
 *
 * Every client-facing send site resolves its CC list through resolveCc() so
 * the rules live in exactly one place.
 *
 * The scope vocabulary and pure helpers live in cc-scopes.ts, which is safe
 * to import from client components; this module is server-only.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { CC_SCOPE_ALL, dedupeCc, type CcScope } from "@/lib/cc-scopes";

export {
  CC_SCOPES, CC_SCOPE_LABELS, CC_SCOPE_ALL,
  isValidEmail, dedupeCc, describeCc, normaliseEmail,
  type CcScope,
} from "@/lib/cc-scopes";

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  role: string | null;
  cc_scopes: string[];
  active: boolean;
}

/** All active extra contacts for a client, oldest first. Never throws. */
export async function getClientContacts(clientId: string): Promise<ClientContact[]> {
  if (!clientId) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("client_contacts")
      .select("id, name, email, role, cc_scopes, active")
      .eq("client_id", clientId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    // Missing table means migration 033 has not run yet: degrade to no CC
    // rather than failing a send that would otherwise have gone out fine.
    if (error) return [];
    return (data ?? []) as ClientContact[];
  } catch {
    return [];
  }
}

/**
 * Resolves the CC list for one outgoing email.
 *
 * @param clientId  client the mail is about (omit for non-client mail)
 * @param scope     what kind of message this is
 * @param extra     manually-added addresses (composer CC field, intake form)
 * @param to        the To line, so we never CC someone their own copy
 */
export async function resolveCc({
  clientId,
  scope,
  extra = [],
  to,
}: {
  clientId?: string | null;
  scope: CcScope;
  extra?: (string | null | undefined)[];
  to?: string | string[] | null;
}): Promise<string[]> {
  const contacts = clientId ? await getClientContacts(clientId) : [];
  const matched = contacts
    .filter((c) => c.cc_scopes?.includes(scope) || c.cc_scopes?.includes(CC_SCOPE_ALL))
    .map((c) => c.email);

  return dedupeCc([...matched, ...extra], to);
}
