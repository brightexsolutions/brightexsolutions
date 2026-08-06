"use client";

/**
 * Document editor.
 *
 * Three panes: the sections down the left, the selected section's fields in the
 * middle, the rendered document on the right. The preview is the real renderer
 * behind an iframe, not an approximation, because a preview that is merely
 * similar is worse than none: it teaches you to trust something that is not
 * what the client receives.
 *
 * Two rules the UI enforces rather than explains:
 *   - a locked section (fixed legal clauses, derived figures) is read only
 *   - an accepted document is read only in full: at that point it is a record
 *     of what was agreed, and editing it would make every signature worthless
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Eye, EyeOff, GripVertical, Loader2, Lock, Sparkles, Trash2,
  RefreshCw, Save, Info, Monitor, Smartphone, Printer, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { DEFAULT_PAYMENT_SCHEDULE as HOUSE_TERMS } from "@/lib/document-html/blocks";
import { cn } from "@/lib/utils";
import type { BlockDocument, DocSection, Block, PaymentSchedule, ScheduleStage } from "@/lib/document-html/blocks";

type Viewport = "desktop" | "phone" | "print";

interface DocRow {
  id: string;
  title: string;
  reference_code: string | null;
  status: string;
  gated: boolean;
  gate_mode: string | null;
  accepted_at: string | null;
  data: BlockDocument;
  clients?: { name: string; company: string | null } | null;
}

// ─── Section row ────────────────────────────────────────────────────────────

function SectionRow({
  section, index, active, disabled, onSelect, onToggle,
}: {
  section: DocSection;
  index: number;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggle: (flags: { hidden?: boolean; gated?: boolean }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1.5 px-2 py-2 rounded border text-sm transition-colors ${
        active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
      } ${isDragging ? "opacity-60" : ""} ${section.hidden ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-grab active:cursor-grabbing"
        title={disabled ? "Locked" : "Drag to reorder"}
      >
        <GripVertical size={14} />
      </button>

      <button type="button" onClick={onSelect} className="flex-1 min-w-0 text-left">
        <span className="text-[10px] font-mono text-muted-foreground mr-1.5">
          {section.hidden ? "--" : String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-foreground">{section.title}</span>
        <span className="block text-[10px] text-muted-foreground mt-0.5">
          {section.blocks.length} block{section.blocks.length === 1 ? "" : "s"}
          {section.indicative ? " · not priced" : ""}
          {section.locked ? " · fixed" : ""}
        </span>
      </button>

      {section.locked ? (
        <Lock size={12} className="shrink-0 text-muted-foreground" />
      ) : (
        <>
          <button
            type="button"
            onClick={() => onToggle({ gated: !section.gated })}
            title={section.gated ? "Shown in full" : "Blur when gated"}
            className={`shrink-0 p-1 rounded hover:bg-muted ${section.gated ? "text-primary" : "text-muted-foreground/50"}`}
          >
            <ShieldCheck size={12} />
          </button>
          <button
            type="button"
            onClick={() => onToggle({ hidden: !section.hidden })}
            title={section.hidden ? "Hidden from the client" : "Visible"}
            className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
          >
            {section.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Block editors ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

/** A newline-separated list, which is the fastest way to edit one by hand and
 * survives paste from anywhere. */
function ListField({
  label, value, onChange, rows = 4, hint,
}: {
  label: string; value: string[]; onChange: (next: string[]) => void; rows?: number; hint?: string;
}) {
  return (
    <Field label={label}>
      <Textarea
        rows={rows}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
        className="text-sm font-normal"
      />
      <p className="text-[10px] text-muted-foreground mt-1">{hint ?? "One per line."}</p>
    </Field>
  );
}

