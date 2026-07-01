"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus, Trash2, Send, Eye, X, Pencil, Download, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, StatusDot, type Column, type RowAction } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";

const statusColors: Record<string, string> = {
  draft: "bg-slate-400/10 text-slate-400",
  sent: "bg-blue-400/10 text-blue-400",
  partial: "bg-amber-400/10 text-amber-500",
  paid: "bg-emerald-400/10 text-emerald-400",
  overdue: "bg-red-400/10 text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

const filterTabs = ["All", "Draft", "Sent", "Partial", "Paid", "Overdue"];

type LineItem = { description: string; qty: number; unit_price: number };
type Invoice = {
  id: string;
  invoice_number?: string | null;
  status: string;
  total: number;
  subtotal?: number | null;
  tax?: number | null;
  due_date?: string | null;
  sent_at?: string | null;
  notes?: string | null;
  items: LineItem[];
  project_id?: string | null;
  clients?: { id?: string; name?: string | null; email?: string | null; company?: string | null } | null;
  projects?: { id: string; name: string } | null;
  created_at: string;
  send_count?: number;
  last_comm_at?: string | null;
};
type Project = { id: string; name: string; clients?: { name?: string | null } | null };
type Client = { id: string; name?: string | null; company?: string | null; email?: string | null; phone?: string | null; classification?: string | null };

const defaultItem = (): LineItem => ({ description: "", qty: 1, unit_price: 0 });
const PAYMENT_METHODS = [
  { value: "all", label: "All payment options" },
  { value: "mpesa_send_money", label: "M-Pesa Send Money" },
  { value: "mpesa_till", label: "M-Pesa Till (Buy Goods)" },
  { value: "paypal", label: "PayPal" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
] as const;

const defaultForm = { client_id: "", client_name: "", client_company: "", client_email: "", client_phone: "", project_id: "", payment_method: "all", due_date: "", notes: "", items: [defaultItem()] };

export default function InvoicesPage() {
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Create / Edit dialog
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [clientSearch, setClientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Per-row busy tracking (send / delete)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // PDF preview sheet
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [invRes, projRes, clientRes] = await Promise.all([
        fetch("/api/admin/invoices"),
        fetch("/api/admin/projects"),
        fetch("/api/admin/clients"),
      ]);
      const [invJson, projJson, clientJson] = await Promise.all([invRes.json(), projRes.json(), clientRes.json()]);
      if (invRes.ok) setInvoices(invJson.data ?? []);
      if (projRes.ok) setProjects(projJson.data ?? []);
      if (clientRes.ok) setClients(clientJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setClientSearch("");
    setError("");
    setOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditTarget(inv);
    setClientSearch("");
    setForm({
      client_id: (inv as Record<string, unknown>).client_id as string ?? "",
      client_name: inv.clients?.name ?? "",
      client_company: inv.clients?.company ?? "",
      client_email: inv.clients?.email ?? "",
      client_phone: "",
      project_id: inv.project_id ?? "",
      payment_method: (inv as Record<string, unknown>).payment_method as string ?? "all",
      due_date: inv.due_date ?? "",
      notes: inv.notes ?? "",
      items: Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items.map((it) => ({ description: it.description, qty: it.qty, unit_price: it.unit_price }))
        : [defaultItem()],
    });
    setError("");
    setOpen(true);
  }

  async function openPreview(id: string) {
    setPreviewId(id);
    // Revoke any previous blob URL before creating a new one
    setPdfBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPreviewOpen(true);
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        setPdfBlobUrl(URL.createObjectURL(blob));
      }
    } finally {
      setPdfLoading(false);
    }
  }

  // Clean up blob URL when sheet closes
  useEffect(() => {
    if (!previewOpen && pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }, [previewOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: field === "description" ? value : Number(value) };
      return { ...f, items };
    });
  }

  function removeItem(i: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }

  const subtotal = form.items.reduce((sum, it) => sum + it.qty * it.unit_price, 0);

  const filteredClients = clientSearch
    ? clients.filter((c) =>
        (c.name?.toLowerCase().includes(clientSearch.toLowerCase())) ||
        (c.company?.toLowerCase().includes(clientSearch.toLowerCase())) ||
        (c.email?.toLowerCase().includes(clientSearch.toLowerCase()))
      )
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editTarget ? `/api/admin/invoices/${editTarget.id}` : "/api/admin/invoices";
      const method = editTarget ? "PATCH" : "POST";

      let body: Record<string, unknown>;
      if (editTarget) {
        const processedItems = form.items.map((it) => ({ ...it, total: it.qty * it.unit_price }));
        body = {
          items: processedItems,
          subtotal,
          total: subtotal,
          project_id: form.project_id || undefined,
          due_date: form.due_date || undefined,
          notes: form.notes || undefined,
        };
      } else {
        body = {
          ...form,
          client_id: form.client_id || undefined,
          project_id: form.project_id || undefined,
          client_company: form.client_company || undefined,
          client_phone: form.client_phone || undefined,
          subtotal,
          total: subtotal,
        };
      }
      if (editTarget) {
        (body as Record<string, unknown>).payment_method = form.payment_method;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save invoice");
      } else {
        if (editTarget) {
          setInvoices((prev) => prev.map((inv) => inv.id === editTarget.id ? { ...inv, ...json.data } : inv));
        } else {
          setInvoices((prev) => [json.data, ...prev]);
        }
        setForm(defaultForm);
        setOpen(false);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      busy ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function sendInvoice(id: string) {
    setBusy(id, true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}/send`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const sentAt: string = json.sent_at ?? new Date().toISOString();
        setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: "sent", sent_at: sentAt } : inv));
      }
    } finally {
      setBusy(id, false);
    }
  }

  async function deleteInvoice(inv: Invoice) {
    if (!await confirm({ message: `Delete invoice ${inv.invoice_number ?? "draft"}? This cannot be undone.` })) return;
    setBusy(inv.id, true);
    try {
      await fetch(`/api/admin/invoices/${inv.id}`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    } finally {
      setBusy(inv.id, false);
    }
  }

  const filtered = invoices.filter((inv) =>
    activeFilter === "All" || inv.status === activeFilter.toLowerCase()
  );

  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total), 0);
  const pending = invoices.filter((i) => i.status === "sent" || i.status === "partial").length;
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" && new Date(i.created_at) > new Date(Date.now() - 30 * 86400000))
    .reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, preview, and send invoices to clients.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
        >
          <Plus size={15} />New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Invoiced" value={`KES ${totalInvoiced.toLocaleString()}`} icon={FileText} accent={{ bg: "bg-brand-gold/10", text: "text-brand-gold" }} />
        <StatCard title="Pending" value={String(pending)} icon={FileText} accent={{ bg: "bg-blue-400/10", text: "text-blue-400" }} />
        <StatCard title="Overdue" value={String(overdue)} icon={FileText} accent={{ bg: "bg-red-400/10", text: "text-red-400" }} trend={overdue > 0 ? { direction: "down", value: `${overdue} overdue` } : undefined} />
        <StatCard title="Paid (30d)" value={`KES ${paidThisMonth.toLocaleString()}`} icon={FileText} accent={{ bg: "bg-emerald-400/10", text: "text-emerald-400" }} />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "invoice_number",
              label: "Invoice",
              sortable: true,
              render: (row) => {
                const inv = row as unknown as Invoice;
                return (
                  <StackedCell
                    primary={inv.invoice_number ?? "Draft"}
                    secondary={inv.clients?.name ?? "No client"}
                    mono
                  />
                );
              },
            },
            {
              key: "total",
              label: "Amount",
              sortable: true,
              render: (row) => (
                <span className="font-semibold text-foreground">
                  KES {Number(row.total).toLocaleString()}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => {
                const inv = row as unknown as Invoice;
                const lastSent = inv.last_comm_at ?? inv.sent_at;
                return (
                  <div className="flex flex-col gap-0.5">
                    <StatusDot status={inv.status} />
                    {lastSent && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {inv.send_count && inv.send_count > 0
                          ? `Sent ×${inv.send_count} · ${new Date(lastSent).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "2-digit" })}`
                          : `Sent ${new Date(lastSent).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "2-digit" })}`
                        }
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: "due_date",
              label: "Due",
              className: "hidden sm:table-cell",
              sortable: true,
              render: (row) => (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {row.due_date ? new Date(String(row.due_date)).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </span>
              ),
            },
            {
              key: "inline_actions",
              label: "",
              className: "w-32",
              render: (row) => {
                const inv = row as unknown as Invoice;
                return (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openPreview(inv.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border text-muted-foreground hover:border-brand-gold/40 hover:text-foreground transition-colors"
                    >
                      <Eye size={11} />PDF
                    </button>
                    {inv.status !== "cancelled" && (
                      <button
                        onClick={() => sendInvoice(inv.id)}
                        disabled={busyIds.has(inv.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors disabled:opacity-60"
                      >
                        {busyIds.has(inv.id) ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                        {inv.status === "draft" ? "Send" : "Resend"}
                      </button>
                    )}
                  </div>
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filtered as unknown as Record<string, unknown>[]}
          actions={[
            { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEdit(row as unknown as Invoice) },
            { label: "Preview PDF", icon: <Eye size={13} />, onClick: (row) => openPreview(String(row.id)) },
            { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => deleteInvoice(row as unknown as Invoice) },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search invoices…"
          searchKeys={["invoice_number"]}
          filters={[{
            key: "status",
            label: "Status",
            options: [
              { label: "All", value: "" },
              ...filterTabs.slice(1).map((t) => ({ label: t, value: t.toLowerCase() }))
            ],
          }]}
          activeFilters={{ status: activeFilter === "All" ? "" : activeFilter.toLowerCase() }}
          onFilterChange={(_, v) => setActiveFilter(v ? v.charAt(0).toUpperCase() + v.slice(1) : "All")}
          maxHeight="520px"
          emptyMessage={loading ? "Loading invoices…" : "No invoices yet."}
        />
      </Card>

      {/* PDF Preview Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-6xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
            <SheetTitle className="text-base">Invoice Preview</SheetTitle>
            <div className="flex items-center gap-2">
              {pdfBlobUrl && (
                <a
                  href={pdfBlobUrl}
                  download={`invoice-${previewId}.pdf`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand-gold text-brand-navy text-xs font-semibold hover:bg-brand-gold-hover transition-colors"
                >
                  <Download size={13} />Download
                </a>
              )}
              <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
          </SheetHeader>
          <div className="flex-1 bg-muted/30 relative">
            {pdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 size={20} className="animate-spin mr-2" />Generating PDF…
              </div>
            )}
            {pdfBlobUrl && (
              <iframe
                key={pdfBlobUrl}
                src={pdfBlobUrl}
                className="w-full h-full border-0"
                title="Invoice PDF Preview"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create / Edit Invoice Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit Invoice ${editTarget.invoice_number ?? ""}` : "New Invoice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Client section */}
            {!editTarget ? (
              <div className="space-y-3">
                {/* Client search picker */}
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search existing clients by name, company or email…"
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        if (form.client_id) setForm((f) => ({ ...f, client_id: "" }));
                      }}
                      autoComplete="off"
                    />
                    {form.client_id && (
                      <button
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, client_id: "", client_name: "", client_company: "", client_email: "", client_phone: "" })); setClientSearch(""); }}
                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear client selection"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {!form.client_id && filteredClients.length > 0 && (
                      <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-sm shadow-lg max-h-52 overflow-y-auto">
                        {filteredClients.slice(0, 10).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                client_id: c.id,
                                client_name: c.name ?? "",
                                client_company: c.company ?? "",
                                client_email: c.email ?? "",
                                client_phone: c.phone ?? "",
                              }));
                              setClientSearch(c.company ?? c.name ?? "");
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted border-b border-border/50 last:border-0 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{c.company ?? c.name}</p>
                                {c.company && c.name && <p className="text-xs text-muted-foreground truncate">{c.name}</p>}
                                {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                              </div>
                              {c.classification && (
                                <span className="ml-auto shrink-0 text-[10px] capitalize text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{c.classification}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.client_id && (
                    <p className="text-xs text-emerald-500">Linked to existing client record</p>
                  )}
                  {!form.client_id && (
                    <p className="text-[11px] text-muted-foreground">Select an existing client above, or fill in details below to create a new one.</p>
                  )}
                </div>

                {/* Manual / override fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Company <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input placeholder="Verb Education" value={form.client_company} onChange={(e) => setForm((f) => ({ ...f, client_company: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Person {!form.client_company && <span className="text-red-400">*</span>}</Label>
                    <Input placeholder="Dr. Kamau Mwangi" value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} required={!form.client_company} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="finance@verbeducation.co.ke" value={form.client_email} onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input placeholder="+254712345678" value={form.client_phone} onChange={(e) => setForm((f) => ({ ...f, client_phone: e.target.value }))} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-sm bg-muted text-xs text-muted-foreground">
                Client: <span className="font-medium text-foreground">{editTarget.clients?.name ?? "—"}</span>
                {editTarget.clients?.company && editTarget.clients.company !== editTarget.clients.name && <span className="text-foreground"> ({editTarget.clients.company})</span>}
                {editTarget.clients?.email && <span> · {editTarget.clients.email}</span>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Project <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select value={form.project_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, project_id: !v || v === "none" ? "" : v }))}>
                  <SelectTrigger>
                    {form.project_id ? (
                      <span className="text-sm truncate">
                        {projects.find((p) => p.id === form.project_id)?.name ?? "Project"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">No project</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.clients?.name ? ` — ${p.clients.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method on Invoice</Label>
              <Select value={form.payment_method} onValueChange={(v) => v && setForm((f) => ({ ...f, payment_method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Controls which payment details appear on the PDF. Configure details in Settings → Invoice & Payments.</p>
            </div>

            <div className="space-y-2">
              <Label>Line Items</Label>
              <div className="rounded-sm border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_60px_100px_32px] gap-2 px-3 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Description</span><span>Qty</span><span>Price (KES)</span><span />
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_100px_32px] gap-2 px-3 py-2 border-t border-border items-center">
                    <input placeholder="Service or item" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="w-full text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" required />
                    <input type="number" min={1} value={item.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} className="w-full text-sm bg-transparent text-foreground text-center focus:outline-none" />
                    <input type="number" min={0} value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} className="w-full text-sm bg-transparent text-foreground text-right focus:outline-none" />
                    <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1} className="text-muted-foreground hover:text-red-400 disabled:opacity-30 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setForm((f) => ({ ...f, items: [...f.items, defaultItem()] }))} className="text-xs text-brand-gold hover:text-brand-gold/80 font-medium transition-colors">
                + Add line item
              </button>
            </div>
            <div className="flex justify-end text-sm">
              <div className="text-right space-y-1">
                <div className="flex gap-8 text-muted-foreground"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
                <div className="flex gap-8 font-semibold text-foreground border-t border-border pt-1"><span>Total</span><span>KES {subtotal.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea rows={2} placeholder="Payment instructions, M-Pesa number…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || (!editTarget && !form.client_name && !form.client_company)} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Save as Draft"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
