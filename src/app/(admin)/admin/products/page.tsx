"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

const tabs = ["Products", "Trials", "Subscriptions"] as const;
type Tab = (typeof tabs)[number];

const categories = ["erp", "crm", "booking", "analytics", "hospitality", "other"];

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Products");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage Brightex-built licensable software products.</p>
        </div>
        {activeTab === "Products" && (
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
            <Plus size={15} />
            New Product
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Published" value="—" icon={Package} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Active Trials" value="—" icon={Package} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Subscriptions" value="—" icon={Package} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="MRR" value="KES —" icon={Package} />
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

      {/* Products */}
      {activeTab === "Products" && (
        <div className="space-y-4">
          <div className="flex gap-1 flex-wrap">
            <button className="px-3 py-1.5 rounded-sm text-xs font-medium bg-muted text-foreground border-transparent border">All</button>
            {categories.map((cat) => (
              <button key={cat} className="px-3 py-1.5 rounded-sm text-xs font-medium border border-border text-muted-foreground hover:text-foreground uppercase text-[10px] tracking-wider transition-colors">
                {cat}
              </button>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No products yet.</p>
                <p className="text-xs mt-1">Create a product to display it on the public /products page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trials */}
      {activeTab === "Trials" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package size={16} />
              Active Trials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No trial requests yet.</p>
              <p className="text-xs mt-1">Trial requests appear here when visitors submit the trial form on a product page.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions */}
      {activeTab === "Subscriptions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package size={16} />
              Product Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No active subscriptions yet.</p>
              <p className="text-xs mt-1">Subscriptions appear when trials convert to paid plans.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
