"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, Plus, Pencil, Trash2, Loader2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";

// ─── Stage definitions ────────────────────────────────────────────────────────

const stages = [
  {
    key: "lead",
    label: "Lead",
    color: "border-t-blue-400",
    dotColor: "bg-blue-400",
    description: "Someone who has shown initial interest or been identified as a potential opportunity. No formal assessment has been done yet.",
    criteria: [
      "Reached out via form, referral, or social media",
      "You've spotted them as a potential fit",
      "Initial conversation happened — nothing confirmed",
    ],
  },
  {
    key: "qualified",
    label: "Qualified",
    color: "border-t-cyan-400",
    dotColor: "bg-cyan-400",
    description: "You've assessed the lead and confirmed they are worth pursuing. They have a genuine need, a reachable decision-maker, and a budget.",
    criteria: [
      "Budget confirmed — they can afford the service",
      "Authority — you're speaking to the decision-maker",
      "Need — a clear problem Brightex can solve",
      "Timeline — they intend to proceed soon",
    ],
  },
  {
    key: "proposal",
    label: "Proposal Sent",
    color: "border-t-amber-400",
    dotColor: "bg-amber-400",
    description: "A formal proposal or quotation has been shared, outlining scope, deliverables, timeline, and pricing. Ball is in their court.",
    criteria: [
      "Written proposal or quote sent and acknowledged",
      "Prospect is reviewing the offer",
      "Follow-up scheduled or pending",
    ],
  },
  {
    key: "negotiation",
    label: "Negotiation",
    color: "border-t-orange-400",
    dotColor: "bg-orange-400",
    description: "The prospect wants to proceed but there are open discussions — price adjustments, scope changes, or contract terms need to be finalised.",
    criteria: [
      "Active back-and-forth on price or scope",
      "Contract or agreement under review",
      "They are committed in principle — details remain",
    ],
  },
  {
    key: "won",
    label: "Won",
    color: "border-t-emerald-400",
    dotColor: "bg-emerald-400",
    description: "The deal is closed. The client has agreed to proceed, signed off, or made an initial payment. Time to convert this to a project.",
    criteria: [
      "Verbal or written confirmation received",
      "Deposit or full payment made",
      "Project kickoff scheduled — create a Project record",
    ],
  },
  {
    key: "lost",
    label: "Lost",
    color: "border-t-red-400",
    dotColor: "bg-red-400",
    description: "The deal did not progress. Logging lost deals helps track win rate and identify patterns to improve future pitches.",
    criteria: [
      "Prospect chose a competitor",
      "Budget constraints or project cancelled",
      "No response after multiple follow-ups",
      "Timing didn't work — may revisit later",
    ],
  },
] as const;

type StageKey = (typeof stages)[number]["key"];

const defaultForm = { service: "", estimated_value: "", status: "lead" as StageKey, notes: "" };

// ─── Types ────────────────────────────────────────────────────────────────────

type Deal = {
  id: string;
  client_id?: string | null;
  service?: string | null;
  estimated_value?: number | null;
  status: string;
  notes?: string | null;
  created_at: string;
  clients?: { id: string; name?: string | null; company?: string | null; email?: string | null } | null;
};

// ─── Stage header with info tooltip ──────────────────────────────────────────

