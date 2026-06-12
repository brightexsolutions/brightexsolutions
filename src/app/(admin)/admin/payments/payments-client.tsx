"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, Plus, Pencil, Trash2, Send, Loader2, Eye, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, type Column, type RowAction } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-dialog";

const methods = ["mpesa", "bank", "paypal", "cash"] as const;
const methodLabels: Record<string, string> = {
  mpesa: "M-Pesa",
  bank: "Bank Transfer",
  paypal: "PayPal",
  cash: "Cash",
};

const defaultForm = {
  invoice_id: "",
  amount: "",
  method: "mpesa" as string,
  reference: "",
  date: new Date().toISOString().split("T")[0],
  notes: "",
  send_receipt: false,
};

type Payment = {
  id: string;
  invoice_id?: string | null;
  amount: number;
  method: string;
  reference?: string | null;
  confirmation_sent?: boolean | null;
  confirmation_sent_at?: string | null;
  date?: string | null;
  notes?: string | null;
  created_at: string;
  invoices?: {
    id: string;
    invoice_number?: string | null;
    total?: number | null;
    client_id?: string | null;
    clients?: { name?: string | null; email?: string | null } | null;
  } | null;
};

type InvoiceOption = {
  id: string;
  invoice_number?: string | null;
  total: number;
  status: string;
  paid_total: number;
  clients?: { name?: string | null } | null;
};

