"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);

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
    if (!confirm("Delete this payment record? This cannot be undone.")) return;
    await fetch(`/api/admin/payments/${payment.id}`, { method: "DELETE" });
    setPayments((prev) => prev.filter((p) => p.id !== payment.id));
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
        setPayments((prev) => [data.data, ...prev]);
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

      <div className="flex gap-2 flex-wrap">
        {methods.map((method) => (
          <span key={method} className="px-2.5 py-1 rounded-sm text-xs font-medium border border-border bg-muted text-muted-foreground">
            {methodLabels[method]}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={16} />
            Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Loading payments…</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No payments recorded yet.</p>
              <p className="text-xs mt-1">Record a payment and link it to an invoice to start tracking.</p>
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors"
              >
                <Plus size={13} />
                Record Payment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((payment) => (
                <div key={payment.id} className="px-6 py-4 flex items-start gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-foreground">
                        {payment.invoices?.invoice_number || "Unlinked payment"}
                      </p>
                      <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground uppercase">
                        {methodLabels[payment.method] ?? payment.method}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payment.invoices?.clients?.name || "No client linked"}
                      {payment.reference ? ` · Ref: ${payment.reference}` : ""}
                    </p>
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{payment.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      KES {Number(payment.amount ?? 0).toLocaleString()} ·{" "}
                      {new Date(payment.date || payment.created_at).toLocaleDateString("en-KE")}
                      {" · "}{payment.confirmation_sent ? "Receipt sent" : "Receipt pending"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(payment)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(payment)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
