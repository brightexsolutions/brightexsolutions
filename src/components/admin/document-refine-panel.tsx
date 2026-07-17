"use client";

import { useState } from "react";
import { Sparkles, Loader2, Plus, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type DocType = "proposal" | "agreement" | "sop";

export interface DocumentRefineTarget {
  documentId: string;
  docType: DocType;
  data: Record<string, unknown>;
  /** Called with the freshly-saved row's `data` after either an AI refine or a manual save. */
  onUpdated: (newData: Record<string, unknown>) => void;
}

type LineItem = { description: string; qty: number; unit_price: number };
type ScopeItem = { title: string; description?: string | null };
type Milestone = { label: string; amount: number; due: string };
type SopStep = { step: string; description: string };

const inputCls = "w-full px-2.5 py-1.5 rounded-sm border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring";
const labelCls = "text-[11px] font-semibold text-muted-foreground uppercase tracking-widest";

export function DocumentRefinePanel({ target }: { target: DocumentRefineTarget }) {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function askAI() {
    if (!instruction.trim()) return;
    setRefining(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`/api/admin/documents/${target.documentId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Refinement failed");
      target.onUpdated(payload.data.data);
      setInstruction("");
      setOk("Updated — preview refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  }

  async function saveManual(newData: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`/api/admin/documents/${target.documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? "Save failed");
      target.onUpdated(payload.data.data);
      setOk("Saved — preview refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-border bg-muted/10 shrink-0">
      <div className="flex items-center gap-1 px-5 pt-3">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors",
            mode === "ai" ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Sparkles size={12} />Ask AI
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors",
            mode === "manual" ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Pencil size={12} />Edit Manually
        </button>
      </div>

      <div className="px-5 py-4 space-y-3 max-h-[40vh] overflow-y-auto">
        {mode === "ai" ? (
          <>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder='e.g. "Lower the total by 10%", "Add a scope item for ongoing maintenance", "Change the deposit to 30%"'
              className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={askAI}
              disabled={refining || !instruction.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-50"
            >
              {refining ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {refining ? "Applying…" : "Apply with AI"}
            </button>
          </>
        ) : (
          <ManualEditor target={target} saving={saving} onSave={saveManual} />
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        {ok && !error && <p className="text-xs text-emerald-600">{ok}</p>}
      </div>
    </div>
  );
}

function ManualEditor({
  target, saving, onSave,
}: {
  target: DocumentRefineTarget;
  saving: boolean;
  onSave: (newData: Record<string, unknown>) => void;
}) {
  if (target.docType === "proposal") return <ProposalEditor data={target.data} saving={saving} onSave={onSave} />;
  if (target.docType === "agreement") return <AgreementEditor data={target.data} saving={saving} onSave={onSave} />;
  return <SopEditor data={target.data} saving={saving} onSave={onSave} />;
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="px-4 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-50"
    >
      {saving ? "Saving…" : "Save changes"}
    </button>
  );
}

function ProposalEditor({ data, saving, onSave }: { data: Record<string, unknown>; saving: boolean; onSave: (d: Record<string, unknown>) => void }) {
  const [lineItems, setLineItems] = useState<LineItem[]>((data.line_items as LineItem[]) ?? []);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>((data.scope_items as ScopeItem[]) ?? []);
  const depositTerms = data.payment_terms as { deposit_percent?: number; note?: string } | undefined;
  const [depositPercent, setDepositPercent] = useState(depositTerms?.deposit_percent ?? 50);

  function save() {
    onSave({
      ...data,
      line_items: lineItems,
      scope_items: scopeItems,
      payment_terms: { ...(depositTerms ?? {}), deposit_percent: depositPercent },
    });
  }

  const total = lineItems.reduce((sum, li) => sum + (Number(li.qty) || 0) * (Number(li.unit_price) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={labelCls}>Line Items ({`Total: KES ${total.toLocaleString()}`})</label>
        {lineItems.map((li, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input className={cn(inputCls, "flex-1")} value={li.description} placeholder="Description"
              onChange={(e) => setLineItems((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
            <input className={cn(inputCls, "w-14")} type="number" value={li.qty} placeholder="Qty"
              onChange={(e) => setLineItems((prev) => prev.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
            <input className={cn(inputCls, "w-24")} type="number" value={li.unit_price} placeholder="Unit price"
              onChange={(e) => setLineItems((prev) => prev.map((x, j) => j === i ? { ...x, unit_price: Number(e.target.value) } : x))} />
            <button type="button" onClick={() => setLineItems((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 shrink-0"><X size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setLineItems((prev) => [...prev, { description: "", qty: 1, unit_price: 0 }])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Plus size={12} />Add line item</button>
      </div>

      <div className="space-y-2">
        <label className={labelCls}>Scope Items</label>
        {scopeItems.map((si, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <div className="flex-1 space-y-1">
              <input className={inputCls} value={si.title} placeholder="Title"
                onChange={(e) => setScopeItems((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <input className={inputCls} value={si.description ?? ""} placeholder="Description"
                onChange={(e) => setScopeItems((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
            </div>
            <button type="button" onClick={() => setScopeItems((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 shrink-0 mt-1.5"><X size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setScopeItems((prev) => [...prev, { title: "", description: "" }])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Plus size={12} />Add scope item</button>
      </div>

      <div className="space-y-1.5 max-w-[160px]">
        <label className={labelCls}>Deposit %</label>
        <input className={inputCls} type="number" min={0} max={100} value={depositPercent}
          onChange={(e) => setDepositPercent(Number(e.target.value))} />
      </div>

      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

function AgreementEditor({ data, saving, onSave }: { data: Record<string, unknown>; saving: boolean; onSave: (d: Record<string, unknown>) => void }) {
  const [deliverables, setDeliverables] = useState<string[]>((data.deliverables as string[]) ?? []);
  const [milestones, setMilestones] = useState<Milestone[]>((data.payment_milestones as Milestone[]) ?? []);
  const [totalFees, setTotalFees] = useState<number>((data.total_fees as number) ?? 0);

  function save() {
    onSave({ ...data, deliverables, payment_milestones: milestones, total_fees: totalFees });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={labelCls}>Deliverables</label>
        {deliverables.map((d, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input className={cn(inputCls, "flex-1")} value={d}
              onChange={(e) => setDeliverables((prev) => prev.map((x, j) => j === i ? e.target.value : x))} />
            <button type="button" onClick={() => setDeliverables((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 shrink-0"><X size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setDeliverables((prev) => [...prev, ""])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Plus size={12} />Add deliverable</button>
      </div>

      <div className="space-y-2">
        <label className={labelCls}>Payment Milestones</label>
        {milestones.map((m, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input className={cn(inputCls, "flex-1")} value={m.label} placeholder="Label"
              onChange={(e) => setMilestones((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            <input className={cn(inputCls, "w-24")} type="number" value={m.amount} placeholder="Amount"
              onChange={(e) => setMilestones((prev) => prev.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} />
            <input className={cn(inputCls, "w-24")} value={m.due} placeholder="Due"
              onChange={(e) => setMilestones((prev) => prev.map((x, j) => j === i ? { ...x, due: e.target.value } : x))} />
            <button type="button" onClick={() => setMilestones((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 shrink-0"><X size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setMilestones((prev) => [...prev, { label: "", amount: 0, due: "" }])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Plus size={12} />Add milestone</button>
      </div>

      <div className="space-y-1.5 max-w-[200px]">
        <label className={labelCls}>Total Fees (KES)</label>
        <input className={inputCls} type="number" value={totalFees} onChange={(e) => setTotalFees(Number(e.target.value))} />
      </div>

      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

function SopEditor({ data, saving, onSave }: { data: Record<string, unknown>; saving: boolean; onSave: (d: Record<string, unknown>) => void }) {
  const [steps, setSteps] = useState<SopStep[]>((data.procedure_steps as SopStep[]) ?? []);

  function save() {
    onSave({ ...data, procedure_steps: steps });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={labelCls}>Procedure Steps</label>
        {steps.map((s, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <div className="flex-1 space-y-1">
              <input className={inputCls} value={s.step} placeholder="Step title"
                onChange={(e) => setSteps((prev) => prev.map((x, j) => j === i ? { ...x, step: e.target.value } : x))} />
              <input className={inputCls} value={s.description} placeholder="What to do"
                onChange={(e) => setSteps((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
            </div>
            <button type="button" onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 shrink-0 mt-1.5"><X size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setSteps((prev) => [...prev, { step: "", description: "" }])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Plus size={12} />Add step</button>
      </div>

      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}
