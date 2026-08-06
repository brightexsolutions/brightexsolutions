"use client";

/**
 * Who a one-click send is about to reach.
 *
 * Invoices, receipts and reminders resolve their CC list on the server from
 * the client's routing rules, which means the rules are invisible at the only
 * moment they matter: the click. This puts them next to the button.
 *
 * Deliberately not a confirmation dialog. A dialog shown on every send is
 * dismissed on every send, and within a fortnight it is two clicks where there
 * was one rather than a safety net. This costs no clicks at all, so it cannot
 * decay into reflex.
 */

import { useCallback, useEffect, useState } from "react";
import { Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CC_SCOPE_ALL, CC_SCOPE_LABELS, contactLabel, type CcScope } from "@/lib/cc-scopes";

export interface CcContact {
  id: string;
  client_id: string;
  name: string;
  email: string;
  role: string | null;
  cc_scopes: string[];
}

type LoadState = "loading" | "ready" | "failed";

/**
 * Every CC contact, fetched once for the page rather than once per row.
 *
 * Load state is returned alongside, because "this client copies nobody" and
 * "we could not find out who this client copies" produce the same empty list
 * and only one of them is safe to send on.
 */
export function useClientContacts() {
  const [contacts, setContacts] = useState<CcContact[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/client-contacts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setContacts(json.data ?? []);
      setState("ready");
    } catch {
      setContacts([]);
      setState("failed");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { contacts, state, reload: load };
}

/** Contacts on this client who are configured to see this kind of message. */
export function ccFor(
  contacts: CcContact[],
  clientId: string | null | undefined,
  scope: CcScope
): CcContact[] {
  if (!clientId) return [];
  return contacts.filter(
    (c) =>
      c.client_id === clientId &&
      (c.cc_scopes?.includes(scope) || c.cc_scopes?.includes(CC_SCOPE_ALL))
  );
}

export function RecipientHint({
  contacts,
  state,
  clientId,
  scope,
  to,
  className,
}: {
  contacts: CcContact[];
  state: LoadState;
  clientId: string | null | undefined;
  scope: CcScope;
  /** The primary recipient, named in the tooltip so the whole list is in one place. */
  to?: string | null;
  className?: string;
}) {
  if (state === "failed") {
    return (
      <span
        className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600", className)}
        title="Could not check this client's copy list. Anyone configured to be copied may be missed."
      >
        <AlertTriangle size={10} />
        cc?
      </span>
    );
  }

  const cc = ccFor(contacts, clientId, scope);
  // Nothing to warn about, and a chip reading "+0" on every row is noise that
  // trains the eye to skip the ones that matter.
  if (state === "loading" || cc.length === 0) return null;

  const detail = [
    to ? `To: ${to}` : null,
    `Also copied on ${CC_SCOPE_LABELS[scope].toLowerCase()}:`,
    ...cc.map((c) => `  ${contactLabel(c)}${c.role ? ` (${c.role})` : ""} <${c.email}>`),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
        "bg-brand-gold/10 text-brand-navy dark:text-brand-gold border border-brand-gold/30 cursor-help",
        className
      )}
      title={detail}
    >
      <Users size={9} />
      +{cc.length}
    </span>
  );
}
