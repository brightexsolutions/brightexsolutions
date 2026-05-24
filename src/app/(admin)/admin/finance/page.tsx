"use client";

import { useState } from "react";
import { BarChart2, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

const tabs = ["Income", "Expenses", "Reports"] as const;
type Tab = (typeof tabs)[number];

const expenseCategories = [
  "subcontractor", "subscription", "software", "equipment",
  "transport", "marketing", "office", "tax", "professional_fees", "other",
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Income");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">Income, expenses, and P&amp;L reports.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Download size={15} />
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Income" value="KES —" icon={TrendingUp} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Total Expenses" value="KES —" icon={TrendingDown} iconColor="text-red-400" iconBg="bg-red-400/10" />
        <StatCard title="Net Profit" value="KES —" icon={DollarSign} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="This Month" value="KES —" icon={BarChart2} />
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

      {/* Income Tab */}
      {activeTab === "Income" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} />
              Income Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No income records yet.</p>
              <p className="text-xs mt-1">Records appear automatically when payments are received. You can also add manual entries.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Tab */}
      {activeTab === "Expenses" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {expenseCategories.map((cat) => (
              <span key={cat} className="px-2.5 py-1 rounded-sm text-xs font-medium border border-border bg-muted text-muted-foreground capitalize">
                {cat.replace("_", " ")}
              </span>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown size={16} />
                Expense Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingDown size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No expenses recorded yet.</p>
                <p className="text-xs mt-1">Add expenses manually or they appear from subcontractor payouts and subscriptions.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "Reports" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 size={16} />
                Profit &amp; Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart2 size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No report data yet.</p>
                <p className="text-xs mt-1">P&amp;L and tax summary generate automatically from income and expense records.</p>
              </div>
            </CardContent>
          </Card>

          {/* Export options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="flex items-center gap-3 p-4 rounded-sm border border-border bg-card hover:border-brand-gold/40 transition-colors text-left">
              <div className="w-9 h-9 rounded-sm bg-brand-gold/10 flex items-center justify-center shrink-0">
                <Download size={16} className="text-brand-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Export CSV</p>
                <p className="text-xs text-muted-foreground">Download for accountant / spreadsheet</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-sm border border-border bg-card hover:border-brand-gold/40 transition-colors text-left">
              <div className="w-9 h-9 rounded-sm bg-blue-400/10 flex items-center justify-center shrink-0">
                <Download size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Export PDF</p>
                <p className="text-xs text-muted-foreground">Branded Brightex P&amp;L report</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
