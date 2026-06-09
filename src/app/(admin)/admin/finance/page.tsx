"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart2, Download, TrendingUp, TrendingDown, DollarSign, Plus, Pencil, Trash2, Info, FileUp, FileText, ExternalLink, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StackedCell, type Column, type RowAction, type FilterConfig } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useConfirm } from "@/components/admin/confirm-dialog";

const tabs = ["Income", "Expenses", "Reports", "Documents"] as const;
type Tab = (typeof tabs)[number];

const expenseCategories = [
  "subcontractor", "subscription", "software", "equipment",
  "transport", "marketing", "office", "tax", "professional_fees",
  "salary", "team_payment", "other",
];
const incomeCategories = ["service_revenue", "retainer", "consulting", "other"];

// Withholding tax types
const WHT_TYPES = [
  { value: "none", label: "None", rate: 0 },
  { value: "consultancy_5", label: "Consultancy (5%)", rate: 5 },
  { value: "professional_5", label: "Professional services (5%)", rate: 5 },
  { value: "management_fees_12", label: "Management fees (12%)", rate: 12 },
  { value: "dividends_5", label: "Dividends (5%)", rate: 5 },
  { value: "interest_15", label: "Interest (15%)", rate: 15 },
  { value: "rent_7_5", label: "Rent (7.5%)", rate: 7.5 },
  { value: "custom", label: "Custom %", rate: 0 },
];

