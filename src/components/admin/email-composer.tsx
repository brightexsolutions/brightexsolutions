"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, X, Paperclip, Sparkles, CheckCircle2, Bold, Underline as UnderlineIcon, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { compressImageClientSide } from "@/lib/compress-client";

const SENDER_OPTIONS = [
  { value: "info", label: "Info (general)" },
  { value: "bookings", label: "Bookings" },
  { value: "support", label: "Support" },
  { value: "payments", label: "Payments" },
  { value: "updates", label: "Updates" },
] as const;

const PURPOSE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "project_update", label: "Project update" },
  { value: "invoice_reminder", label: "Invoice reminder" },
  { value: "payment_receipt", label: "Payment receipt" },
] as const;

type Purpose = (typeof PURPOSE_OPTIONS)[number]["value"];

type ClientOption = { id: string; name: string; email?: string | null; company?: string | null };
type InvoiceOption = {
  id: string; invoice_number: string; total: number; status: string; due_date?: string | null;
  payments?: { amount: number; date: string }[];
};
type DealOption = { id: string; service?: string | null; status: string };

function outstandingOf(inv: InvoiceOption): number {
  const paid = (inv.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  return Math.max(0, Number(inv.total) - paid);
}

function latestPaymentAmount(inv: InvoiceOption): number {
  const payments = inv.payments ?? [];
  if (!payments.length) return Number(inv.total);
  return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].amount;
}

export interface EmailComposerRecipient {
  clientId?: string;
  name: string;
  email: string;
}

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-filled recipient (client detail panel). Omit to show a client picker (Communications page). */
  recipient?: EmailComposerRecipient | null;
  /** A generated document (proposal/agreement) to link on open — the body is
   * pre-filled with a public view link rather than a file attachment, so
   * the client always sees the same rich page you reviewed. */
  linkDocument?: { id: string; title: string } | null;
  /** Pre-fills the "General" purpose note (the context "Write with AI" drafts
   * from) — e.g. a summary of the intake submission being replied to, so the
   * AI draft is grounded in what the client actually asked, not blank. */
  initialContext?: string;
  /** Pre-fills the subject line — e.g. "Re: Your Website enquiry". */
  initialSubject?: string;
  onSent?: () => void;
}

// Combined attachment budget — comfortably under typical serverless request-body limits.
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

function firstName(name: string): string {
  return name.trim().split(" ")[0] || name;
}