function BlockEditor({ block, onChange, readOnly }: { block: Block; onChange: (b: Block) => void; readOnly: boolean }) {
  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch } as Block);

  if (readOnly) {
    return (
      <div className="text-xs text-muted-foreground p-3 rounded border border-dashed border-border">
        <Lock size={12} className="inline mr-1.5 -mt-0.5" />
        Fixed content: legal clauses and derived figures are not editable here.
      </div>
    );
  }

  switch (block.kind) {
    case "prose":
      return <ListField label="Paragraphs" value={block.paragraphs} rows={6}
        onChange={(paragraphs) => set({ paragraphs })} hint="One paragraph per line." />;

    case "exec_lede":
      return (
        <>
          <Field label="Lede">
            <Textarea rows={3} value={block.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <ListField label="Following paragraphs" value={block.paragraphs ?? []} rows={5}
            onChange={(paragraphs) => set({ paragraphs })} hint="One paragraph per line." />
        </>
      );

    case "kpi_row":
      return (
        <Field label="Headline figures">
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input value={item.value} placeholder="KES 180,000"
                onChange={(e) => set({ items: block.items.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
              <Input value={item.label} placeholder="Total investment"
                onChange={(e) => set({ items: block.items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
            </div>
          ))}
        </Field>
      );

    case "cards_grid":
      return (
        <Field label="Cards">
          {block.cards.map((card, i) => (
            <div key={i} className="mb-3 p-2 rounded border border-border">
              <Input className="mb-1.5" value={card.title} placeholder="Card title"
                onChange={(e) => set({ cards: block.cards.map((c, j) => j === i ? { ...c, title: e.target.value } : c) })} />
              <Textarea rows={2} value={card.body ?? ""} placeholder="One or two sentences"
                onChange={(e) => set({ cards: block.cards.map((c, j) => j === i ? { ...c, body: e.target.value } : c) })} />
            </div>
          ))}
        </Field>
      );

    case "arrow_list":
      return <ListField label="Items" value={block.items} onChange={(items) => set({ items })} />;

    case "chips":
      return <ListField label="Chips" value={block.items} onChange={(items) => set({ items })} />;

    case "key_value_list":
      return (
        <Field label="Label and detail">
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input className="w-1/3" value={item.label}
                onChange={(e) => set({ items: block.items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
              <Input value={item.detail}
                onChange={(e) => set({ items: block.items.map((x, j) => j === i ? { ...x, detail: e.target.value } : x) })} />
            </div>
          ))}
        </Field>
      );

    case "phases":
      return (
        <Field label="Delivery phases">
          {block.phases.map((phase, i) => (
            <div key={i} className="mb-3 p-2 rounded border border-border">
              <div className="flex gap-2 mb-1.5">
                <Input value={phase.name} placeholder="Phase 1: Discover"
                  onChange={(e) => set({ phases: block.phases.map((p, j) => j === i ? { ...p, name: e.target.value } : p) })} />
                <Input className="w-32" value={phase.duration} placeholder="Week 1"
                  onChange={(e) => set({ phases: block.phases.map((p, j) => j === i ? { ...p, duration: e.target.value } : p) })} />
              </div>
              <Textarea rows={3} value={phase.items.join("\n")}
                onChange={(e) => set({ phases: block.phases.map((p, j) => j === i
                  ? { ...p, items: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } : p) })} />
            </div>
          ))}
        </Field>
      );

    case "scope_3col":
      return (
        <>
          <ListField label="Included" value={block.included} onChange={(included) => set({ included })} />
          <ListField label="Not included" value={block.excluded} onChange={(excluded) => set({ excluded })} />
          <ListField label="Needed from the client" value={block.neededFromClient}
            onChange={(neededFromClient) => set({ neededFromClient })} />
        </>
      );

    case "phased_investment_table":
    case "investment_table": {
      const rows = block.rows as { phase?: string; desc: string; amount: string }[];
      const isPhased = block.kind === "phased_investment_table";
      const numeric = rows.map((r) => Number((r.amount.split("-")[0] ?? "").replace(/[^\d.]/g, "")) || 0);
      const sum = numeric.reduce((a, b) => a + b, 0);
      const anyRanged = rows.some((r) => r.amount.includes("-"));
      return (
        <Field label="Investment">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 mb-2">
              {isPhased && (
                <Input className="w-24" value={row.phase ?? ""} placeholder="Phase 1"
                  onChange={(e) => set({ rows: rows.map((r, j) => j === i ? { ...r, phase: e.target.value } : r) } as Partial<Block>)} />
              )}
              <Input value={row.desc} placeholder="What this covers"
                onChange={(e) => set({ rows: rows.map((r, j) => j === i ? { ...r, desc: e.target.value } : r) } as Partial<Block>)} />
              <Input className="w-36" value={row.amount} placeholder="15,000 - 20,000"
                onChange={(e) => set({ rows: rows.map((r, j) => j === i ? { ...r, amount: e.target.value } : r) } as Partial<Block>)} />
            </div>
          ))}
          <div className="flex gap-2 items-center mt-2 pt-2 border-t border-border">
            <Input className="flex-1" value={block.total.label}
              onChange={(e) => set({ total: { ...block.total, label: e.target.value } })} />
            <Input className="w-36" value={block.total.amount}
              onChange={(e) => set({ total: { ...block.total, amount: e.target.value } })} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-start gap-1">
            <Info size={11} className="mt-0.5 shrink-0" />
            {anyRanged
              ? "Ranges are fine in a proposal. A final figure is confirmed after acceptance, before the agreement exists."
              : `Rows add up to ${sum.toLocaleString("en-KE")}. Check the total matches.`}
          </p>
        </Field>
      );
    }

    case "timeline":
      return (
        <Field label="Timeline">
          {block.rows.map((row, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input className="w-28" value={row.week} placeholder="Week 1"
                onChange={(e) => set({ rows: block.rows.map((r, j) => j === i ? { ...r, week: e.target.value } : r) })} />
              <Input className="w-40" value={row.title} placeholder="Discover"
                onChange={(e) => set({ rows: block.rows.map((r, j) => j === i ? { ...r, title: e.target.value } : r) })} />
              <Input value={row.desc} placeholder="What happens"
                onChange={(e) => set({ rows: block.rows.map((r, j) => j === i ? { ...r, desc: e.target.value } : r) })} />
            </div>
          ))}
        </Field>
      );

    case "steps":
      return (
        <Field label="Next steps">
          {block.steps.map((step, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input className="w-44" value={step.title}
                onChange={(e) => set({ steps: block.steps.map((s, j) => j === i ? { ...s, title: e.target.value } : s) })} />
              <Input value={step.desc}
                onChange={(e) => set({ steps: block.steps.map((s, j) => j === i ? { ...s, desc: e.target.value } : s) })} />
            </div>
          ))}
        </Field>
      );

    case "tiers":
      return (
        <Field label="Tiers">
          {block.tiers.map((tier, i) => (
            <div key={i} className="mb-3 p-2 rounded border border-border">
              <div className="flex gap-2 mb-1.5">
                <Input value={tier.name}
                  onChange={(e) => set({ tiers: block.tiers.map((t, j) => j === i ? { ...t, name: e.target.value } : t) })} />
                <Input className="w-40" value={String(tier.price)}
                  onChange={(e) => set({ tiers: block.tiers.map((t, j) => j === i ? { ...t, price: e.target.value } : t) })} />
              </div>
              <Textarea rows={3} value={tier.features.join("\n")}
                onChange={(e) => set({ tiers: block.tiers.map((t, j) => j === i
                  ? { ...t, features: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } : t) })} />
            </div>
          ))}
        </Field>
      );

    case "data_table":
      return (
        <>
          <ListField label="Column headings" value={block.headers} rows={3}
            onChange={(headers) => set({ headers })} hint="One heading per line." />
          <Field label="Rows">
            <Textarea rows={6} value={block.rows.map((r) => r.join(" | ")).join("\n")}
              onChange={(e) => set({ rows: e.target.value.split("\n").filter(Boolean).map((l) => l.split("|").map((c) => c.trim())) })} />
            <p className="text-[10px] text-muted-foreground mt-1">One row per line, cells separated by a pipe.</p>
          </Field>
        </>
      );

    case "scope_out":
      return (
        <>
          <Field label="Heading">
            <Input value={block.heading} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Out of scope">
            {block.rows.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input className="w-1/3" value={row.label}
                  onChange={(e) => set({ rows: block.rows.map((r, j) => j === i ? { ...r, label: e.target.value } : r) })} />
                <Textarea rows={2} value={row.detail}
                  onChange={(e) => set({ rows: block.rows.map((r, j) => j === i ? { ...r, detail: e.target.value } : r) })} />
              </div>
            ))}
          </Field>
        </>
      );

    case "note":
      return (
        <>
          {block.heading !== undefined && (
            <Field label="Heading">
              <Input value={block.heading} onChange={(e) => set({ heading: e.target.value })} />
            </Field>
          )}
          <Field label="Note">
            <Textarea rows={4} value={block.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          {block.items && (
            <ListField label="Points" value={block.items} onChange={(items) => set({ items })} />
          )}
        </>
      );

    case "about":
      return (
        <>
          <Field label="Lead paragraph">
            <Textarea rows={4} value={block.text} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <ListField label="Following paragraphs" value={block.paragraphs ?? []}
            onChange={(paragraphs) => set({ paragraphs })} hint="One paragraph per line." />
        </>
      );

    default:
      return (
        <div className="text-xs text-muted-foreground p-3 rounded border border-dashed border-border">
          This block has no form editor yet. It renders correctly and can be improved with AI.
        </div>
      );
  }
}