export function PaymentsPageClient() {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
  const [busyReceiptIds, setBusyReceiptIds] = useState<Set<string>>(new Set());
  const [viewReceiptPayment, setViewReceiptPayment] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/payments");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(json.error ?? "Unable to load payments."); return; }
      setPayments(json.data ?? []);
    } catch {
      setLoadError("Network error. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadInvoiceOptions(forceIncludeId?: string) {
    try {
      const res = await fetch("/api/admin/invoices");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const invoices = (json.data ?? []) as Array<{
        id: string;
        invoice_number?: string | null;
        total: number;
        status: string;
        clients?: { name?: string | null } | null;
        payments?: Array<{ amount: number }> | null;
      }>;
      setInvoiceOptions(
        invoices
          .filter((inv) =>
            (inv.status !== "paid" && inv.status !== "cancelled") ||
            inv.id === forceIncludeId
          )
          .map((inv) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            total: Number(inv.total),
            status: inv.status,
            paid_total: (inv.payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
            clients: inv.clients,
          }))
      );
    } catch { /* ignore */ }
  }

  function set(field: string, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setInvoiceOptions([]);
    setError("");
    loadInvoiceOptions();
    setOpen(true);
  }

  function openEdit(payment: Payment) {
    setEditTarget(payment);
    setForm({
      invoice_id: payment.invoice_id ?? "",
      amount: String(payment.amount),
      method: payment.method,
      reference: payment.reference ?? "",
      date: payment.date?.split("T")[0] ?? new Date().toISOString().split("T")[0],
      notes: payment.notes ?? "",
      send_receipt: false,
    });
    setError("");
    // Pre-seed the linked invoice so the Select shows its label immediately
    // before the async load finishes (avoids showing raw UUID)
    if (payment.invoice_id && payment.invoices) {
      const inv = payment.invoices;
      setInvoiceOptions([{
        id: inv.id,
        invoice_number: inv.invoice_number ?? null,
        total: Number(inv.total ?? 0),
        status: "unknown",
        paid_total: 0,
        clients: inv.clients,
      }]);
    } else {
      setInvoiceOptions([]);
    }
    loadInvoiceOptions(payment.invoice_id ?? undefined);
    setOpen(true);
  }

  async function handleDelete(payment: Payment) {
    if (!await confirm({ message: "Delete this payment record? This cannot be undone." })) return;
    await fetch(`/api/admin/payments/${payment.id}`, { method: "DELETE" });
    setPayments((prev) => prev.filter((p) => p.id !== payment.id));
  }

  async function sendReceipt(payment: Payment) {
    setBusyReceiptIds((prev) => { const next = new Set(prev); next.add(payment.id); return next; });
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/receipt`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(json.error ?? "Failed to send receipt");
        return;
      }
      const sentAt: string = json.confirmation_sent_at ?? new Date().toISOString();
      setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, confirmation_sent: true, confirmation_sent_at: sentAt } : p));
      // Keep view sheet in sync if it's open for this payment
      setViewReceiptPayment((prev) => prev?.id === payment.id ? { ...prev, confirmation_sent: true, confirmation_sent_at: sentAt } : prev);
    } finally {
      setBusyReceiptIds((prev) => { const next = new Set(prev); next.delete(payment.id); return next; });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || undefined,
        date: form.date || undefined,
        notes: form.notes || undefined,
      };
      if (form.invoice_id) payload.invoice_id = form.invoice_id;

      const url = editTarget ? `/api/admin/payments/${editTarget.id}` : "/api/admin/payments";
      const method = editTarget ? "PATCH" : "POST";
      if (!editTarget) payload.send_receipt = form.send_receipt;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to save payment");
        return;
      }

      if (editTarget) {
        setPayments((prev) => prev.map((p) => p.id === editTarget.id ? { ...p, ...data.data } : p));
      } else {
        // data.data includes invoices → clients join from the POST response
        setPayments((prev) => [data.data as Payment, ...prev]);
      }
      setOpen(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Derive selected invoice balance info
  const selectedInvoice = invoiceOptions.find((inv) => inv.id === form.invoice_id);
  const balance = selectedInvoice ? selectedInvoice.total - selectedInvoice.paid_total : null;

  const now = new Date();
  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const thisMonth = payments
    .filter((p) => {
      const d = p.date ? new Date(p.date) : new Date(p.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const pendingReceipts = payments.filter((p) => p.confirmation_sent === false).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Record incoming payments and send receipts.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
        >
          <Plus size={15} />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Received" value={`KES ${totalReceived.toLocaleString()}`} icon={CreditCard} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="This Month" value={`KES ${thisMonth.toLocaleString()}`} icon={CreditCard} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Transactions" value={payments.length} icon={CreditCard} />
        <StatCard title="Pending Receipts" value={pendingReceipts} icon={CreditCard} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
      </div>

      {loadError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-500 text-center">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "invoice_number",
              label: "Invoice / Client",
              sortable: true,
              render: (row) => {
                const p = row as Record<string, unknown>;
                const inv = p.invoices as Record<string, unknown> | null;
                return (
                  <StackedCell
                    primary={String(inv?.invoice_number ?? "Unlinked")}
                    secondary={(inv as Record<string, unknown>)?.clients ? String(((inv as Record<string, unknown>).clients as Record<string, unknown>)?.name ?? "") : "No client"}
                    mono
                  />
                );
              },
            },
            {
              key: "amount",
              label: "Amount",
              sortable: true,
              render: (row) => (
                <span className="font-semibold text-foreground">
                  KES {Number(row.amount ?? 0).toLocaleString()}
                </span>
              ),
            },
            {
              key: "method",
              label: "Method",
              render: (row) => (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground uppercase">
                  {methodLabels[String(row.method)] ?? String(row.method ?? "—")}
                </span>
              ),
            },
            {
              key: "date",
              label: "Date",
              sortable: true,
              className: "hidden sm:table-cell",
              render: (row) => (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(String(row.date ?? row.created_at)).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              ),
            },
            {
              key: "confirmation_sent",
              label: "Receipt",
              className: "hidden md:table-cell",
              render: (row) => {
                const p = row as unknown as Payment;
                if (p.confirmation_sent && p.confirmation_sent_at) {
                  return (
                    <span className="text-xs text-emerald-500 font-medium whitespace-nowrap">
                      Sent {new Date(p.confirmation_sent_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                    </span>
                  );
                }
                return (
                  <span className={`text-xs font-medium ${p.confirmation_sent ? "text-emerald-500" : "text-amber-500"}`}>
                    {p.confirmation_sent ? "Sent" : "Pending"}
                  </span>
                );
              },
            },
            {
              key: "actions_inline",
              label: "",
              className: "w-44",
              render: (row) => {
                const p = row as unknown as Payment;
                const busy = busyReceiptIds.has(p.id);
                const hasClient = !!(p.invoices?.clients?.email);
                return (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewReceiptPayment(p); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                      title="View receipt"
                    >
                      <Eye size={10} />
                      View
                    </button>
                    {hasClient && (
                      <button
                        onClick={(e) => { e.stopPropagation(); sendReceipt(p); }}
                        disabled={busy}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                        title={p.confirmation_sent ? "Resend receipt" : "Send receipt"}
                      >
                        {busy ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                        {p.confirmation_sent ? "Resend" : "Send"}
                      </button>
                    )}
                  </div>
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={payments as unknown as Record<string, unknown>[]}
          actions={[
            { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEdit(row as unknown as Payment) },
            { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => handleDelete(row as unknown as Payment) },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search payments…"
          searchKeys={["reference", "method"]}
          maxHeight="520px"
          emptyMessage={loading ? "Loading payments…" : "No payments recorded yet."}
        />
      </Card>

      {/* View Receipt Sheet */}
      <Sheet open={!!viewReceiptPayment} onOpenChange={(v) => { if (!v) setViewReceiptPayment(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="font-display text-lg">Payment Receipt</SheetTitle>
            {viewReceiptPayment && (
              <p className="text-xs text-muted-foreground">
                {viewReceiptPayment.invoices?.invoice_number ?? "Unlinked payment"} · {new Date(viewReceiptPayment.date ?? viewReceiptPayment.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </SheetHeader>
          {viewReceiptPayment && (
            <div className="pt-5 space-y-5">
              {/* Amount hero */}
              <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-5 py-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Amount Received</p>
                <p className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  KES {Number(viewReceiptPayment.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Details grid */}
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium capitalize">
                    {methodLabels[viewReceiptPayment.method] ?? viewReceiptPayment.method}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {new Date(viewReceiptPayment.date ?? viewReceiptPayment.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
                {viewReceiptPayment.reference && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono font-medium text-xs">{viewReceiptPayment.reference}</span>
                  </div>
                )}
                {viewReceiptPayment.invoices?.invoice_number && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-muted-foreground">Invoice</span>
                    <span className="font-mono font-medium text-xs">{viewReceiptPayment.invoices.invoice_number}</span>
                  </div>
                )}
                {viewReceiptPayment.invoices?.clients?.name && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium">{viewReceiptPayment.invoices.clients.name}</span>
                  </div>
                )}
                {viewReceiptPayment.invoices?.clients?.email && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-muted-foreground">Client Email</span>
                    <span className="font-medium text-xs">{viewReceiptPayment.invoices.clients.email}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-muted-foreground">Receipt Status</span>
                  <span className={`text-xs font-semibold ${viewReceiptPayment.confirmation_sent ? "text-emerald-500" : "text-amber-500"}`}>
                    {viewReceiptPayment.confirmation_sent
                      ? viewReceiptPayment.confirmation_sent_at
                        ? `Sent ${new Date(viewReceiptPayment.confirmation_sent_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} at ${new Date(viewReceiptPayment.confirmation_sent_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
                        : "Sent to client"
                      : "Not yet sent"}
                  </span>
                </div>
              </div>

              {viewReceiptPayment.notes && (
                <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Notes</p>
                  <p className="text-foreground">{viewReceiptPayment.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setViewReceiptPayment(null)}>
                  Close
                </Button>
                {viewReceiptPayment.invoices?.clients?.email && (
                  <Button
                    className="flex-1 bg-brand-gold text-brand-navy hover:bg-brand-gold-hover"
                    disabled={busyReceiptIds.has(viewReceiptPayment.id)}
                    onClick={() => {
                      sendReceipt(viewReceiptPayment);
                      setViewReceiptPayment(null);
                    }}
                  >
                    {busyReceiptIds.has(viewReceiptPayment.id) ? (
                      <Loader2 size={13} className="animate-spin mr-1" />
                    ) : (
                      <Send size={13} className="mr-1" />
                    )}
                    {viewReceiptPayment.confirmation_sent ? "Resend Receipt" : "Send Receipt"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Payment" : "Record Payment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Invoice selector */}
            <div className="space-y-1.5">
              <Label>Invoice <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={form.invoice_id || "none"} onValueChange={(v) => {
                const invoiceId: string = !v || v === "none" ? "" : v;
                const inv = invoiceOptions.find((i) => i.id === invoiceId);
                const remaining = inv ? inv.total - inv.paid_total : null;
                setForm((f) => ({
                  ...f,
                  invoice_id: invoiceId,
                  amount: remaining !== null && remaining > 0 ? String(remaining) : f.amount,
                }));
              }}>
                <SelectTrigger>
                  {/* Render label from state directly — Radix SelectValue can't track
                      dynamically-loaded options and falls back to showing the raw UUID */}
                  {form.invoice_id ? (
                    (() => {
                      const inv = invoiceOptions.find((i) => i.id === form.invoice_id);
                      if (!inv) return <span className="text-muted-foreground text-sm">Loading…</span>;
                      return (
                        <span className="text-sm truncate">
                          {inv.invoice_number ?? "Invoice"} — {inv.clients?.name ?? "Unknown"}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-muted-foreground text-sm">Select invoice (optional)</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No invoice (unlinked)</SelectItem>
                  {invoiceOptions.map((inv) => {
                    const bal = inv.total - inv.paid_total;
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number ?? inv.id.slice(0, 8)} — {inv.clients?.name ?? "Unknown"} — Balance: KES {bal.toLocaleString()}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedInvoice && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-sm px-3 py-2 space-y-0.5">
                  <p>Invoice total: <strong>KES {selectedInvoice.total.toLocaleString()}</strong></p>
                  {selectedInvoice.paid_total > 0 && (
                    <p>Already paid: <span className="text-emerald-600 dark:text-emerald-400 font-medium">KES {selectedInvoice.paid_total.toLocaleString()}</span></p>
                  )}
                  <p>Balance due: <strong className="text-brand-gold">KES {(selectedInvoice.total - selectedInvoice.paid_total).toLocaleString()}</strong></p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount (KES) *</Label>
                <Input id="pay-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
                {selectedInvoice && balance !== null && Number(form.amount) > 0 && Number(form.amount) < balance && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">Partial payment — KES {(balance - Number(form.amount)).toLocaleString()} will remain</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(value) => value && set("method", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {methods.map((method) => (
                      <SelectItem key={method} value={method}>{methodLabels[method]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Reference / Code</Label>
                <Input id="pay-ref" value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="e.g. QBC1XYZABC" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Date</Label>
                <Input id="pay-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea id="pay-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            {!editTarget && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.send_receipt}
                  onChange={(e) => set("send_receipt", e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-brand-gold"
                />
                <span className="text-sm text-foreground">Send receipt to client</span>
              </label>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.amount} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
