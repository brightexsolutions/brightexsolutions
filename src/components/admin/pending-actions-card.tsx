"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Inbox, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PendingAction {
  id: string;
  kind: string;
  title: string;
  rationale: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  created_at: string;
  clients?: { id: string; name: string; company: string | null; email: string | null } | null;
}

export function PendingActionsCard({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-actions?status=pending");
      const json = await res.json().catch(() => null);
      if (res.ok && json) setItems(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [refreshKey]);

  function toggle(item: PendingAction) {
    if (expanded === item.id) { setExpanded(null); return; }
    setExpanded(item.id);
    setEdits((prev) => prev[item.id] ? prev : { ...prev, [item.id]: { subject: item.draft_subject ?? "", body: item.draft_body ?? "" } });
  }

  async function resolve(item: PendingAction, action: "approve" | "dismiss") {
    setBusy(item.id);
    try {
      const edit = edits[item.id];
      const res = await fetch(`/api/admin/pending-actions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve" ? { action, subject: edit?.subject, body: edit?.body } : { action }
        ),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setExpanded(null);
      }
    } finally {
      setBusy(null);
    }
  }

  if (!loading && items.length === 0) return null;

  return (
    <Card className="rounded-xl border-brand-gold/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Inbox size={15} className="text-brand-gold" />
          <CardTitle className="text-base font-semibold">Pending Your Approval</CardTitle>
          {items.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold">{items.length}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">AI-drafted emails, waiting on your review — nothing sends without your approval.</p>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isOpen = expanded === item.id;
              const edit = edits[item.id] ?? { subject: item.draft_subject ?? "", body: item.draft_body ?? "" };
              return (
                <div key={item.id} className="rounded-sm border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    className="w-full flex items-center justify-between gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      {item.rationale && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.rationale}</p>}
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="p-2.5 pt-0 space-y-2 bg-muted/10">
                      <p className="text-[11px] text-muted-foreground">To: {item.clients?.name}{item.clients?.email ? ` <${item.clients.email}>` : " — no email on file"}</p>
                      <input
                        value={edit.subject}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: { ...edit, subject: e.target.value } }))}
                        className="w-full px-2.5 py-1.5 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <textarea
                        value={edit.body}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: { ...edit, body: e.target.value } }))}
                        rows={6}
                        className="w-full px-2.5 py-1.5 rounded-sm border border-input bg-background text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => resolve(item, "dismiss")}
                          disabled={busy === item.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm border border-input text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          <XCircle size={12} />Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => resolve(item, "approve")}
                          disabled={busy === item.id || !item.clients?.email}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm bg-brand-gold text-brand-navy text-xs font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-50"
                        >
                          {busy === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Approve & Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
