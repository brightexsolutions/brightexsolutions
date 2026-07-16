"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Mail, Phone, MessageSquare, Send, AlertCircle,
  FileText, TrendingUp, Clock, CheckCircle2, Loader2,
  ExternalLink, ClipboardList, Copy, ClipboardCheck, Eye,
  RefreshCw, CheckCircle, Briefcase, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { whatsappUrl } from "@/lib/constants";
import { IntakeDetailSheet, type IntakeDetail, type IntakeAnalysis, SERVICE_LABELS } from "@/components/admin/intake-detail-sheet";
import { EmailComposer } from "@/components/admin/email-composer";
import { DocumentViewerSheet, type DocumentViewerTarget } from "@/components/admin/document-viewer-sheet";

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
  payments?: { amount: number; date: string }[];
};

function outstandingOf(inv: Invoice): number {
  const paid = (inv.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  return Math.max(0, Number(inv.total) - paid);
}

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

type ClientDoc = {
  id: string;
  type: "proposal" | "agreement" | "sop";
  title: string;
  reference_code: string | null;
  status: string;
  gated?: boolean | null;
  accepted_at?: string | null;
  created_at: string;
};

type ClientDetail = {
  client: Client;
  invoices: Invoice[];
  deals: Deal[];
  comms: Comm[];
  intakes: Intake[];
  documents: ClientDoc[];
};

const docTypeIcon: Record<ClientDoc["type"], typeof Briefcase> = {
  proposal: Briefcase,
  agreement: ScrollText,
  sop: ClipboardList,
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [intakeLinkCopied, setIntakeLinkCopied] = useState(false);
  const [markingIntakeId, setMarkingIntakeId] = useState<string | null>(null);
  const [archivingIntakeId, setArchivingIntakeId] = useState<string | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<IntakeDetail | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [sentInvoiceIds, setSentInvoiceIds] = useState<Set<string>>(new Set());
  const [emailLinkDocument, setEmailLinkDocument] = useState<{ id: string; title: string } | null>(null);
  const [emailContext, setEmailContext] = useState<{ context: string; subject: string } | null>(null);
  const [viewerDoc, setViewerDoc] = useState<DocumentViewerTarget | null>(null);

  const loadDetail = useCallback((id: string) => {
    setLoading(true);
    return Promise.all([
      fetch(`/api/admin/clients/${id}`).then((r) => r.json()),
      fetch(`/api/admin/invoices?client_id=${id}`).then((r) => r.json()),
      fetch(`/api/admin/sales?client_id=${id}`).then((r) => r.json()),
      fetch(`/api/admin/communications?client_id=${id}`).then((r) => r.json()),
      fetch(`/api/admin/clients/${id}/intakes`).then((r) => r.json()),
      fetch(`/api/admin/documents?client_id=${id}`).then((r) => r.json()),
    ]).then(([clientRes, invRes, dealRes, commRes, intakeRes, docRes]) => {
      setDetail({
        client: clientRes.data ?? clientRes,
        invoices: invRes.data ?? [],
        deals: dealRes.data ?? [],
        comms: commRes.data ?? [],
        intakes: intakeRes.data ?? [],
        documents: (docRes.data ?? []).filter((d: ClientDoc) => d.type !== "sop"),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!clientId) { setDetail(null); return; }
    setComposerOpen(false);
    setActiveTab("overview");
    loadDetail(clientId);
  }, [clientId, loadDetail]);

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

  async function updateIntakeStatus(intakeId: string, status: "reviewed" | "archived") {
    if (!clientId) return;
    const setBusy = status === "archived" ? setArchivingIntakeId : setMarkingIntakeId;
    setBusy(intakeId);
    try {
      await fetch(`/api/admin/clients/${clientId}/intakes?intakeId=${intakeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setDetail((prev) => prev ? {
        ...prev,
        intakes: prev.intakes.map((i) => i.id === intakeId ? { ...i, status } : i),
      } : prev);
      setSelectedIntake((prev) => prev && prev.id === intakeId ? { ...prev, status } : prev);
    } finally {
      setBusy(null);
    }
  }

  // Without this, an analysis generated in the panel is lost on reopen — the
  // sheet only ever re-reads the intake list fetched on load, before the
  // analysis existed.
  function onIntakeAnalysisSaved(intakeId: string, analysis: IntakeAnalysis, analyzedAt: string) {
    setDetail((prev) => prev ? {
      ...prev,
      intakes: prev.intakes.map((i) => i.id === intakeId ? { ...i, ai_analysis: analysis, ai_analyzed_at: analyzedAt } : i),
    } : prev);
    setSelectedIntake((prev) => prev && prev.id === intakeId ? { ...prev, ai_analysis: analysis, ai_analyzed_at: analyzedAt } : prev);
  }

  function replyToIntake(intake: IntakeDetail) {
    const serviceLabel = SERVICE_LABELS[intake.service_type] ?? intake.service_type;
    const context = [
      `Replying to their ${serviceLabel} intake submission.`,
      `They said: ${intake.description}`,
      intake.ai_analysis?.summary && `Our read on it: ${intake.ai_analysis.summary}`,
      intake.ai_analysis?.considerations?.length ? `Worth addressing: ${intake.ai_analysis.considerations.join("; ")}` : "",
    ].filter(Boolean).join("\n");
    setEmailLinkDocument(null);
    setEmailContext({ context, subject: `Re: Your ${serviceLabel} enquiry` });
    setSelectedIntake(null);
    setComposerOpen(true);
  }

  function onIntakeProposalReady(_intake: IntakeDetail, doc: { id: string; title: string; data: Record<string, unknown> }) {
    setSelectedIntake(null);
    setViewerDoc({
      title: doc.title,
      subtitle: "Proposal",
      client: client?.company?.trim() || client?.name,
      viewUrl: `/api/admin/documents/${doc.id}/view`,
      isHtmlDocument: true,
      refine: { documentId: doc.id, docType: "proposal", data: doc.data },
      gating: { documentId: doc.id, gated: false },
      onEmailClient: () => {
        setViewerDoc(null);
        setEmailLinkDocument({ id: doc.id, title: doc.title });
        setEmailContext(null);
        setComposerOpen(true);
      },
    });
  }

  async function viewClientDoc(doc: ClientDoc) {
    const base: DocumentViewerTarget = {
      title: doc.title,
      subtitle: doc.reference_code,
      client: client?.company?.trim() || client?.name,
      date: doc.created_at,
      viewUrl: `/api/admin/documents/${doc.id}/view`,
      isHtmlDocument: true,
    };
    setViewerDoc(base);
    const res = await fetch(`/api/admin/documents/${doc.id}`).then((r) => r.json()).catch(() => null);
    if (res?.data) {
      setViewerDoc({
        ...base,
        refine: { documentId: doc.id, docType: doc.type as "proposal" | "agreement", data: res.data.data },
        gating: { documentId: doc.id, gated: !!res.data.gated },
        onEmailClient: () => {
          setViewerDoc(null);
          setEmailLinkDocument({ id: doc.id, title: doc.title });
          setEmailContext(null);
          setComposerOpen(true);
        },
      });
    }
  }

  function resendClientDoc(doc: ClientDoc) {
    setEmailLinkDocument({ id: doc.id, title: doc.title });
    setEmailContext(null);
    setComposerOpen(true);
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
                      <button onClick={() => { setEmailLinkDocument(null); setEmailContext(null); setComposerOpen(true); }}
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
                            KES {outstandingOf(inv).toLocaleString()} outstanding · {inv.status}
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
                                  {outstandingOf(inv) > 0 && outstandingOf(inv) < Number(inv.total) && ` (${outstandingOf(inv).toLocaleString()} outstanding)`}
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
                              onClick={() => updateIntakeStatus(intake.id, "reviewed")}
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

              {/* Documents */}
              <section className="px-5 py-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <FileText size={11} />Documents
                </h3>
                {(detail?.documents ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No proposals or agreements yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {(detail?.documents ?? []).slice(0, 5).map((doc) => {
                      const Icon = docTypeIcon[doc.type];
                      return (
                        <div key={doc.id} className="rounded-sm border border-border bg-muted/20 p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex items-start gap-2">
                              <Icon size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{doc.title}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {doc.reference_code} · {new Date(doc.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                            </div>
                            {doc.accepted_at ? (
                              <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-600">
                                <CheckCircle2 size={10} />Accepted
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize text-muted-foreground bg-muted">
                                {doc.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 pt-0.5">
                            <button
                              onClick={() => viewClientDoc(doc)}
                              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                            >
                              <Eye size={10} />View
                            </button>
                            {doc.type !== "sop" && (
                              <button
                                onClick={() => resendClientDoc(doc)}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                              >
                                <Send size={10} />Resend
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
      clientId={clientId}
      onClose={() => setSelectedIntake(null)}
      onMarkReviewed={async (id) => { await updateIntakeStatus(id, "reviewed"); }}
      marking={!!markingIntakeId}
      onArchive={async (id) => { await updateIntakeStatus(id, "archived"); }}
      archiving={!!archivingIntakeId}
      onEmailClient={() => { if (selectedIntake) replyToIntake(selectedIntake); }}
      onAnalysisSaved={onIntakeAnalysisSaved}
      onProposalReady={onIntakeProposalReady}
    />

    <DocumentViewerSheet doc={viewerDoc} onClose={() => setViewerDoc(null)} />

    <EmailComposer
      open={composerOpen}
      onClose={() => { setComposerOpen(false); setEmailLinkDocument(null); setEmailContext(null); }}
      recipient={client?.email ? { clientId: client.id, name: client.name, email: client.email } : null}
      linkDocument={emailLinkDocument}
      initialContext={emailContext?.context}
      initialSubject={emailContext?.subject}
      onSent={() => { if (clientId) loadDetail(clientId); }}
    />
    </>
  );
}
