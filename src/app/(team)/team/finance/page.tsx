"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Download, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tabs = ["Overview", "Add Expense", "Reports"] as const;
type Tab = (typeof tabs)[number];

const expenseCategories = [
  "subcontractor", "subscription", "software", "equipment",
  "transport", "marketing", "office", "tax", "professional_fees", "other",
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Finance Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Track income, expenses, and generate reports.</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Income", icon: TrendingUp, color: "text-emerald-500" },
          { label: "Total Expenses", icon: TrendingDown, color: "text-red-500" },
          { label: "Net Profit", icon: DollarSign, color: "text-brand-gold" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={14} className={item.color} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">KES —</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-brand-gold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign size={16} />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions recorded yet.</p>
              <p className="text-xs mt-1">Income records appear automatically from payments. Add expenses manually.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Add Expense" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus size={16} />
              Record Expense
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Description *</label>
                <input type="text" placeholder="e.g. Hostinger renewal" className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Amount (KES) *</label>
                <input type="number" placeholder="0.00" className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Category *</label>
                <select className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Date *</label>
                <input type="date" className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes</label>
              <textarea rows={3} placeholder="Optional notes..." className="w-full px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50 resize-none" />
            </div>
            <button className="px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
              Save Expense
            </button>
          </CardContent>
        </Card>
      )}

      {activeTab === "Reports" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Download size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">P&amp;L and tax summary available once Supabase is connected.</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="flex items-center gap-3 p-4 rounded-sm border border-border bg-card hover:border-brand-gold/40 transition-colors text-left">
              <div className="w-9 h-9 rounded-sm bg-brand-gold/10 flex items-center justify-center shrink-0">
                <Download size={16} className="text-brand-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Export CSV</p>
                <p className="text-xs text-muted-foreground">Download for accountant</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-sm border border-border bg-card hover:border-brand-gold/40 transition-colors text-left">
              <div className="w-9 h-9 rounded-sm bg-blue-400/10 flex items-center justify-center shrink-0">
                <Download size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Export PDF</p>
                <p className="text-xs text-muted-foreground">Branded P&amp;L report</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