function StageHeader({ stage, count }: { stage: typeof stages[number]; count: number }) {
  return (
    <div className={`p-3 rounded-sm bg-card border border-border border-t-2 ${stage.color}`}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-semibold text-foreground">{stage.label}</p>
        {/* Info icon with tooltip */}
        <div className="relative group/info shrink-0">
          <button
            type="button"
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            tabIndex={-1}
          >
            <Info size={12} />
          </button>
          {/* Tooltip — appears below the icon */}
          <div className="absolute top-full left-0 z-200 mt-2 hidden group-hover/info:block w-64 pointer-events-none">
            <div className="bg-popover border border-border rounded-sm shadow-xl p-3 text-left">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", stage.dotColor)} />
                <p className="text-xs font-semibold text-foreground">{stage.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{stage.description}</p>
              <p className="text-[11px] font-semibold text-foreground mb-1">Criteria</p>
              <ul className="space-y-1">
                {stage.criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-brand-gold text-[11px] leading-4 shrink-0">·</span>
                    <span className="text-[11px] text-muted-foreground leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <p className="text-lg font-display font-bold text-muted-foreground mt-0.5">{count}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SalesPageClient() {
  const confirm = useConfirm();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deal | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sales");
    const json = await res.json().catch(() => ({}));
    if (res.ok) { setDeals(json.data ?? []); setNowMs(Date.now()); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openCreate(defaultStatus?: string) {
    setEditTarget(null);
    setForm({ ...defaultForm, status: (defaultStatus ?? "lead") as StageKey });
    setError("");
    setOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditTarget(deal);
    setForm({
      service: deal.service ?? "",
      estimated_value: String(deal.estimated_value ?? ""),
      status: deal.status as StageKey,
      notes: deal.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined };
      const url = editTarget ? `/api/admin/sales/${editTarget.id}` : "/api/admin/sales";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      if (editTarget) {
        setDeals((prev) => prev.map((d) => d.id === editTarget.id ? { ...d, ...data.data } : d));
      } else {
        setDeals((prev) => [data.data, ...prev]);
      }
      setOpen(false);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(deal: Deal) {
    if (!await confirm({ message: "Delete this deal? This cannot be undone." })) return;
    setBusyId(deal.id);
    try {
      await fetch(`/api/admin/sales/${deal.id}`, { method: "DELETE" });
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusChange(dealId: string, newStatus: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.status === newStatus) return;
    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, status: newStatus } : d));
    try {
      await fetch(`/api/admin/sales/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      load(); // revert on failure
    }
  }

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, dealId: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
    setDraggedId(dealId);
  }

  function onDragEnd() {
    setDraggedId(null);
    setDragOverStage(null);
  }

  function onColumnDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageKey) setDragOverStage(stageKey);
  }

  function onColumnDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  }

  function onColumnDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (id) handleStatusChange(id, stageKey);
    setDraggedId(null);
    setDragOverStage(null);
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const openStatuses = new Set(["lead", "qualified", "proposal", "negotiation"]);
  const openDeals = deals.filter((d) => openStatuses.has(d.status));
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.estimated_value ?? 0), 0);
  const wonLast30Days = wonDeals.filter((d) => nowMs !== null && nowMs - new Date(d.created_at).getTime() <= 30 * 86400000).length;
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Track deals from lead to close. Drag cards between stages.</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
        >
          <Plus size={15} />New Deal
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Pipeline Value" value={`KES ${pipelineValue.toLocaleString()}`} sub="Open deals only" icon={TrendingUp} />
        <StatCard title="Open Deals" value={openDeals.length} sub="Lead to negotiation" icon={TrendingUp} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Won (30 days)" value={wonLast30Days} sub="Recently closed" icon={TrendingUp} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Win Rate" value={`${winRate}%`} sub={closedDeals > 0 ? `${wonDeals.length}/${closedDeals} closed deals` : "No closed deals yet"} icon={TrendingUp} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.status === stage.key);
          const isOver = dragOverStage === stage.key;
          const isDraggingActive = draggedId !== null;

          return (
            <div
              key={stage.key}
              className={cn(
                "flex flex-col gap-2 rounded-sm p-1 -m-1 transition-all duration-150",
                isOver && "ring-2 ring-brand-gold/50 ring-offset-1 ring-offset-background"
              )}
              onDragOver={(e) => onColumnDragOver(e, stage.key)}
              onDragLeave={onColumnDragLeave}
              onDrop={(e) => onColumnDrop(e, stage.key)}
            >
              <StageHeader stage={stage} count={stageDeals.length} />

              {/* Deal cards */}
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, deal.id)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "rounded-sm border border-border bg-card p-3 group cursor-grab active:cursor-grabbing transition-all duration-150 select-none",
                    draggedId === deal.id && "opacity-40 scale-95 shadow-none",
                    isDraggingActive && draggedId !== deal.id && "opacity-80",
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
                      {deal.service || "Untitled opportunity"}
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(deal)}
                        disabled={busyId === deal.id}
                        className="p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        title="Edit"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(deal)}
                        disabled={busyId === deal.id}
                        className="p-1 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {busyId === deal.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {deal.clients?.company || deal.clients?.name || "No client linked"}
                  </p>
                  <p className="text-xs font-medium text-foreground mt-2">
                    {deal.estimated_value ? `KES ${Number(deal.estimated_value).toLocaleString()}` : <span className="text-muted-foreground">Value not set</span>}
                  </p>
                  {deal.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{deal.notes}</p>
                  )}
                </div>
              ))}

              {/* Drop zone hint when dragging */}
              {isDraggingActive && isOver && (
                <div className="rounded-sm border-2 border-dashed border-brand-gold/40 bg-brand-gold/5 h-12 flex items-center justify-center">
                  <p className="text-xs text-brand-gold/60">Drop here</p>
                </div>
              )}

              {/* Add deal button */}
              <button
                onClick={() => openCreate(stage.key)}
                className="min-h-15 rounded-sm border border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-brand-gold/40 transition-colors group/add"
              >
                <Plus size={14} className="text-muted-foreground/30 group-hover/add:text-brand-gold transition-colors" />
                <p className="text-xs text-muted-foreground/50 group-hover/add:text-muted-foreground transition-colors">Add deal</p>
              </button>
            </div>
          );
        })}
      </div>

      {!loading && deals.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No deals in the pipeline yet. Add your first opportunity to start tracking it here.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && deals.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">Loading pipeline data…</p>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Deal" : "New Deal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="service">Service / Opportunity *</Label>
              <Input id="service" value={form.service} onChange={(e) => set("service", e.target.value)} required placeholder="e.g. Website redesign" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="deal-value">Estimated Value (KES)</Label>
                <Input id="deal-value" type="number" min="0" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.status} onValueChange={(v) => v && set("status", v)}>
                  <SelectTrigger>
                    {form.status ? (
                      <span className="text-sm">{stages.find((s) => s.key === form.status)?.label ?? form.status}</span>
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-notes">Notes</Label>
              <Textarea id="deal-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Deal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