export function EmailComposer({ open, onClose, recipient: initialRecipient, linkDocument, initialContext, initialSubject, onSent }: EmailComposerProps) {
  const [recipient, setRecipient] = useState<EmailComposerRecipient | null>(initialRecipient ?? null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [customRecipient, setCustomRecipient] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const [sender, setSender] = useState<string>("info");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [purpose, setPurpose] = useState<Purpose>("general");
  const [purposeNote, setPurposeNote] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [projectNameManual, setProjectNameManual] = useState("");

  const [attachments, setAttachments] = useState<{ file: File; base64: string }[]>([]);
  const [attaching, setAttaching] = useState(false);

  const [drafting, setDrafting] = useState(false);
  const [draftSource, setDraftSource] = useState<"ai" | "template" | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Reset state whenever the panel opens fresh
  useEffect(() => {
    if (!open) return;
    setRecipient(initialRecipient ?? null);
    setCustomRecipient(false);
    setCustomName("");
    setCustomEmail("");
    setSender("info");
    setSubject(initialSubject ?? (linkDocument ? linkDocument.title : ""));
    setPurpose("general");
    setPurposeNote(initialContext ?? "");
    setSelectedInvoiceId("");
    setSelectedDealId("");
    setProjectNameManual("");
    setAttachments([]);
    setDraftSource(null);
    setSent(false);
    setError("");
    setBody(
      initialRecipient
        ? `Hi ${firstName(initialRecipient.name)},\n\n${linkDocument ? `Please find your ${linkDocument.title} below, or as a PDF attached for your records.\n\n` : ""}— The Brightex Team`
        : ""
    );
  }, [open, initialRecipient, linkDocument, initialContext, initialSubject]);

  // Standalone mode (Communications page): load the client list to pick from
  useEffect(() => {
    if (!open || initialRecipient) return;
    fetch("/api/admin/clients").then((r) => r.json()).then((j) => setClients(j.data ?? [])).catch(() => {});
  }, [open, initialRecipient]);

  // Whenever we have a client (pre-filled or picked), load their invoices/deals for AI context
  useEffect(() => {
    if (!recipient?.clientId) { setInvoices([]); setDeals([]); return; }
    fetch(`/api/admin/invoices?client_id=${recipient.clientId}`).then((r) => r.json()).then((j) => setInvoices(j.data ?? [])).catch(() => {});
    fetch(`/api/admin/sales?client_id=${recipient.clientId}`).then((r) => r.json()).then((j) => setDeals(j.data ?? [])).catch(() => {});
  }, [recipient?.clientId]);

  function pickClient(clientId: string) {
    if (clientId === "__custom__") {
      setCustomRecipient(true);
      setRecipient(null);
      return;
    }
    const c = clients.find((x) => x.id === clientId);
    if (!c || !c.email) return;
    setCustomRecipient(false);
    setRecipient({ clientId: c.id, name: c.name, email: c.email });
    setBody(`Hi ${firstName(c.name)},\n\n\n\n— The Brightex Team`);
  }

  function applyCustomRecipient(name: string, email: string) {
    setCustomName(name);
    setCustomEmail(email);
    if (name.trim() && /\S+@\S+\.\S+/.test(email)) {
      setRecipient({ name: name.trim(), email: email.trim() });
    } else {
      setRecipient(null);
    }
  }

  const overdueInvoices = useMemo(
    () => invoices.filter((i) => i.status === "overdue" || (i.status === "sent" && i.due_date && new Date(i.due_date) < new Date())),
    [invoices]
  );
  const reminderCandidates = overdueInvoices.length ? overdueInvoices : invoices.filter((i) => i.status === "sent");
  const receiptCandidates = invoices;

  useEffect(() => {
    if (purpose === "invoice_reminder" && !selectedInvoiceId && reminderCandidates.length) {
      setSelectedInvoiceId(reminderCandidates[0].id);
    }
    if (purpose === "payment_receipt" && !selectedInvoiceId && receiptCandidates.length) {
      setSelectedInvoiceId(receiptCandidates[0].id);
    }
    if (purpose === "project_update" && !selectedDealId && deals.length) {
      setSelectedDealId(deals[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose, invoices, deals]);

  async function draftWithAI() {
    if (!recipient) { setError("Choose a recipient first."); return; }
    setDrafting(true);
    setError("");
    setDraftSource(null);
    try {
      let payload: Record<string, unknown> | null = null;

      if (purpose === "general") {
        if (!purposeNote.trim()) { setError("Add a quick note on what this email should cover."); return; }
        payload = { intent: "draft_reply", clientName: recipient.name, context: purposeNote, tone: "warm", subject: subject || undefined };
      } else if (purpose === "invoice_reminder") {
        const inv = invoices.find((i) => i.id === selectedInvoiceId);
        if (!inv) { setError("No invoice found to remind about."); return; }
        const daysOverdue = inv.due_date ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000)) : 0;
        // Remind for what's actually still owed, not the invoice's original total — a
        // partially-paid invoice must never ask the client to pay the full amount again.
        payload = { intent: "draft_reminder", clientName: recipient.name, invoiceNumber: inv.invoice_number, total: `KES ${outstandingOf(inv).toLocaleString()}`, daysOverdue };
      } else if (purpose === "payment_receipt") {
        const inv = invoices.find((i) => i.id === selectedInvoiceId);
        if (!inv) { setError("Choose which invoice this receipt is for."); return; }
        // A receipt confirms the payment just received, not the invoice's total value.
        payload = { intent: "draft_receipt_email", clientName: recipient.name, amount: `KES ${latestPaymentAmount(inv).toLocaleString()}`, invoiceNumber: inv.invoice_number };
      } else if (purpose === "project_update") {
        const deal = deals.find((d) => d.id === selectedDealId);
        const projectName = deal?.service || projectNameManual;
        if (!projectName) { setError("Add a project name."); return; }
        if (!purposeNote.trim()) { setError("Add a quick note on the update."); return; }
        payload = { intent: "draft_project_update", clientName: recipient.name, projectName, updateSummary: purposeNote };
      }

      if (!payload) return;

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.result) {
        setBody(typeof data.result === "string" ? data.result : JSON.stringify(data.result));
        setDraftSource(data.source === "template" ? "template" : "ai");
        if (!subject) {
          const subjectByPurpose: Record<Purpose, string> = {
            general: "Following up",
            project_update: "Project update",
            invoice_reminder: `Payment reminder — Invoice ${invoices.find((i) => i.id === selectedInvoiceId)?.invoice_number ?? ""}`,
            payment_receipt: "Payment received — thank you",
          };
          setSubject(subjectByPurpose[purpose]);
        }
      } else {
        setError(data.error ?? "AI draft failed. Try again.");
      }
    } catch {
      setError("Network error while drafting.");
    } finally {
      setDrafting(false);
    }
  }

  async function handleAttach(files: FileList | null) {
    if (!files || !files.length) return;
    setAttaching(true);
    setError("");
    try {
      const currentTotal = attachments.reduce((sum, a) => sum + a.file.size, 0);
      const incoming = await Promise.all(Array.from(files).map((f) => compressImageClientSide(f)));
      const newTotal = currentTotal + incoming.reduce((sum, f) => sum + f.size, 0);
      if (newTotal > MAX_ATTACHMENT_BYTES) {
        setError(`Attachments too large — max ${(MAX_ATTACHMENT_BYTES / 1024 / 1024).toFixed(0)}MB combined.`);
        return;
      }
      const encoded = await Promise.all(
        incoming.map(
          (file) =>
            new Promise<{ file: File; base64: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                resolve({ file, base64: result.split(",")[1] ?? "" });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );
      setAttachments((prev) => [...prev, ...encoded]);
    } catch {
      setError("Failed to read attachment.");
    } finally {
      setAttaching(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // Wraps the current selection with a formatting mark (**bold**, __underline__).
  // Sent through emailBodyFromPlainText() at send time to become real HTML.
  function wrapSelection(mark: string, placeholder: string) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end) || placeholder;
    const newValue = value.slice(0, start) + mark + selected + mark + value.slice(end);
    setBody(newValue);
    setDraftSource(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + mark.length, start + mark.length + selected.length);
    });
  }

  // Toggles "- " bullets on every non-blank line the selection touches.
  function toggleBulletList() {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIdx = value.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const allBulleted = lines.every((l) => l.trim() === "" || l.startsWith("- "));
    const newBlock = lines
      .map((l) => (l.trim() === "" ? l : allBulleted ? l.replace(/^- /, "") : l.startsWith("- ") ? l : `- ${l}`))
      .join("\n");
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    setBody(newValue);
    setDraftSource(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + newBlock.length);
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient?.email || !subject.trim() || !body.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: recipient.clientId,
          type: "email",
          subject,
          body,
          direction: "out",
          send_email: true,
          to_email: recipient.email,
          to_name: recipient.name,
          sender,
          attachments: attachments.map((a) => ({
            filename: a.file.name,
            contentType: a.file.type || "application/octet-stream",
            base64: a.base64,
          })),
          documentLink: linkDocument ? { id: linkDocument.id } : undefined,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to send email");
      }
      setSent(true);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const canPickClient = !initialRecipient;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden p-0" side="right">
        <div className="px-5 py-4 border-b border-border bg-muted/30 shrink-0 flex items-center justify-between">
          <SheetTitle className="font-display text-base font-bold text-foreground">Compose Email</SheetTitle>
          <button onClick={onClose} className="w-7 h-7 rounded-sm hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-sm font-medium text-foreground">Email sent to {recipient?.name}.</p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex-1 overflow-y-auto flex flex-col">
            <div className="px-5 py-4 space-y-4 flex-1">
              {/* To */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">To</label>
                {canPickClient ? (
                  customRecipient ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={customName}
                          onChange={(e) => applyCustomRecipient(e.target.value, customEmail)}
                          placeholder="Recipient name"
                          required
                          className="flex-1 px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <input
                          type="email"
                          value={customEmail}
                          onChange={(e) => applyCustomRecipient(customName, e.target.value)}
                          placeholder="email@example.com"
                          required
                          className="flex-1 px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setCustomRecipient(false); setCustomName(""); setCustomEmail(""); setRecipient(null); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Choose an existing client instead
                      </button>
                    </div>
                  ) : (
                    <select
                      value={recipient?.clientId ?? ""}
                      onChange={(e) => pickClient(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="" disabled>Select a client…</option>
                      {clients.filter((c) => c.email).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.company ? ` — ${c.company}` : ""} ({c.email})
                        </option>
                      ))}
                      <option value="__custom__">Other / custom email…</option>
                    </select>
                  )
                ) : (
                  <div className="px-3 py-2 rounded-sm border border-input bg-muted/30 text-sm text-foreground">
                    {recipient?.name} <span className="text-muted-foreground">&lt;{recipient?.email}&gt;</span>
                  </div>
                )}
              </div>

              {/* From department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">From</label>
                <select
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {SENDER_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  required
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* AI purpose */}
              <div className="space-y-2 p-3 rounded-sm border border-dashed border-border bg-muted/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Draft with AI</label>
                  {draftSource && (
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        draftSource === "ai" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {draftSource === "ai" ? "AI draft" : "Template (AI unavailable)"}
                    </span>
                  )}
                </div>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as Purpose)}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {PURPOSE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                {(purpose === "invoice_reminder" || purpose === "payment_receipt") && (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="" disabled>Select an invoice…</option>
                    {(purpose === "invoice_reminder" ? reminderCandidates : receiptCandidates).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — KES {outstandingOf(inv).toLocaleString()} outstanding of {Number(inv.total).toLocaleString()} ({inv.status})
                      </option>
                    ))}
                  </select>
                )}

                {purpose === "project_update" &&
                  (deals.length ? (
                    <select
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                      className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>{d.service ?? "Project"}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={projectNameManual}
                      onChange={(e) => setProjectNameManual(e.target.value)}
                      placeholder="Project name"
                      className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  ))}

                {(purpose === "general" || purpose === "project_update") && (
                  <textarea
                    value={purposeNote}
                    onChange={(e) => setPurposeNote(e.target.value)}
                    placeholder={purpose === "general" ? "What should this email say?" : "What's the update?"}
                    rows={2}
                    className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}

                <button
                  type="button"
                  onClick={draftWithAI}
                  disabled={drafting || !recipient}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-sm border border-brand-gold/40 text-brand-gold text-xs font-semibold hover:bg-brand-gold/10 transition-colors disabled:opacity-50"
                >
                  {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {drafting ? "Drafting…" : "Draft with AI"}
                </button>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Message</label>
                <div className="flex items-center gap-1 border border-input rounded-sm bg-muted/20 p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => wrapSelection("**", "bold text")}
                    title="Bold"
                    className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection("__", "underlined text")}
                    title="Underline"
                    className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <UnderlineIcon size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleBulletList}
                    title="Bullet list"
                    className="w-7 h-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <List size={13} />
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setDraftSource(null); }}
                  required
                  rows={10}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring font-sans leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Select text and use the buttons above for <strong>**bold**</strong> or <strong>__underline__</strong>; start a line with &quot;- &quot; for a bulleted list. Plain URLs are made clickable automatically.
                </p>
              </div>

              {linkDocument && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-sm border border-teal-600/30 bg-teal-600/5 text-xs text-teal-700 dark:text-teal-400">
                  <Paperclip size={12} className="shrink-0" />
                  A &quot;View {linkDocument.title}&quot; button and a PDF copy of it will be added to this email automatically.
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Attachments</label>
                <div className="space-y-1.5">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm border border-border bg-muted/10">
                      <span className="text-xs text-foreground truncate">{a.file.name}</span>
                      <button type="button" onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-sm px-2.5 py-1.5 cursor-pointer transition-colors">
                  <Paperclip size={12} />
                  {attaching ? "Attaching…" : "Attach file"}
                  <input type="file" multiple className="hidden" disabled={attaching} onChange={(e) => handleAttach(e.target.files)} />
                </label>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-sm border border-input text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !recipient}
                className="flex-1 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
