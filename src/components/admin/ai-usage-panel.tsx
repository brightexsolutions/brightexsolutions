"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap, Gauge, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UsageData {
  today: { calls: number; tokensIn: number; tokensOut: number };
  thisWeek: { calls: number; tokensIn: number; tokensOut: number };
  allTimeSampled: { calls: number; tokensIn: number; tokensOut: number };
  byFeature: { feature: string; calls: number; tokensIn: number; tokensOut: number }[];
  tierSplit: { free: number; paid: number; anthropic: number };
  budget: { minute: { used: number; limit: number }; hour: { used: number; limit: number }; day: { used: number; limit: number } };
  hasPaidKeyConfigured: boolean;
}

function BudgetBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground">{used} / {limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AiUsagePanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-usage")
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Couldn&apos;t load AI usage data.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">AI calls today</p>
            <p className="text-2xl font-display font-bold text-foreground">{data.today.calls}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{data.today.tokensIn + data.today.tokensOut} tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">This week</p>
            <p className="text-2xl font-display font-bold text-foreground">{data.thisWeek.calls}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{data.thisWeek.tokensIn + data.thisWeek.tokensOut} tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Free vs paid tier</p>
            <p className="text-2xl font-display font-bold text-foreground">{data.tierSplit.free}<span className="text-sm text-muted-foreground font-normal"> free</span></p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {data.tierSplit.paid} paid · {data.tierSplit.anthropic} anthropic
              {!data.hasPaidKeyConfigured && data.tierSplit.paid === 0 && " (no paid key set)"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={14} className="text-brand-gold" />
            <p className="text-sm font-semibold text-foreground">Gemini call budget (shared across admin + Brixo)</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BudgetBar label="Per minute" used={data.budget.minute.used} limit={data.budget.minute.limit} />
            <BudgetBar label="Per hour" used={data.budget.hour.used} limit={data.budget.hour.limit} />
            <BudgetBar label="Per day" used={data.budget.day.used} limit={data.budget.day.limit} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-brand-gold" />
            <p className="text-sm font-semibold text-foreground">Usage by feature</p>
          </div>
          {data.byFeature.length === 0 ? (
            <p className="text-xs text-muted-foreground">No AI calls logged yet.</p>
          ) : (
            <div className="space-y-2">
              {data.byFeature.map((f) => (
                <div key={f.feature} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-foreground font-mono">{f.feature}</span>
                  <span className="text-muted-foreground">{f.calls} calls · {(f.tokensIn + f.tokensOut).toLocaleString()} tokens</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-sm border border-dashed border-border bg-muted/10">
        <Coins size={14} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Token counts are exact (from the provider&apos;s own usage metadata). Cost estimates aren&apos;t shown since
          Gemini&apos;s free tier has no per-token price — the call-budget bars above are what actually protects spend.
        </p>
      </div>
    </div>
  );
}
