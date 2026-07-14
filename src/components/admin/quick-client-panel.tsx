"use client";

import { useState, useEffect } from "react";
import {
  X, Mail, Phone, MessageSquare, Send, AlertCircle,
  FileText, TrendingUp, Clock, CheckCircle2, Loader2,
  ExternalLink, ClipboardList, Copy, ClipboardCheck, Eye,
  RefreshCw, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { whatsappUrl } from "@/lib/constants";
import { IntakeDetailSheet, type IntakeDetail } from "@/components/admin/intake-detail-sheet";

type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  classification: string;
  notes?: string;
  last_contacted_at?: string;
  intake_token?: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  due_date?: string;
  sent_at?: string | null;
};

type Deal = {
  id: string;
  service?: string;
  estimated_value?: number;
  status: string;
};

type Comm = {
  id: string;
  type: string;
  subject?: string;
  direction: string;
  status: string;
  sent_at: string;
};

type Intake = IntakeDetail;

type ClientDetail = {
  client: Client;
  invoices: Invoice[];
  deals: Deal[];
  comms: Comm[];
  intakes: Intake[];
};

const classColour: Record<string, string> = {
  active: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  qualified: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  lead: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  ghost: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400",
  past: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400",
  unqualified: "text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
};

const invoiceStatusColour: Record<string, string> = {
  overdue: "text-red-500",
  sent: "text-amber-500",
  paid: "text-emerald-500",
  draft: "text-muted-foreground",
};

