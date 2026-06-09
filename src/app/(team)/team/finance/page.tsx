"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Download, Plus, FileText,
  Loader2, CheckCircle2, AlertCircle, Clock, X, FileUp, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type Summary = { total_income: number; total_expenses: number; net_profit: number };

type IncomeRecord = {
  id: string; source: string; description?: string | null;
  amount: number; currency: string; date: string; category: string;
  clients?: { name: string } | null;
};

type Expense = {
  id: string; description: string; category: string;
  amount: number; currency: string; date: string;
  vendor?: string | null; reference?: string | null; tax_deductible: boolean;
};

type Invoice = {
  id: string; invoice_number: string; total: number; status: string;
  due_date?: string | null; created_at: string;
  clients?: { name: string; email?: string } | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Invoices & Payments", "Expenses", "Reports", "Documents"] as const;
type Tab = typeof TABS[number];

const DOC_TYPES = [
  { value: "etims_invoice", label: "eTIMS Invoice" },
  { value: "supplier_invoice", label: "Supplier Invoice" },
  { value: "client_receipt", label: "Client Receipt" },
  { value: "expense_receipt", label: "Expense Receipt" },
  { value: "other", label: "Other" },
];

type FinanceDoc = {
  id: string; doc_type: string; direction: string; party_name: string;
  invoice_number?: string | null; amount?: number | null; currency: string;
  doc_date: string; original_filename?: string | null; notes?: string | null; url?: string | null;
};

const emptyDocForm = {
  doc_type: "etims_invoice", direction: "income", party_name: "",
  invoice_number: "", amount: "", doc_date: new Date().toISOString().split("T")[0], notes: "",
};

const EXPENSE_CATEGORIES = [
  "subcontractor", "subscription", "software", "equipment",
  "transport", "marketing", "office", "tax", "professional_fees",
  "salary", "team_payment", "other",
];

const PAYMENT_METHODS = ["mpesa", "bank", "paypal", "cash"] as const;

const INVOICE_STATUS_STYLE: Record<string, string> = {
  draft:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  sent:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  overdue:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  paid:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled:"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const emptyExpenseForm = {
  description: "", amount: "", category: "other", date: new Date().toISOString().split("T")[0],
  vendor: "", reference: "", tax_deductible: true, notes: "",
};

const emptyPayForm = {
  amount: "", method: "mpesa" as typeof PAYMENT_METHODS[number],
  reference: "", date: new Date().toISOString().split("T")[0],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("Overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseSaved, setExpenseSaved] = useState(false);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  // Documents
  const [docs, setDocs] = useState<FinanceDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docDirFilter, setDocDirFilter] = useState("all");
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, incRes, expRes, invRes] = await Promise.all([
        fetch("/api/admin/finance?type=summary").then(r => r.json()),
        fetch("/api/admin/finance?type=income").then(r => r.json()),
        fetch("/api/admin/finance?type=expenses").then(r => r.json()),
        fetch("/api/admin/invoices").then(r => r.json()),
      ]);
      setSummary(sumRes.data ?? null);
      setIncome(incRes.data ?? []);
      setExpenses(expRes.data ?? []);
      setInvoices(invRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const url = docDirFilter !== "all" ? `/api/admin/finance/documents?direction=${docDirFilter}` : "/api/admin/finance/documents";
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) setDocs(json.data ?? []);
    } finally { setDocsLoading(false); }
  }, [docDirFilter]);

  useEffect(() => { if (tab === "Documents") loadDocs(); }, [tab, loadDocs]);

  async function handleDocUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) { setDocError("Please select a file."); return; }
    setDocSaving(true);
    setDocError("");
    try {
      const fd = new FormData();
      fd.append("file", docFile);
      fd.append("doc_type", docForm.doc_type);
      fd.append("direction", docForm.direction);
      fd.append("party_name", docForm.party_name);
      if (docForm.invoice_number) fd.append("invoice_number", docForm.invoice_number);
      if (docForm.amount) fd.append("amount", docForm.amount);
      fd.append("doc_date", docForm.doc_date);
      if (docForm.notes) fd.append("notes", docForm.notes);
      const res = await fetch("/api/admin/finance/documents", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setDocError(json.error ?? "Upload failed."); return; }
      setDocs(prev => [json.data, ...prev]);
      setDocUploadOpen(false);
      setDocForm(emptyDocForm);
      setDocFile(null);
    } catch { setDocError("Network error."); }
    finally { setDocSaving(false); }
  }

  async function deleteDoc(doc: FinanceDoc) {
    if (!await confirm({ message: `Delete "${doc.original_filename ?? "this document"}"? This cannot be undone.` })) return;
    await fetch(`/api/admin/finance/documents/${doc.id}`, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  // ── Record Payment ──────────────────────────────────────────────────────────

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: payTarget.id,
          amount: parseFloat(payForm.amount),
          method: payForm.method,
          reference: payForm.reference || undefined,
          date: payForm.date,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setPayError(json.error ?? "Failed to record payment"); return; }
      setPayTarget(null);
      setPayForm(emptyPayForm);
      await load();
    } catch { setPayError("Network error"); }
    finally { setPaying(false); }
  }

  // ── Add Expense ─────────────────────────────────────────────────────────────

  async function handleExpense(e: React.FormEvent) {
    e.preventDefault();
    setSavingExpense(true);
    setExpenseError("");
    setExpenseSaved(false);
    try {
      const res = await fetch("/api/admin/finance?type=expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          date: expenseForm.date,
          vendor: expenseForm.vendor || undefined,
          reference: expenseForm.reference || undefined,
          tax_deductible: expenseForm.tax_deductible,
          notes: (expenseForm as unknown as { notes?: string }).notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setExpenseError(json.error ?? "Failed to save"); return; }
      setExpenses(prev => [json.data, ...prev]);
      setExpenseForm(emptyExpenseForm);
      setExpenseSaved(true);
      // refresh summary
      fetch("/api/admin/finance?type=summary").then(r => r.json()).then(d => setSummary(d.data ?? null));
    } catch { setExpenseError("Network error"); }
    finally { setSavingExpense(false); }
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  function exportCSV() {
    const rows = [
      ["Date", "Type", "Description", "Category/Source", "Amount (KES)"],
      ...income.map(r => [r.date, "Income", r.description ?? r.source, r.category, String(r.amount)]),
      ...expenses.map(r => [r.date, "Expense", r.description, r.category, `-${r.amount}`]),
    ].sort((a, b) => b[0].localeCompare(a[0]));

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightex-finance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Merged recent transactions ──────────────────────────────────────────────

  const transactions = [
    ...income.slice(0, 20).map(r => ({ id: r.id, date: r.date, type: "income" as const, label: r.description ?? r.source, sub: r.clients?.name ?? r.category, amount: Number(r.amount) })),
    ...expenses.slice(0, 20).map(r => ({ id: r.id, date: r.date, type: "expense" as const, label: r.description, sub: r.category, amount: Number(r.amount) })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);

  const filteredInvoices = invoices.filter(inv =>
    invoiceFilter === "all" || inv.status === invoiceFilter
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">Income, payments, expenses, and reports.</p>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
          <Download size={14} />Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-border bg-card p-5 h-24 animate-pulse" />
          ))
        ) : (
          <>
            <KpiCard label="Total Income" value={summary?.total_income ?? 0} icon={TrendingUp} color="text-emerald-500" />
            <KpiCard label="Total Expenses" value={summary?.total_expenses ?? 0} icon={TrendingDown} color="text-red-500" />
            <KpiCard
              label="Net Profit"
              value={summary?.net_profit ?? 0}
              icon={DollarSign}
              color={(summary?.net_profit ?? 0) >= 0 ? "text-brand-gold" : "text-red-500"}
            />
          </>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              tab === t ? "border-brand-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "Overview" && (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign size={14} />Recent Transactions</h2>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <DollarSign size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      tx.type === "income" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30")}>
                      {tx.type === "income"
                        ? <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
                        : <TrendingDown size={12} className="text-red-600 dark:text-red-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tx.sub.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-semibold", tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                      {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDate(tx.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Invoices & Payments ── */}
      {tab === "Invoices & Payments" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-1 flex-wrap">
            {["all", "sent", "overdue", "paid", "draft"].map(s => (
              <button key={s} onClick={() => setInvoiceFilter(s)}
                className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors capitalize",
                  invoiceFilter === s ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground")}>
                {s === "all" ? "All Invoices" : s}
              </button>
            ))}
          </div>

          <div className="rounded-sm border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No invoices found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="hidden sm:grid grid-cols-[1fr_160px_120px_100px_120px] gap-3 px-5 py-2.5 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Invoice / Client</span><span>Amount</span><span>Due</span><span>Status</span><span />
                </div>
                {filteredInvoices.map(inv => (
                  <div key={inv.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_120px_100px_120px] gap-2 sm:gap-3 px-5 py-3.5 items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.clients?.name ?? "—"}</p>
                    </div>
                    <p className="text-sm font-medium text-foreground">{fmt(inv.total)}</p>
                    <p className="text-xs text-muted-foreground">{inv.due_date ? fmtDate(inv.due_date) : "—"}</p>
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize w-fit",
                      INVOICE_STATUS_STYLE[inv.status] ?? "bg-muted text-muted-foreground")}>
                      {inv.status}
                    </span>
                    <div className="flex justify-end">
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <button
                          onClick={() => { setPayTarget(inv); setPayForm({ ...emptyPayForm, amount: String(inv.total) }); setPayError(""); }}
                          className="px-3 py-1.5 rounded-sm bg-brand-gold text-brand-navy text-xs font-semibold hover:bg-brand-gold-hover transition-colors">
                          Record Payment
                        </button>
                      )}
                      {inv.status === "paid" && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={12} />Paid
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Expenses ── */}
      {tab === "Expenses" && (
        <div className="space-y-4">
          {/* Add expense form */}
          <div className="rounded-sm border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4"><Plus size={14} />Record Expense</h2>
            <form onSubmit={handleExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Description *">
                  <input required value={expenseForm.description}
                    onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Hostinger renewal"
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
                <Field label="Amount (KES) *">
                  <input required type="number" min="0" step="0.01" value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
                <Field label="Category *">
                  <select value={expenseForm.category}
                    onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </Field>
                <Field label="Date *">
                  <input required type="date" value={expenseForm.date}
                    onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
                <Field label="Vendor">
                  <input value={expenseForm.vendor}
                    onChange={e => setExpenseForm(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
                <Field label="Reference">
                  <input value={expenseForm.reference}
                    onChange={e => setExpenseForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="Receipt/ref no."
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="taxded" checked={expenseForm.tax_deductible}
                  onChange={e => setExpenseForm(f => ({ ...f, tax_deductible: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="taxded" className="text-sm text-muted-foreground">Tax deductible</label>
              </div>
              {expenseError && <p className="text-sm text-red-500">{expenseError}</p>}
              {expenseSaved && (
                <p className="text-sm text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={13} />Expense saved.</p>
              )}
              <button type="submit" disabled={savingExpense}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60">
                {savingExpense ? <><Loader2 size={14} className="animate-spin" />Saving…</> : "Save Expense"}
              </button>
            </form>
          </div>

          {/* Expense list */}
          <div className="rounded-sm border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Expense History</h2>
            </div>
            {expenses.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No expenses recorded yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {expenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between px-5 py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {exp.category.replace(/_/g, " ")}{exp.vendor ? ` · ${exp.vendor}` : ""}
                        {!exp.tax_deductible && " · Non-deductible"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-red-500">-{fmt(exp.amount)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(exp.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reports ── */}
      {tab === "Reports" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ReportStat label="Total Revenue" value={summary?.total_income ?? 0} color="text-emerald-600 dark:text-emerald-400" />
            <ReportStat label="Total Costs" value={summary?.total_expenses ?? 0} color="text-red-500" />
            <ReportStat
              label="Net Profit / Loss"
              value={summary?.net_profit ?? 0}
              color={(summary?.net_profit ?? 0) >= 0 ? "text-brand-gold" : "text-red-500"}
            />
          </div>

          <div className="rounded-sm border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Income Breakdown</h2>
            {income.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income records.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(
                  income.reduce<Record<string, number>>((acc, r) => {
                    acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
                    return acc;
                  }, {})
                ).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{cat.replace(/_/g, " ")}</span>
                    <span className="font-medium text-foreground">{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-sm border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Expense Breakdown</h2>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(
                  expenses.reduce<Record<string, number>>((acc, r) => {
                    acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
                    return acc;
                  }, {})
                ).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{cat.replace(/_/g, " ")}</span>
                    <span className="font-medium text-red-500">-{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={exportCSV}
            className="flex items-center gap-3 p-4 rounded-sm border border-border bg-card hover:border-brand-gold/40 transition-colors w-full text-left">
            <div className="w-9 h-9 rounded-sm bg-brand-gold/10 flex items-center justify-center shrink-0">
              <Download size={16} className="text-brand-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Export CSV</p>
              <p className="text-xs text-muted-foreground">All income and expenses — for accountant or KRA</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Documents ── */}
      {tab === "Documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              {[
                { v: "all", label: "All" },
                { v: "income", label: "Income / eTIMS" },
                { v: "expense", label: "Receipts" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setDocDirFilter(opt.v)}
                  className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
                    docDirFilter === opt.v ? "bg-brand-gold/10 border-brand-gold/40 text-brand-navy dark:text-brand-gold" : "border-border text-muted-foreground hover:text-foreground"
                  )}>{opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setDocUploadOpen(true); setDocError(""); setDocFile(null); setDocForm(emptyDocForm); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-xs hover:bg-brand-gold-hover transition-colors">
              <FileUp size={13} />Upload Document
            </button>
          </div>

          <div className="rounded-sm border border-border bg-card overflow-hidden">
            {docsLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />Loading…
              </div>
            ) : docs.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground">
                <FileText size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No documents uploaded yet.</p>
                <p className="text-xs mt-1">Upload eTIMS invoices, supplier invoices, and receipts here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {docs.map(doc => {
                  const typeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type;
                  const isIncome = doc.direction === "income";
                  return (
                    <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 group">
                      <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{doc.party_name}</p>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            isIncome ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-400/10 text-red-600 dark:text-red-400"
                          )}>{isIncome ? "income" : "expense"}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{typeLabel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(doc.doc_date)}
                          {doc.invoice_number ? ` · Ref: ${doc.invoice_number}` : ""}
                          {doc.amount ? ` · KES ${Number(doc.amount).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button onClick={() => deleteDoc(doc)}
                          className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload Document Dialog ── */}
      {docUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-sm border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileUp size={15} className="text-brand-gold" />Upload Financial Document
              </h2>
              <button onClick={() => setDocUploadOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDocUpload} className="p-5 space-y-4">
              {/* Direction */}
              <div className="grid grid-cols-2 gap-2">
                {[{ v: "income", label: "Income / eTIMS" }, { v: "expense", label: "Expense Receipt" }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setDocForm(f => ({ ...f, direction: opt.v }))}
                    className={cn("px-3 py-2.5 rounded-sm border text-xs font-semibold transition-colors",
                      docForm.direction === opt.v ? "border-brand-gold bg-brand-gold/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    )}>{opt.label}
                  </button>
                ))}
              </div>

              <Field label="Document Type">
                <select value={docForm.doc_type} onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field label={docForm.direction === "income" ? "Issued By (Client / KRA)" : "Vendor / Supplier"}>
                <input required value={docForm.party_name} onChange={e => setDocForm(f => ({ ...f, party_name: e.target.value }))}
                  placeholder="e.g. Beco Interiors Ltd"
                  className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Invoice / Ref No.">
                  <input value={docForm.invoice_number} onChange={e => setDocForm(f => ({ ...f, invoice_number: e.target.value }))}
                    placeholder="e.g. ETR-2026-001"
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
                <Field label="Amount (KES)">
                  <input type="number" min="0" value={docForm.amount} onChange={e => setDocForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 85000"
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
              </div>

              <Field label="Document Date *">
                <input required type="date" value={docForm.doc_date} onChange={e => setDocForm(f => ({ ...f, doc_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
              </Field>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">File (PDF or image) *</label>
                <input type="file" accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-sm file:border-0 file:bg-brand-gold/10 file:text-brand-navy dark:file:text-brand-gold file:font-semibold file:text-xs hover:file:bg-brand-gold/20 cursor-pointer" />
                <p className="text-[10px] text-muted-foreground mt-1">PDF, JPEG, PNG or WebP · Max 15 MB</p>
              </div>

              <Field label="Notes (optional)">
                <textarea value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any context about this document…"
                  className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50 resize-none" />
              </Field>

              {docError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-sm px-3 py-2">{docError}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setDocUploadOpen(false)}
                  className="flex-1 py-2.5 rounded-sm border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={docSaving}
                  className="flex-1 py-2.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60">
                  {docSaving ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Payment Dialog ── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-sm border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Record Payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{payTarget.invoice_number} · {payTarget.clients?.name}</p>
              </div>
              <button onClick={() => setPayTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-5 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-sm bg-muted/40 border border-border">
                <FileText size={13} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Invoice total</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(payTarget.total)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (KES) *">
                  <input required type="number" min="0.01" step="0.01" value={payForm.amount}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
                <Field label="Date *">
                  <input required type="date" value={payForm.date}
                    onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
                </Field>
              </div>
              <Field label="Method *">
                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value as typeof PAYMENT_METHODS[number] }))}
                  className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ").toUpperCase()}</option>)}
                </select>
              </Field>
              <Field label="Reference / M-Pesa Code">
                <input value={payForm.reference}
                  onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="Optional but recommended"
                  className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
              </Field>
              {payError && (
                <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={13} />{payError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPayTarget(null)}
                  className="flex-1 py-2.5 rounded-sm border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={paying}
                  className="flex-1 py-2.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {paying ? <><Loader2 size={13} className="animate-spin" />Recording…</> : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className={color} />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-xl font-display font-bold", color)}>
        {Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">KES</p>
    </div>
  );
}

function ReportStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-bold font-display", color)}>
        KES {Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
