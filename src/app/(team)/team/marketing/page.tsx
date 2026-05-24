"use client";

import { useState } from "react";
import { BarChart3, Plus, CheckCircle2, Clock, FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tabs = ["My Drafts", "Scheduled", "Posted"] as const;
type Tab = (typeof tabs)[number];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("My Drafts");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Draft posts, submit for approval, and track scheduled content.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          New Draft
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "My Drafts", value: "—", icon: FileEdit, color: "text-slate-500" },
          { label: "Pending Approval", value: "—", icon: Clock, color: "text-amber-500" },
          { label: "Posted", value: "—", icon: CheckCircle2, color: "text-emerald-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className={s.color} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 size={16} />
            {activeTab}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {activeTab === "My Drafts"
                ? "No drafts yet. Create your first post."
                : activeTab === "Scheduled"
                ? "No scheduled posts."
                : "No posted content yet."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