const PIE_COLORS = ["#f9a825", "#152238", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#6b7280", "#0891b2", "#84cc16"];

type IncomeRecord = {
  id: string;
  description?: string;
  amount: number;
  gross_amount?: number | null;
  withholding_tax?: number | null;
  withholding_type?: string | null;
  category: string;
  date: string;
  source: string;
  notes?: string;
  clients?: { name: string } | null;
};
type ExpenseRecord = { id: string; description: string; amount: number; category: string; date: string; vendor?: string; tax_deductible: boolean; notes?: string };

const DOC_TYPES = [
  { value: "etims_invoice", label: "eTIMS Invoice" },
  { value: "supplier_invoice", label: "Supplier Invoice" },
  { value: "client_receipt", label: "Client Receipt" },
  { value: "expense_receipt", label: "Expense Receipt" },
  { value: "other", label: "Other" },
];

type FinanceDoc = {
  id: string;
  doc_type: string;
  direction: string;
  party_name: string;
  invoice_number?: string | null;
  amount?: number | null;
  currency: string;
  doc_date: string;
  original_filename?: string | null;
  size_bytes?: number | null;
  notes?: string | null;
  url?: string | null;
  created_at: string;
};

const defaultDocForm = {
  doc_type: "etims_invoice",
  direction: "income",
  party_name: "",
  invoice_number: "",
  amount: "",
  doc_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const defaultIncome = {
  description: "",
  gross_amount: "",
  withholding_type: "none",
  withholding_rate: "",
  category: "service_revenue",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  source: "other",
};
const defaultExpense = { description: "", amount: "", category: "other", vendor: "", date: new Date().toISOString().slice(0, 10), notes: "", tax_deductible: true };

function computeNet(gross: number, whtType: string, customRate: string) {
  const preset = WHT_TYPES.find((t) => t.value === whtType);
  const rate = whtType === "custom" ? Number(customRate) : (preset?.rate ?? 0);
  const wht = gross * rate / 100;
  return { wht: Math.round(wht * 100) / 100, net: gross - wht, rate };
}

export default function FinancePage() {
  const confirm = useConfirm();
  const { resolvedTheme } = useTheme();
  const chartLabelColor = resolvedTheme === "dark" ? "#97acc6" : "#64748b";
  const [activeTab, setActiveTab] = useState<Tab>("Income");
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<IncomeRecord | null>(null);
  const [incomeForm, setIncomeForm] = useState(defaultIncome);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseRecord | null>(null);
  const [expenseForm, setExpenseForm] = useState(defaultExpense);

  const [saving, setSaving] = useState(false);
  const [activeExpenseCategory, setActiveExpenseCategory] = useState<string>("all");

  // Documents
  const [docs, setDocs] = useState<FinanceDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docDirFilter, setDocDirFilter] = useState("all");
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docForm, setDocForm] = useState(defaultDocForm);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, expRes] = await Promise.all([fetch("/api/admin/finance/income"), fetch("/api/admin/finance/expenses")]);
      const [incJson, expJson] = await Promise.all([incRes.json(), expRes.json()]);
      if (incRes.ok) setIncome(incJson.data ?? []);
      if (expRes.ok) setExpenses(expJson.data ?? []);
    } finally { setLoading(false); }
  }, []);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const url = docDirFilter !== "all" ? `/api/admin/finance/documents?direction=${docDirFilter}` : "/api/admin/finance/documents";
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) setDocs(json.data ?? []);
    } finally { setDocsLoading(false); }
  }, [docDirFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === "Documents") loadDocs(); }, [activeTab, loadDocs]);

  // ── Income form helpers ──────────────────────────────────────────────────────

  const whtPreset = WHT_TYPES.find((t) => t.value === incomeForm.withholding_type);
  const grossNum = Number(incomeForm.gross_amount) || 0;
  const { wht, net, rate: whtRate } = computeNet(grossNum, incomeForm.withholding_type, incomeForm.withholding_rate);

  function openCreateIncome() {
    setEditIncome(null);
    setIncomeForm(defaultIncome);
    setIncomeOpen(true);
  }

  function openEditIncome(r: IncomeRecord) {
    setEditIncome(r);
    const grossRaw = r.gross_amount ?? r.amount;
    const whtVal = r.withholding_type ?? "none";
    const preset = WHT_TYPES.find((t) => t.value === whtVal);
    setIncomeForm({
      description: r.description ?? "",
      gross_amount: String(grossRaw),
      withholding_type: whtVal,
      withholding_rate: whtVal === "custom" ? String(r.withholding_tax && grossRaw ? ((r.withholding_tax / grossRaw) * 100).toFixed(2) : "") : String(preset?.rate ?? ""),
      category: r.category,
      date: r.date,
      notes: r.notes ?? "",
      source: r.source,
    });
    setIncomeOpen(true);
  }

  async function handleIncomeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editIncome ? `/api/admin/finance/income/${editIncome.id}` : "/api/admin/finance/income";
      const method = editIncome ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: incomeForm.description,
          gross_amount: grossNum,
          amount: net,
          withholding_tax: wht,
          withholding_type: incomeForm.withholding_type === "none" ? null : incomeForm.withholding_type,
          category: incomeForm.category,
          date: incomeForm.date,
          notes: incomeForm.notes || undefined,
          source: incomeForm.source || "other",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (editIncome) {
          setIncome((prev) => prev.map((r) => r.id === editIncome.id ? { ...r, ...json.data } : r));
        } else {
          setIncome((prev) => [json.data, ...prev]);
        }
        setIncomeOpen(false);
      }
    } finally { setSaving(false); }
  }

  async function deleteIncome(r: IncomeRecord) {
    if (!await confirm({ message: "Delete this income record? This cannot be undone." })) return;
    await fetch(`/api/admin/finance/income/${r.id}`, { method: "DELETE" });
    setIncome((prev) => prev.filter((i) => i.id !== r.id));
  }

  // ── Expense helpers ──────────────────────────────────────────────────────────

  function openCreateExpense() { setEditExpense(null); setExpenseForm(defaultExpense); setExpenseOpen(true); }

  function openEditExpense(r: ExpenseRecord) {
    setEditExpense(r);
    setExpenseForm({ description: r.description, amount: String(r.amount), category: r.category, vendor: r.vendor ?? "", date: r.date, notes: r.notes ?? "", tax_deductible: r.tax_deductible });
    setExpenseOpen(true);
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editExpense ? `/api/admin/finance/expenses/${editExpense.id}` : "/api/admin/finance/expenses";
      const method = editExpense ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(expenseForm) });
      if (res.ok) {
        const json = await res.json();
        if (editExpense) { setExpenses((prev) => prev.map((r) => r.id === editExpense.id ? { ...r, ...json.data } : r)); }
        else { setExpenses((prev) => [json.data, ...prev]); }
        setExpenseOpen(false);
      }
    } finally { setSaving(false); }
  }

  async function deleteExpense(r: ExpenseRecord) {
    if (!await confirm({ message: "Delete this expense? This cannot be undone." })) return;
    await fetch(`/api/admin/finance/expenses/${r.id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== r.id));
  }

  // ── Document upload ──────────────────────────────────────────────────────────

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
      setDocs((prev) => [json.data, ...prev]);
      setDocUploadOpen(false);
      setDocForm(defaultDocForm);
      setDocFile(null);
    } finally { setDocSaving(false); }
  }

  async function deleteDoc(doc: FinanceDoc) {
    if (!await confirm({ message: `Delete "${doc.original_filename ?? "this document"}"? This cannot be undone.` })) return;
    await fetch(`/api/admin/finance/documents/${doc.id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  // Use net amount (after WHT) for income totals
  const totalIncome = income.reduce((s, r) => s + Number(r.amount), 0);
  const totalWHT = income.reduce((s, r) => s + Number(r.withholding_tax ?? 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const now = new Date();
  const thisMonthIncome = income.filter((r) => { const d = new Date(r.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, r) => s + Number(r.amount), 0);
  const thisMonthExpenses = expenses.filter((r) => { const d = new Date(r.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, r) => s + Number(r.amount), 0);
  const filteredExpenses = activeExpenseCategory === "all" ? expenses : expenses.filter((e) => e.category === activeExpenseCategory);

  // ── Chart data ───────────────────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number }> = {};
    const addMonth = (date: string) => {
      const d = new Date(date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { month: d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" }), income: 0, expenses: 0 };
      return key;
    };
    income.forEach((r) => { const k = addMonth(r.date); months[k].income += Number(r.amount); });
    expenses.forEach((r) => { const k = addMonth(r.date); months[k].expenses += Number(r.amount); });
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([, v]) => v);
  }, [income, expenses]);

  const expensePieData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((r) => { byCategory[r.category] = (byCategory[r.category] ?? 0) + Number(r.amount); });
    return Object.entries(byCategory).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalDeductible = expenses.filter((e) => e.tax_deductible).reduce((s, e) => s + Number(e.amount), 0);

  function handleExport() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
    const rows: string[] = [];

    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    rows.push(`BRIGHTEX SOLUTIONS — P&L REPORT`);
    rows.push(`Generated,${q(dateStr)}`);
    rows.push(``);

    rows.push(`P&L SUMMARY`);
    const grossIncome = income.reduce((s, r) => s + Number(r.gross_amount ?? r.amount), 0);
    rows.push(`Gross Income,KES ${grossIncome.toLocaleString()}`);
    if (totalWHT > 0) rows.push(`Withholding Tax Deducted,KES ${totalWHT.toLocaleString()}`);
    rows.push(`Net Income (received),KES ${totalIncome.toLocaleString()}`);
    rows.push(`Total Expenses,KES ${totalExpenses.toLocaleString()}`);
    rows.push(`Net Profit,KES ${netProfit.toLocaleString()}`);
    rows.push(`Tax-Deductible Expenses,KES ${totalDeductible.toLocaleString()}`);
    rows.push(``);

    rows.push(`INCOME RECORDS`);
    rows.push([`Date`, `Description`, `Category`, `Source`, `Gross Amount`, `WHT`, `Net Received`, `Notes`].map(q).join(`,`));
    income.forEach((r) => {
      rows.push([
        r.date,
        r.description ?? "",
        r.category,
        r.source,
        r.gross_amount ?? r.amount,
        r.withholding_tax ?? 0,
        r.amount,
        r.notes ?? "",
      ].map(q).join(`,`));
    });
    rows.push(``);

    rows.push(`EXPENSE RECORDS`);
    rows.push([`Date`, `Description`, `Category`, `Vendor`, `Amount`, `Tax Deductible`, `Notes`].map(q).join(`,`));
    expenses.forEach((r) => {
      rows.push([
        r.date,
        r.description,
        r.category,
        r.vendor ?? "",
        r.amount,
        r.tax_deductible ? "Yes" : "No",
        r.notes ?? "",
      ].map(q).join(`,`));
    });

    const csv = "﻿" + rows.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightex-pl-report-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">Income, expenses, and P&amp;L reports.</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-border text-sm font-semibold hover:border-brand-gold/40 transition-colors"
        >
          <Download size={15} />Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Income (net)" value={`KES ${totalIncome.toLocaleString()}`} icon={TrendingUp} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Total Expenses" value={`KES ${totalExpenses.toLocaleString()}`} icon={TrendingDown} iconColor="text-red-400" iconBg="bg-red-400/10" />
        <StatCard title="Net Profit" value={`KES ${netProfit.toLocaleString()}`} icon={DollarSign} iconColor={netProfit >= 0 ? "text-brand-gold" : "text-red-400"} iconBg={netProfit >= 0 ? "bg-brand-gold/10" : "bg-red-400/10"} />
        <StatCard title="This Month Net" value={`KES ${(thisMonthIncome - thisMonthExpenses).toLocaleString()}`} icon={BarChart2} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab ? "border-brand-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{tab}</button>
        ))}
      </div>

      {/* ── Income Tab ── */}
      {activeTab === "Income" && (
        <Card className="overflow-hidden">
          <DataTable
            columns={[
              {
                key: "description",
                label: "Income",
                sortable: true,
                render: (row) => {
                  const r = row as unknown as IncomeRecord;
                  const hasWHT = r.withholding_tax && Number(r.withholding_tax) > 0;
                  return (
                    <div className="flex flex-col gap-1 min-w-0">
                      <StackedCell primary={r.description || r.source.replace(/_/g, " ")} secondary={r.clients?.name ?? undefined} />
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground capitalize">{r.category.replace(/_/g, " ")}</span>
                        {hasWHT && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-400/10 text-amber-600 dark:text-amber-400">WHT KES {Number(r.withholding_tax).toLocaleString()}</span>}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "amount",
                label: "Amount (net)",
                render: (row) => {
                  const r = row as unknown as IncomeRecord;
                  const hasWHT = r.withholding_tax && Number(r.withholding_tax) > 0;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">KES {Number(r.amount).toLocaleString()}</span>
                      {hasWHT && <span className="text-[10px] text-muted-foreground">Gross: KES {Number(r.gross_amount ?? r.amount).toLocaleString()}</span>}
                    </div>
                  );
                },
              },
              {
                key: "date",
                label: "Date",
                sortable: true,
                render: (row) => <span className="text-sm text-muted-foreground">{new Date(String(row.date)).toLocaleDateString("en-KE")}</span>,
              },
            ] as Column<Record<string, unknown>>[]}
            data={income as unknown as Record<string, unknown>[]}
            actions={[
              { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEditIncome(row as unknown as IncomeRecord) },
              { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => deleteIncome(row as unknown as IncomeRecord) },
            ] as RowAction<Record<string, unknown>>[]}
            searchable
            searchPlaceholder="Search income…"
            searchKeys={["description", "source"]}
            toolbar={
              <button onClick={openCreateIncome} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-xs hover:bg-brand-gold-hover transition-colors">
                <Plus size={13} />Add Income
              </button>
            }
            maxHeight="480px"
            emptyMessage={loading ? "Loading income records…" : "No income records yet."}
          />
        </Card>
      )}

      {/* ── Expenses Tab ── */}
      {activeTab === "Expenses" && (
        <Card className="overflow-hidden">
          <DataTable
            columns={[
              {
                key: "description",
                label: "Expense",
                sortable: true,
                render: (row) => {
                  const r = row as unknown as ExpenseRecord;
                  return (
                    <div className="flex flex-col gap-1 min-w-0">
                      <StackedCell primary={r.description} secondary={r.vendor ?? undefined} />
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground capitalize">{r.category.replace(/_/g, " ")}</span>
                        {r.tax_deductible && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">deductible</span>}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "amount",
                label: "Amount",
                render: (row) => <span className="text-sm font-semibold text-red-600 dark:text-red-400">KES {Number(row.amount).toLocaleString()}</span>,
              },
              {
                key: "date",
                label: "Date",
                sortable: true,
                render: (row) => <span className="text-sm text-muted-foreground">{new Date(String(row.date)).toLocaleDateString("en-KE")}</span>,
              },
            ] as Column<Record<string, unknown>>[]}
            data={filteredExpenses as unknown as Record<string, unknown>[]}
            actions={[
              { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEditExpense(row as unknown as ExpenseRecord) },
              { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => deleteExpense(row as unknown as ExpenseRecord) },
            ] as RowAction<Record<string, unknown>>[]}
            searchable
            searchPlaceholder="Search expenses…"
            searchKeys={["description", "vendor"]}
            filters={[
              { key: "category", label: "Category", options: [{ label: "All", value: "" }, ...expenseCategories.map((c) => ({ label: c.replace(/_/g, " "), value: c }))] } as FilterConfig,
            ]}
            activeFilters={{ category: activeExpenseCategory === "all" ? "" : activeExpenseCategory }}
            onFilterChange={(key, val) => { if (key === "category") setActiveExpenseCategory(val || "all"); }}
            toolbar={
              <button onClick={openCreateExpense} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-xs hover:bg-brand-gold-hover transition-colors">
                <Plus size={13} />Add Expense
              </button>
            }
            maxHeight="480px"
            emptyMessage={loading ? "Loading expenses…" : "No expenses yet."}
          />
        </Card>
      )}

      {/* ── Reports Tab ── */}
      {activeTab === "Reports" && (
        <div className="space-y-5">
          {/* P&L Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BarChart2 size={16} />P&amp;L Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Gross Income</span>
                <span className="text-sm font-semibold text-foreground">KES {income.reduce((s, r) => s + Number(r.gross_amount ?? r.amount), 0).toLocaleString()}</span>
              </div>
              {totalWHT > 0 && (
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">Withholding Tax deducted <Info size={12} className="text-muted-foreground" /></span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">− KES {totalWHT.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Net Income (received)</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">KES {totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Total Expenses</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">KES {totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-4">
                <span className="text-sm font-bold text-foreground">Net Profit</span>
                <span className={cn("text-base font-bold", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  KES {netProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-3 border-t border-border text-xs text-muted-foreground">
                <span>Tax-deductible expenses</span>
                <span>KES {totalDeductible.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-xs text-muted-foreground">
                <span>This month</span>
                <span>Income KES {thisMonthIncome.toLocaleString()} · Expenses KES {thisMonthExpenses.toLocaleString()} · Net KES {(thisMonthIncome - thisMonthExpenses).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly income vs expenses chart */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Income vs Expenses — Monthly</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartLabelColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: chartLabelColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: 12 }}
                      formatter={(val) => [`KES ${Number(val ?? 0).toLocaleString()}`, undefined]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Income (net)" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Expense breakdown pie */}
          {expensePieData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <ResponsiveContainer width={220} height={200}>
                    <PieChart>
                      <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(val) => [`KES ${Number(val ?? 0).toLocaleString()}`, undefined]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 flex-1">
                    {expensePieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="capitalize text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">KES {d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Documents Tab ── */}
      {activeTab === "Documents" && (
        <Card className="overflow-hidden">
          <DataTable
            columns={[
              {
                key: "party_name",
                label: "Document",
                sortable: true,
                render: (row) => {
                  const doc = row as unknown as FinanceDoc;
                  const typeLabel = DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? doc.doc_type;
                  const isIncome = doc.direction === "income";
                  return (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-sm bg-muted flex items-center justify-center shrink-0">
                        <FileText size={13} className="text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <StackedCell primary={doc.party_name} secondary={doc.original_filename ?? undefined} />
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", isIncome ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-400/10 text-red-600 dark:text-red-400")}>{isIncome ? "income" : "expense"}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{typeLabel}</span>
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "doc_date",
                label: "Date & Ref",
                sortable: true,
                render: (row) => {
                  const doc = row as unknown as FinanceDoc;
                  return (
                    <StackedCell
                      primary={new Date(doc.doc_date).toLocaleDateString("en-KE")}
                      secondary={doc.invoice_number ? `Ref: ${doc.invoice_number}` : undefined}
                    />
                  );
                },
              },
              {
                key: "amount",
                label: "Amount",
                render: (row) => {
                  const doc = row as unknown as FinanceDoc;
                  return doc.amount
                    ? <span className="text-sm font-semibold text-foreground">KES {Number(doc.amount).toLocaleString()}</span>
                    : <span className="text-xs text-muted-foreground">—</span>;
                },
              },
            ] as Column<Record<string, unknown>>[]}
            data={docs as unknown as Record<string, unknown>[]}
            actions={[
              {
                label: "Open",
                icon: <ExternalLink size={13} />,
                onClick: (row) => {
                  const doc = row as unknown as FinanceDoc;
                  if (doc.url) window.open(doc.url, "_blank", "noopener,noreferrer");
                },
              },
              { label: "Delete", icon: <X size={13} />, destructive: true, onClick: (row) => deleteDoc(row as unknown as FinanceDoc) },
            ] as RowAction<Record<string, unknown>>[]}
            searchable
            searchPlaceholder="Search documents…"
            searchKeys={["party_name", "invoice_number"]}
            filters={[
              { key: "direction", label: "Type", options: [{ label: "All", value: "" }, { label: "Income / eTIMS", value: "income" }, { label: "Expense Receipts", value: "expense" }] } as FilterConfig,
            ]}
            activeFilters={{ direction: docDirFilter === "all" ? "" : docDirFilter }}
            onFilterChange={(key, val) => { if (key === "direction") setDocDirFilter(val || "all"); }}
            toolbar={
              <button onClick={() => { setDocUploadOpen(true); setDocError(""); setDocFile(null); setDocForm(defaultDocForm); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-xs hover:bg-brand-gold-hover transition-colors">
                <FileUp size={13} />Upload
              </button>
            }
            maxHeight="480px"
            emptyMessage={docsLoading ? "Loading documents…" : "No documents uploaded yet."}
          />
        </Card>
      )}

      {/* ── Upload Document Dialog ── */}
      <Dialog open={docUploadOpen} onOpenChange={(v) => { if (!v) { setDocUploadOpen(false); setDocError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileUp size={15} className="text-brand-gold" />Upload Financial Document</DialogTitle></DialogHeader>
          <form onSubmit={handleDocUpload} className="space-y-4 mt-2">
            {/* Direction */}
            <div className="grid grid-cols-2 gap-2">
              {[{ v: "income", label: "Income / eTIMS" }, { v: "expense", label: "Expense Receipt" }].map((opt) => (
                <button key={opt.v} type="button" onClick={() => setDocForm((f) => ({ ...f, direction: opt.v }))}
                  className={cn("px-3 py-2.5 rounded-sm border text-xs font-semibold transition-colors",
                    docForm.direction === opt.v ? "border-brand-gold bg-brand-gold/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  )}>{opt.label}
                </button>
              ))}
            </div>

            {/* Doc type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Document Type</label>
              <select value={docForm.doc_type} onChange={(e) => setDocForm((f) => ({ ...f, doc_type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Party name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                {docForm.direction === "income" ? "Issued By (Client / KRA)" : "Vendor / Supplier"}
              </label>
              <Input placeholder="e.g. Beco Interiors Ltd" value={docForm.party_name}
                onChange={(e) => setDocForm((f) => ({ ...f, party_name: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Invoice / ref number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Invoice / Ref No.</label>
                <Input placeholder="e.g. ETR-2026-001" value={docForm.invoice_number}
                  onChange={(e) => setDocForm((f) => ({ ...f, invoice_number: e.target.value }))} />
              </div>
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Amount (KES)</label>
                <Input type="number" min="0" placeholder="e.g. 85000" value={docForm.amount}
                  onChange={(e) => setDocForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Document Date</label>
              <Input type="date" value={docForm.doc_date} onChange={(e) => setDocForm((f) => ({ ...f, doc_date: e.target.value }))} required />
            </div>

            {/* File */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">File (PDF or image)</label>
              <input type="file" accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-sm file:border-0 file:bg-brand-gold/10 file:text-brand-navy dark:file:text-brand-gold file:font-semibold file:text-xs hover:file:bg-brand-gold/20 cursor-pointer" />
              <p className="text-[10px] text-muted-foreground mt-1">PDF, JPEG, PNG or WebP · Max 15 MB</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Notes (optional)</label>
              <Textarea placeholder="Any context about this document…" value={docForm.notes}
                onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="resize-none" />
            </div>

            {docError && <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-sm px-3 py-2">{docError}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setDocUploadOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={docSaving} className="flex-1 bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {docSaving ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Income Dialog (with WHT support) ── */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editIncome ? "Edit Income Record" : "Add Income Record"}</DialogTitle></DialogHeader>
          <form onSubmit={handleIncomeSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input placeholder="e.g. Website project — Beco Interiors" value={incomeForm.description} onChange={(e) => setIncomeForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>

            <div className="space-y-1.5">
              <Label>Gross Amount (KES) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 85000" value={incomeForm.gross_amount} onChange={(e) => setIncomeForm((f) => ({ ...f, gross_amount: e.target.value }))} required />
              <p className="text-xs text-muted-foreground">Enter the full amount before any tax deductions</p>
            </div>

            <div className="space-y-1.5">
              <Label>Withholding Tax (WHT)</Label>
              <select value={incomeForm.withholding_type} onChange={(e) => setIncomeForm((f) => ({ ...f, withholding_type: e.target.value, withholding_rate: "" }))}
                className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {WHT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}{t.rate > 0 ? ` — ${t.rate}%` : ""}</option>)}
              </select>
              {incomeForm.withholding_type === "custom" && (
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" min="0" max="100" step="0.1" placeholder="e.g. 5" value={incomeForm.withholding_rate} onChange={(e) => setIncomeForm((f) => ({ ...f, withholding_rate: e.target.value }))} />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
              {grossNum > 0 && incomeForm.withholding_type !== "none" && (
                <div className="p-3 rounded-sm bg-muted/50 border border-border text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span>KES {grossNum.toLocaleString()}</span></div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400"><span>WHT deducted ({whtRate}%)</span><span>− KES {wht.toLocaleString()}</span></div>
                  <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400 border-t border-border pt-1 mt-1"><span>Net received</span><span>KES {net.toLocaleString()}</span></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={incomeForm.category} onChange={(e) => setIncomeForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  {incomeCategories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={incomeForm.date} onChange={(e) => setIncomeForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea rows={2} value={incomeForm.notes} onChange={(e) => setIncomeForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIncomeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !incomeForm.description || !incomeForm.gross_amount} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editIncome ? "Save Changes" : "Add Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Expense Dialog ── */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editExpense ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input placeholder="e.g. Domain renewal" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (KES) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  {expenseCategories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Vendor <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input placeholder="e.g. Namecheap" value={expenseForm.vendor} onChange={(e) => setExpenseForm((f) => ({ ...f, vendor: e.target.value }))} />
              </div>
            </div>
            <div className="p-3 rounded-sm bg-muted/40 border border-border space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={expenseForm.tax_deductible} onChange={(e) => setExpenseForm((f) => ({ ...f, tax_deductible: e.target.checked }))} className="mt-0.5 rounded border-input" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tax deductible</p>
                  <p className="text-xs text-muted-foreground">Mark if this expense can be offset against taxable income (reduces your net taxable income for KRA filing)</p>
                </div>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea rows={2} value={expenseForm.notes} onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !expenseForm.description || !expenseForm.amount} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editExpense ? "Save Changes" : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
