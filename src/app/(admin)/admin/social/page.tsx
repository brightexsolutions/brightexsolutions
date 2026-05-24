"use client";

import { useState } from "react";
import { BarChart3, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

const tabs = ["Calendar", "All Posts", "Pending Approval"] as const;
type Tab = (typeof tabs)[number];

const statusColors: Record<string, string> = {
  draft: "bg-slate-400/10 text-slate-500 border-slate-200 dark:border-slate-700",
  pending_approval: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  approved: "bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  posted: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function SocialMediaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Calendar");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Social Media</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan, approve, and track content across platforms.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Scheduled" value="—" icon={BarChart3} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Pending Approval" value="—" icon={BarChart3} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Posted (30 days)" value="—" icon={BarChart3} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Drafts" value="—" icon={BarChart3} />
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

      {/* Calendar tab */}
      {activeTab === "Calendar" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} />
              Content Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No posts scheduled yet.</p>
              <p className="text-xs mt-1">Create a post with a scheduled date to see it appear here.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Posts tab */}
      {activeTab === "All Posts" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No posts yet.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending tab */}
      {activeTab === "Pending Approval" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No posts awaiting approval.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status legend */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <span key={status} className={`px-2.5 py-1 rounded-sm text-xs font-medium border capitalize ${color}`}>
            {status.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
