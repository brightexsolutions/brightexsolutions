"use client";

import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

const tabs = ["FAQ Manager", "Sessions", "Analytics"] as const;
type Tab = (typeof tabs)[number];

const categories = ["services", "products", "pricing", "process", "general"];

export default function BrixoChatPage() {
  const [activeTab, setActiveTab] = useState<Tab>("FAQ Manager");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Brixo Chat</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage FAQ responses and review visitor chat sessions.</p>
        </div>
        {activeTab === "FAQ Manager" && (
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
            <Plus size={15} />
            Add FAQ
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total FAQs" value="—" icon={MessageSquare} />
        <StatCard title="Sessions (30d)" value="—" icon={MessageSquare} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Bot Resolution" value="—%" icon={MessageSquare} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Escalated" value="—" icon={MessageSquare} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
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

      {/* FAQ Manager */}
      {activeTab === "FAQ Manager" && (
        <div className="space-y-4">
          {/* Category filters */}
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 rounded-sm text-xs font-medium bg-muted text-foreground border-transparent border">All</button>
            {categories.map((cat) => (
              <button key={cat} className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground capitalize transition-colors">
                {cat}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare size={16} />
                FAQ Pairs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No FAQ entries yet.</p>
                <p className="text-xs mt-1">Add question/answer pairs to power Brixo's responses.</p>
              </div>
            </CardContent>
          </Card>

          {/* Test bot panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-normal">Test Brixo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-sm bg-muted/30 p-4 min-h-[120px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Type a message to test FAQ matching — available once FAQs are added.</p>
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="Type a test message..."
                  className="flex-1 px-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                  disabled
                />
                <button disabled className="px-3 py-2 rounded-sm bg-brand-gold/50 text-brand-navy text-sm font-medium cursor-not-allowed">
                  Send
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions */}
      {activeTab === "Sessions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare size={16} />
              Chat Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No sessions yet.</p>
              <p className="text-xs mt-1">Visitor chat sessions will appear here once the Brixo widget is live.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics */}
      {activeTab === "Analytics" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Total sessions this month", value: "—" },
            { label: "Bot resolution rate", value: "—%" },
            { label: "WhatsApp escalation rate", value: "—%" },
            { label: "Most matched FAQ", value: "—" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                <p className="text-2xl font-display font-bold text-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