/**
 * Payment terms for this document.
 *
 * Set here, once, and everything downstream derives from it: the agreement's
 * milestone table and one invoice per stage. It is never offered to the client
 * as a choice, so this is the only place it is decided.
 *
 * Percentages must total exactly 100. A schedule that does not would produce
 * invoices that do not add up to the contract, and the client would find the
 * discrepancy on the final one.
 */
function PaymentTermsPanel({
  schedule, readOnly, saving, onSave,
}: {
  schedule: PaymentSchedule | undefined;
  readOnly: boolean;
  saving: boolean;
  onSave: (next: PaymentSchedule) => void;
}) {
  const [stages, setStages] = useState<ScheduleStage[]>(
    schedule?.stages ?? HOUSE_TERMS.stages
  );

  const total = stages.reduce((n, s) => n + (Number(s.percent) || 0), 0);
  const valid = total === 100 && stages.every((s) => s.label.trim().length > 0);
  const current = schedule?.stages ?? HOUSE_TERMS.stages;
  const dirty = JSON.stringify(stages) !== JSON.stringify(current);

  function update(i: number, patch: Partial<ScheduleStage>) {
    setStages((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  return (
    <Card className="p-3 mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Payment terms
      </p>
      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
        Your decision, not the client&apos;s. Whatever is set here becomes the agreement&apos;s
        milestone table and one invoice per stage.
      </p>

      {stages.map((stage, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <Input
            className="flex-1"
            value={stage.label}
            disabled={readOnly}
            placeholder="Deposit, to commence work"
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <Input
            className="w-16"
            type="number"
            value={String(stage.percent)}
            disabled={readOnly}
            onChange={(e) => update(i, { percent: Number(e.target.value) || 0 })}
          />
          <select
            className="w-40 rounded border border-input bg-background px-2 text-xs"
            value={stage.trigger}
            disabled={readOnly}
            onChange={(e) => update(i, { trigger: e.target.value as ScheduleStage["trigger"] })}
          >
            <option value="on_signature">On signature</option>
            <option value="on_milestone">At a milestone</option>
            <option value="on_completion">On completion</option>
            <option value="on_date">On a date</option>
          </select>
          {stages.length > 1 && !readOnly && (
            <button
              type="button"
              onClick={() => setStages((prev) => prev.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive px-1"
              title="Remove this stage"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2 mt-2">
        <span className={cn("text-[11px] font-medium", total === 100 ? "text-emerald-600" : "text-destructive")}>
          {total}% {total === 100 ? "" : "(must be exactly 100)"}
        </span>
        <div className="flex gap-2">
          {!readOnly && stages.length < 3 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStages((prev) => [...prev, { label: "", percent: 0, trigger: "on_milestone" }])}
            >
              Add stage
            </Button>
          )}
          {!readOnly && (
            <Button size="sm" disabled={!valid || !dirty || saving} onClick={() => onSave({ mode: stages.length > 2 ? "flexible" : "standard", stages })}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {dirty ? "Save terms" : "Saved"}
            </Button>
          )}
        </div>
      </div>

      {!schedule && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1">
          <Info size={11} className="mt-0.5 shrink-0" />
          This document states no terms, so the house 60/40 applies. Save to make it explicit.
        </p>
      )}
    </Card>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────

export function DocumentEditor({ documentId }: { documentId: string }) {
  const confirm = useConfirm();
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocSection | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  // Width of the editing column. The forms need more room than the preview on
  // some sections (an investment table, a phase list) and less on others, and
  // which is which depends on the document, so it is a drag rather than a
  // breakpoint.
  const [midWidth, setMidWidth] = useState(360);
  const [dragging, setDragging] = useState(false);

  const frameRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * Scrolls the preview to a section.
   *
   * The renderer gives every section an id of `s-<sectionId>`, so this is a
   * lookup rather than a guess. Same-origin, so reaching into the frame is
   * allowed; wrapped anyway because the frame may not have finished loading.
   */
  const scrollPreviewTo = useCallback((sectionId: string | null) => {
    if (!sectionId) return;
    try {
      const el = frameRef.current?.contentDocument?.getElementById(`s-${sectionId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // Cross-origin or not yet loaded: not worth surfacing.
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Drag on window rather than the handle, so the pointer leaving the 6px strip
  // mid-drag does not drop it. Clamped so neither pane can be dragged away.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setMidWidth((w) => {
        const next = w + e.movementX;
        return Math.min(Math.max(next, 280), Math.min(760, window.innerWidth - 520));
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    // Stops the iframe swallowing the drag and the page selecting text under it.
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging]);

  // Loading is a subscription to an external system (the API), so it belongs in
  // an effect, but the state updates happen in the promise callback rather than
  // synchronously in the effect body: the latter cascades renders.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/documents/${documentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json?.data) return;
        setDoc(json.data);
        setActiveId((current) => current ?? json.data.data?.sections?.[0]?.id ?? null);
      })
      .catch(() => { if (!cancelled) setError("Could not load this document."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [documentId]);

  const sections = useMemo(() => doc?.data?.sections ?? [], [doc]);
  const active = useMemo(() => sections.find((s) => s.id === activeId) ?? null, [sections, activeId]);
  const readOnly = !!doc?.accepted_at;

  // Adjusting state during render when the selected section changes: React's
  // documented alternative to an effect for this exact case.
  const activeKey = active ? `${active.id}:${JSON.stringify(active).length}` : null;
  if (activeKey !== draftFor) {
    setDraftFor(activeKey);
    setDraft(active ? structuredClone(active) : null);
  }

  const dirty = !!draft && !!active && JSON.stringify(draft) !== JSON.stringify(active);

  async function patch(body: Record<string, unknown>, successNote: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/admin/documents/${documentId}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.problems?.join("; ") || json.error || "Save failed");
      setDoc((d) => (d ? { ...d, data: json.data } : d));
      setPreviewKey((k) => k + 1);
      setNotice(successNote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function refine() {
    if (!activeId || !instruction.trim()) return;
    setRefining(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/admin/documents/${documentId}/refine-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: activeId, instruction: instruction.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not apply that");
      setDoc((d) => (d ? { ...d, data: json.data } : d));
      setPreviewKey((k) => k + 1);
      setInstruction("");
      setNotice("Section updated. Check the preview.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply that");
    } finally {
      setRefining(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active: a, over } = event;
    if (!over || a.id === over.id) return;
    const ids = sections.map((s) => s.id);
    const next = arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id)));
    void patch({ order: next }, "Reordered.");
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" size={16} />Loading…</div>;
  }
  if (!doc?.data?.sections) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">
          This document is not section based, so it cannot be edited here.
        </p>
        <Link href="/admin/documents" className="text-sm text-primary underline mt-2 inline-block">Back to documents</Link>
      </div>
    );
  }

  const previewSrc = `/api/admin/documents/${documentId}/view${viewport === "print" ? "?print=1" : ""}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
        <Link href="/admin/documents" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-bold truncate">{doc.title}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {[doc.reference_code, doc.clients?.company || doc.clients?.name, doc.status].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(["desktop", "phone", "print"] as Viewport[]).map((v) => (
            <button key={v} type="button" onClick={() => setViewport(v)} title={v}
              className={`p-1.5 rounded ${viewport === v ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
              {v === "desktop" ? <Monitor size={14} /> : v === "phone" ? <Smartphone size={14} /> : <Printer size={14} />}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setPreviewKey((k) => k + 1)}>
            <RefreshCw size={13} />
          </Button>
        </div>
      </div>

      {readOnly && (
        <div className="px-5 py-2 bg-emerald-400/10 text-emerald-700 text-xs shrink-0">
          This document was accepted on {new Date(doc.accepted_at!).toLocaleDateString("en-KE")}. It is a record of what was
          agreed and can no longer be edited. Create a new document if terms have changed.
        </div>
      )}
      {error && <div className="px-5 py-2 bg-destructive/10 text-destructive text-xs shrink-0">{error}</div>}
      {notice && <div className="px-5 py-2 bg-primary/10 text-primary text-xs shrink-0">{notice}</div>}

      <div
        className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[240px_var(--mid)_6px_1fr]"
        style={{ ["--mid" as string]: `${midWidth}px` }}
      >
        {/* Sections */}
        <div className="border-r border-border overflow-y-auto p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1.5">Sections</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section, i) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  index={sections.filter((s, j) => !s.hidden && j < i).length}
                  active={section.id === activeId}
                  disabled={readOnly || !!section.locked}
                  onSelect={() => { setActiveId(section.id); scrollPreviewTo(section.id); }}
                  onToggle={(flags) => void patch({ flags: { [section.id]: flags } }, "Updated.")}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Section editor. Keyed on the section's identity AND its server content,
            so selecting a different section, or a save landing, remounts the form
            and reinitialises it from props rather than syncing state in an effect. */}
        <div className="border-r border-border overflow-y-auto p-4"
             key={active ? `${active.id}:${JSON.stringify(active).length}` : "none"}>
          <PaymentTermsPanel
            schedule={doc.data.schedule}
            readOnly={readOnly}
            saving={saving}
            onSave={(schedule) => void patch({ schedule }, "Payment terms saved.")}
          />

          {!draft ? (
            <p className="text-sm text-muted-foreground">Select a section.</p>
          ) : (
            <>
              <Field label="Section title">
                <Input value={draft.title} disabled={readOnly || !!draft.locked}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="Kicker">
                <Input value={draft.tag} disabled={readOnly || !!draft.locked}
                  onChange={(e) => setDraft({ ...draft, tag: e.target.value })} />
              </Field>

              {draft.blocks.map((block, i) => (
                <Card key={block.id} className="p-3 mb-3">
                  <p className="text-[10px] font-mono text-muted-foreground mb-2">{block.kind}</p>
                  <BlockEditor
                    block={block}
                    readOnly={readOnly || !!draft.locked}
                    onChange={(next) => setDraft({ ...draft, blocks: draft.blocks.map((b, j) => (j === i ? next : b)) })}
                  />
                </Card>
              ))}

              {!readOnly && !draft.locked && (
                <>
                  <div className="flex gap-2 sticky bottom-0 bg-background py-2">
                    <Button size="sm" disabled={!dirty || saving}
                      onClick={() => void patch({ section: draft }, "Saved.")}>
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {dirty ? "Save section" : "Saved"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={saving}
                      onClick={async () => {
                        if (!await confirm({ message: `Remove "${draft.title}" from this document?` })) return;
                        void patch({ removeId: draft.id }, "Section removed.");
                      }}>
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Improve this section
                    </label>
                    <Textarea rows={2} value={instruction} placeholder='e.g. "make the tone warmer", "add a bullet about accessibility"'
                      onChange={(e) => setInstruction(e.target.value)} />
                    <Button size="sm" className="mt-2" disabled={refining || !instruction.trim()} onClick={() => void refine()}>
                      {refining ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      Apply with AI
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Only this section is sent, and block structure is restored afterwards, so nothing else can change.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Drag handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the editing column"
          onMouseDown={() => setDragging(true)}
          onDoubleClick={() => setMidWidth(360)}
          title="Drag to resize, double-click to reset"
          className={`hidden lg:block cursor-col-resize border-r border-border transition-colors ${
            dragging ? "bg-primary/40" : "bg-transparent hover:bg-primary/20"
          }`}
        />

        {/* Preview */}
        <div className="bg-muted/20 overflow-hidden relative">
          <div className={`h-full mx-auto transition-all ${viewport === "phone" ? "max-w-[390px] border-x border-border" : ""}`}>
            <iframe
              ref={frameRef}
              key={previewKey}
              src={previewSrc}
              title="Preview"
              className="w-full h-full border-0"
              onLoad={() => scrollPreviewTo(activeId)}
            />
          </div>
          {viewport === "print" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-brand-navy/90 text-white text-[10px] font-semibold shadow-lg">
              Print view: should be A4 and full width
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
