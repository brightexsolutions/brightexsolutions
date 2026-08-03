"use client";

/**
 * Manages the extra people on a client record and what each of them gets
 * copied on. Deliberately scope-by-scope rather than a single "CC everything"
 * switch: an accountant who wants invoices does not want every project note,
 * and a director who wants agreements does not want payment receipts.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CC_SCOPES, CC_SCOPE_LABELS, CC_SCOPE_ALL, type CcScope } from "@/lib/cc-scopes";

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  role: string | null;
  cc_scopes: string[];
  active: boolean;
}

const EMPTY_FORM = { name: "", email: "", role: "", cc_scopes: [] as string[] };

export function ClientContactsPanel({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/contacts`);
      const json = await res.json();
      if (res.ok) {
        setContacts(json.data ?? []);
        setMigrationPending(!!json.migrationPending);
      }
    } catch {
      // Leave the list empty; the error surfaces on the first write attempt.
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  function toggleFormScope(scope: string) {
    setForm((f) => ({
      ...f,
      cc_scopes: f.cc_scopes.includes(scope)
        // "Everything" and the individual scopes are mutually exclusive, so
        // the stored list always reads as exactly one intent.
        ? f.cc_scopes.filter((s) => s !== scope)
        : scope === CC_SCOPE_ALL
          ? [CC_SCOPE_ALL]
          : [...f.cc_scopes.filter((s) => s !== CC_SCOPE_ALL), scope],
    }));
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: form.role || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Could not add this contact."); return; }
      setContacts((prev) => [...prev.filter((c) => c.id !== json.data.id), json.data]);
      setForm(EMPTY_FORM);
      setAdding(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleScope(contact: ClientContact, scope: string) {
    const next = contact.cc_scopes.includes(scope)
      ? contact.cc_scopes.filter((s) => s !== scope)
      : scope === CC_SCOPE_ALL
        ? [CC_SCOPE_ALL]
        : [...contact.cc_scopes.filter((s) => s !== CC_SCOPE_ALL), scope];

    // Optimistic: toggling scopes is cheap and reverting on failure is clearer
    // than a spinner on every chip.
    const previous = contacts;
    setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, cc_scopes: next } : c));

    const res = await fetch(`/api/admin/clients/${clientId}/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cc_scopes: next }),
    });
    if (!res.ok) {
      setContacts(previous);
      setError("Could not save that change.");
    }
  }

  async function removeContact(contact: ClientContact) {
    setBusyId(contact.id);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    } finally {
      setBusyId(null);
    }
  }

  const allScopes: (CcScope | typeof CC_SCOPE_ALL)[] = [...CC_SCOPES, CC_SCOPE_ALL];

  function scopeLabel(scope: string): string {
    return scope === CC_SCOPE_ALL ? "Everything" : CC_SCOPE_LABELS[scope as CcScope] ?? scope;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Copy on emails</p>
        </div>
        {!adding && !migrationPending && (
          <button type="button" onClick={() => { setAdding(true); setError(""); }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={11} /> Add person
          </button>
        )}
      </div>

      {migrationPending && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-sm px-2.5 py-2 leading-relaxed">
          Run migration 033_client_contacts_cc.sql to start copying additional people on this client&apos;s email.
        </p>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading contacts...</p>
      ) : contacts.length === 0 && !adding && !migrationPending ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Only the primary contact is emailed. Add anyone else who should be copied, and choose what they see.
        </p>
      ) : null}

      <div className="space-y-2">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-sm border border-border p-2.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {contact.name}
                  {contact.role && <span className="font-normal text-muted-foreground"> · {contact.role}</span>}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{contact.email}</p>
              </div>
              <button type="button" onClick={() => removeContact(contact)} disabled={busyId === contact.id}
                className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                aria-label={`Remove ${contact.name}`}>
                {busyId === contact.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {allScopes.map((scope) => {
                const active = contact.cc_scopes.includes(scope);
                return (
                  <button key={scope} type="button" onClick={() => toggleScope(contact, scope)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                      active
                        ? "border-brand-gold/50 bg-brand-gold/10 text-brand-navy dark:text-brand-gold"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    )}>
                    {scopeLabel(scope)}
                  </button>
                );
              })}
            </div>
            {contact.cc_scopes.length === 0 && (
              <p className="text-[10px] text-amber-600">Not copied on anything yet. Pick at least one.</p>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <form onSubmit={addContact} className="rounded-sm border border-dashed border-border p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-foreground">New contact</p>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY_FORM); setError(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name" required
              className="px-2.5 py-1.5 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Role (optional)"
              className="px-2.5 py-1.5 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="email@company.co.ke" required
            className="w-full px-2.5 py-1.5 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" />

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Copy them on</p>
            <div className="flex flex-wrap gap-1">
              {allScopes.map((scope) => {
                const active = form.cc_scopes.includes(scope);
                return (
                  <button key={scope} type="button" onClick={() => toggleFormScope(scope)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
                      active
                        ? "border-brand-gold/50 bg-brand-gold/10 text-brand-navy dark:text-brand-gold"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    )}>
                    {scopeLabel(scope)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[11px] text-red-500">{error}</p>}

          <button type="submit" disabled={saving || !form.name || !form.email || form.cc_scopes.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-sm bg-brand-gold text-brand-navy text-xs font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {saving ? "Adding..." : "Add contact"}
          </button>
        </form>
      )}

      {error && !adding && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