export function QuickClientPanel({
  clientId,
  onClose,
}: {
  clientId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "comms">("overview");
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [intakeLinkCopied, setIntakeLinkCopied] = useState(false);
  const [markingIntakeId, setMarkingIntakeId] = useState<string | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<IntakeDetail | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [sentInvoiceIds, setSentInvoiceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clientId) { setDetail(null); return; }
    setLoading(true);
    setComposing(false);
    setSent(false);
    setActiveTab("overview");

    Promise.all([
      fetch(`/api/admin/clients/${clientId}`).then((r) => r.json()),
      fetch(`/api/admin/invoices?client_id=${clientId}`).then((r) => r.json()),
      fetch(`/api/admin/sales?client_id=${clientId}`).then((r) => r.json()),
      fetch(`/api/admin/communications?client_id=${clientId}`).then((r) => r.json()),
      fetch(`/api/admin/clients/${clientId}/intakes`).then((r) => r.json()),
    ]).then(([clientRes, invRes, dealRes, commRes, intakeRes]) => {
      setDetail({
        client: clientRes.data ?? clientRes,
        invoices: invRes.data ?? [],
        deals: dealRes.data ?? [],
        comms: commRes.data ?? [],
        intakes: intakeRes.data ?? [],
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!detail?.client.email || !subject || !body) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          type: "email",
          subject,
          body,
          direction: "out",
          send_email: true,
          to_email: detail.client.email,
          to_name: detail.client.name,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to send email");
      }

      setSent(true);
      setSubject("");
      setBody("");
      setComposing(false);
    } catch (error) {
      console.error("[quick-client-panel]", error);
      alert(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const client = detail?.client;
  const overdueInvoices = (detail?.invoices ?? []).filter((i) => i.status === "overdue" || (i.status === "sent" && i.due_date && new Date(i.due_date) < new Date()));
  const openDeals = (detail?.deals ?? []).filter((d) => !["won", "lost"].includes(d.status));

  async function copyIntakeLink() {
    const token = client?.intake_token;
    if (!token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/intake/${token}`);
    setIntakeLinkCopied(true);
    setTimeout(() => setIntakeLinkCopied(false), 2000);
  }

  async function markIntakeReviewed(intakeId: string) {
    if (!clientId) return;
    setMarkingIntakeId(intakeId);
    try {
      await fetch(`/api/admin/clients/${clientId}/intakes?intakeId=${intakeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      setDetail((prev) => prev ? {
        ...prev,
        intakes: prev.intakes.map((i) => i.id === intakeId ? { ...i, status: "reviewed" } : i),
      } : prev);
      setSelectedIntake((prev) => prev && prev.id === intakeId ? { ...prev, status: "reviewed" } : prev);
    } finally {
      setMarkingIntakeId(null);
    }
  }

  async function sendInvoice(invoiceId: string) {
    setSendingInvoiceId(invoiceId);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/send`, { method: "POST" });
      if (res.ok) {
        setSentInvoiceIds((prev) => new Set(prev).add(invoiceId));
        setDetail((prev) => prev ? {
          ...prev,
          invoices: prev.invoices.map((inv) =>
            inv.id === invoiceId ? { ...inv, status: inv.status === "draft" ? "sent" : inv.status, sent_at: new Date().toISOString() } : inv
          ),
        } : prev);
      }
    } finally {
      setSendingInvoiceId(null);
    }
  }

  const intakeStatusColour: Record<string, string> = {
    new: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
    reviewed: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    archived: "text-muted-foreground bg-muted",
  };

  const serviceTypeLabel: Record<string, string> = {
    website: "Website / Web App", mobile: "Mobile App", erp: "Software / ERP",
    design: "Design & Branding", consultancy: "Consultancy", other: "Other",
  };

  return (
    <>
    <Sheet open={!!clientId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-hidden p-0" side="right">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : !client ? null : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 text-sm font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="font-display text-base font-bold text-foreground leading-tight truncate">
                      {client.name}
                    </SheetTitle>
                    {client.company && (
                      <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                    )}
                    <span className={cn("inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize",
                      classColour[client.classification] ?? "bg-muted text-muted-foreground")}>
                      {client.classification}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="shrink-0 w-7 h-7 rounded-sm hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-border px-5">
              {(["overview", "comms"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-2.5 mr-5 text-xs font-semibold border-b-2 -mb-px transition-colors capitalize",
                    activeTab === tab
                      ? "border-brand-gold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "comms" ? `Communications${(detail?.comms ?? []).length > 0 ? ` (${(detail?.comms ?? []).length})` : ""}` : "Overview"}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">

              {/* ── Overview tab ─────────────────────────────── */}
              {activeTab === "overview" && (<>

              {/* Contact quick-actions */}
              <section className="px-5 py-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Contact</h3>
                <div className="space-y-2">
                  {client.email && (
                    <div className="flex items-center justify-between gap-3">
                      <a href={`mailto:${client.email}`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-brand-gold transition-colors truncate">
                        <Mail size={13} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                      <button onClick={() => { setComposing(true); setSent(false); }}
                        className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-sm px-2 py-1 hover:bg-muted transition-colors">
                        <Send size={10} />Compose
                      </button>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center justify-between gap-3">
                      <a href={`tel:${client.phone}`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-brand-gold transition-colors">
                        <Phone size={13} className="text-muted-foreground shrink-0" />
                        {client.phone}
                      </a>
                      <a href={whatsappUrl(`Hi ${client.name.split(" ")[0]}, this is the Brightex team reaching out.`)}
                        target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600 border border-border rounded-sm px-2 py-1 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors">
                        <MessageSquare size={10} />WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* Compose email */}
              {composing && (
                <section className="px-5 py-4 bg-muted/20">
                  {sent ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 size={14} />Email sent successfully.
                    </div>
                  ) : (
                    <form onSubmit={sendEmail} className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Compose Email</p>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                        required
                        className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={`Hi ${client.name.split(" ")[0]},`}
                        required
                        rows={4}
                        className="w-full px-3 py-2 rounded-sm border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setComposing(false)}
                          className="flex-1 py-2 rounded-sm border border-input text-sm text-muted-foreground hover:bg-muted transition-colors">
                          Cancel
                        </button>
                        <button type="submit" disabled={sending}
                          className="flex-1 py-2 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          {sending ? "Sending…" : "Send"}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              )}

              {/* Pending actions */}
              {(overdueInvoices.length > 0 || openDeals.length > 0) && (
                <section className="px-5 py-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Pending Actions
                  </h3>
                  <div className="space-y-2">
                    {overdueInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-start gap-2 p-2.5 rounded-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                        <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-red-700 dark:text-red-400">
                            Invoice {inv.invoice_number} overdue
                          </p>
                          <p className="text-[11px] text-red-500">
                            KES {Number(inv.total).toLocaleString()} · {inv.status}
                          </p>
                        </div>
                      </div>
                    ))}
                    {openDeals.map((deal) => (
                      <div key={deal.id} className="flex items-start gap-2 p-2.5 rounded-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                        <TrendingUp size={13} className="text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Open deal: {deal.service ?? "—"}
                          </p>
                          <p className="text-[11px] text-amber-500 capitalize">{deal.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent communications */}
              {(detail?.comms ?? []).length > 0 && (
                <section className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Recent Comms</h3>
                    {(detail?.comms ?? []).length > 3 && (
                      <button
                        onClick={() => setActiveTab("comms")}
                        className="text-[10px] text-muted-foreground hover:text-brand-gold transition-colors"
                      >
                        View all {(detail?.comms ?? []).length}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(detail?.comms ?? []).slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                          c.direction === "out" ? "bg-brand-gold" : "bg-emerald-500")} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{c.subject ?? c.type}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.direction === "out" ? "Sent" : "Received"} ·{" "}
                            {new Date(c.sent_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Documents (Invoices) */}
              {(detail?.invoices ?? []).length > 0 && (
                <section className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <FileText size={11} />Documents
                    </h3>
                    <a
                      href={`/admin/invoices?client_id=${client.id}`}
                      className="text-[10px] text-muted-foreground hover:text-brand-gold transition-colors"
                    >
                      View all
                    </a>
                  </div>
                  <div className="space-y-2">
                    {(detail?.invoices ?? []).slice(0, 5).map((inv) => {
                      const isSent   = inv.status !== "draft";
                      const justSent = sentInvoiceIds.has(inv.id);
                      const isSending = sendingInvoiceId === inv.id;
                      return (
                        <div key={inv.id} className="rounded-sm border border-border bg-muted/10 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={12} className={cn("shrink-0", isSent ? "text-brand-gold" : "text-muted-foreground")} />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{inv.invoice_number}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  KES {Number(inv.total).toLocaleString()}
                                  {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={cn(
                                "text-[10px] font-semibold capitalize",
                                invoiceStatusColour[inv.status] ?? "text-muted-foreground"
                              )}>
                                {inv.status}
                              </span>
                              {/* Send / Resend button */}
                              {inv.status !== "paid" && client.email && (
                                <button
                                  onClick={() => sendInvoice(inv.id)}
                                  disabled={isSending}
                                  className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium transition-colors disabled:opacity-50",
                                    justSent
                                      ? "text-emerald-600"
                                      : isSent
                                        ? "text-muted-foreground hover:text-brand-gold"
                                        : "text-primary hover:text-primary/80"
                                  )}
                                >
                                  {isSending ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : justSent ? (
                                    <CheckCircle size={10} />
                                  ) : isSent ? (
                                    <RefreshCw size={10} />
                                  ) : (
                                    <Send size={10} />
                                  )}
                                  {isSending ? "Sending…" : justSent ? "Sent!" : isSent ? "Resend" : "Send"}
                                </button>
                              )}
                              {!client.email && inv.status !== "paid" && (
                                <span className="text-[10px] text-muted-foreground/50">No email</span>
                              )}
                            </div>
                          </div>
                          {/* Sent indicator */}
                          {isSent && inv.sent_at && (
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <CheckCircle2 size={9} className="text-emerald-500" />
                              Sent {new Date(inv.sent_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                          {!isSent && (
                            <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                              <AlertCircle size={9} />
                              Not sent yet
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Notes */}
              {client.notes && (
                <section className="px-5 py-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Notes</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{client.notes}</p>
                </section>
              )}

              {/* Last contacted */}
              {client.last_contacted_at && (
                <section className="px-5 py-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock size={11} />
                    Last contacted {new Date(client.last_contacted_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </section>
              )}

              {/* Intake submissions */}
              <section className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <ClipboardList size={11} />Requirements Intakes
                  </h3>
                  {client.intake_token && (
                    <button
                      onClick={copyIntakeLink}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-brand-gold transition-colors"
                    >
                      {intakeLinkCopied ? <ClipboardCheck size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      {intakeLinkCopied ? "Copied!" : "Copy link"}
                    </button>
                  )}
                </div>
                {(detail?.intakes ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No intake submissions yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {(detail?.intakes ?? []).slice(0, 5).map((intake) => (
                      <div key={intake.id} className="rounded-sm border border-border bg-muted/20 p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {intake.project_title || serviceTypeLabel[intake.service_type] || intake.service_type}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(intake.submitted_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <span className={cn(
                            "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize",
                            intakeStatusColour[intake.status] ?? "text-muted-foreground bg-muted"
                          )}>
                            {intake.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{intake.description}</p>
                        <div className="flex items-center gap-3 pt-0.5">
                          <button
                            onClick={() => setSelectedIntake(intake)}
                            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                          >
                            <Eye size={10} />
                            View details
                          </button>
                          {intake.status === "new" && (
                            <button
                              onClick={() => markIntakeReviewed(intake.id)}
                              disabled={markingIntakeId === intake.id}
                              className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                            >
                              {markingIntakeId === intake.id
                                ? <Loader2 size={10} className="animate-spin" />
                                : <CheckCircle2 size={10} />}
                              Mark reviewed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              </>)}

              {/* ── Communications tab ───────────────────────── */}
              {activeTab === "comms" && (
                <section className="px-5 py-4">
                  {(detail?.comms ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No communications on record yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(detail?.comms ?? []).map((c) => (
                        <div key={c.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            c.direction === "out" ? "bg-brand-gold" : "bg-emerald-500"
                          )} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{c.subject ?? c.type}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground capitalize">{c.type}</span>
                              <span className="text-[11px] text-muted-foreground">·</span>
                              <span className="text-[11px] text-muted-foreground">
                                {c.direction === "out" ? "Sent" : "Received"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">·</span>
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {new Date(c.sent_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Admin link (only visible to admin, not support portal) */}
              <section className="px-5 py-3">
                <a href={`/admin/clients?id=${client.id}`}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-gold transition-colors">
                  <ExternalLink size={11} />Open full client record
                </a>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

    <IntakeDetailSheet
      intake={selectedIntake}
      onClose={() => setSelectedIntake(null)}
      onMarkReviewed={async (id) => { await markIntakeReviewed(id); }}
      marking={!!markingIntakeId}
    />
    </>
  );
}
