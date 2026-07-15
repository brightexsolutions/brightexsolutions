"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Loader2, ArrowUpRight, PartyPopper, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Urgency = "high" | "medium" | "low";
type DraftKind = "invoice_reminder" | "lead_followup" | "client_checkin";

interface SuggestedAction {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
  urgency: Urgency;
  draft?: { kind: DraftKind; clientId: string; invoiceId?: string; saleId?: string };
}

interface Response {
  headline: string;
  actions: SuggestedAction[];
  source: "ai" | "rule-based";
}

const urgencyStyle: Record<Urgency, string> = {
  high: "bg-red-400/10 text-red-500",
  medium: "bg-amber-400/10 text-amber-500",
  low: "bg-blue-400/10 text-blue-500",
};

export function SuggestedActionsCard({ onDraft }: { onDraft?: (action: SuggestedAction) => void }) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/suggested-actions");
      const json = await res.json().catch(() => null);
      if (res.ok && json) setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDraft(a: SuggestedAction) {
    if (!a.draft || !onDraft) return;
    setDrafting(a.id);
    try {
      await onDraft(a);
    } finally {
      setDrafting(null);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-brand-gold" />
            <CardTitle className="text-base font-semibold">Suggested Next Actions</CardTitle>
            {data?.source === "ai" && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">AI</span>
            )}
          </div>
          <button onClick={load} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
        {data && <p className="text-xs text-muted-foreground mt-0.5">{data.headline}</p>}
      </CardHeader>
      <CardContent className="pt-0">
        {loading && !data ? (
          <div className="py-6 flex justify-center">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.actions.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <PartyPopper size={20} className="text-emerald-500" />
            <p className="text-sm text-muted-foreground">Nothing urgent across clients, invoices, leads, tasks, or projects.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.actions.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 p-2.5 rounded-sm border border-border hover:border-brand-gold/30 hover:bg-muted/30 transition-colors group"
              >
                <span className={cn("shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize", urgencyStyle[a.urgency])}>
                  {a.urgency}
                </span>
                <Link href={a.href} className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.detail}</p>
                </Link>
                {a.draft && onDraft ? (
                  <button
                    type="button"
                    onClick={() => handleDraft(a)}
                    disabled={drafting === a.id}
                    title="Have AI draft an email for this — you'll review before it sends"
                    className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-brand-gold hover:text-brand-gold-hover border border-brand-gold/30 rounded-sm px-2 py-1 hover:bg-brand-gold/10 transition-colors disabled:opacity-50"
                  >
                    {drafting === a.id ? <Loader2 size={10} className="animate-spin" /> : <FileEdit size={10} />}
                    {drafting === a.id ? "Drafting…" : "Draft"}
                  </button>
                ) : (
                  <Link href={a.href}>
                    <ArrowUpRight size={12} className="mt-0.5 text-muted-foreground/50 group-hover:text-brand-gold transition-colors shrink-0" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
