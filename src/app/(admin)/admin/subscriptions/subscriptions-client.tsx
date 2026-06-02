"use client";

import { useEffect, useState, useCallback } from "react";
import { Rss, Plus, AlertTriangle, Pencil, Trash2, CheckCircle2, Loader2, Building2, Users, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const categories = ["domain", "hosting", "tool", "software", "other"];
const cycles = ["monthly", "yearly", "one_time"];

const OWNERSHIP_OPTIONS = [
  { value: "internal", label: "Internal", description: "Our own business subscription — we pay", icon: Building2, color: "bg-blue-400/10 text-blue-500 dark:text-blue-400" },
  { value: "on_behalf", label: "On Behalf of Client", description: "We pay it, but it's for a client — expense to us", icon: Users, color: "bg-purple-400/10 text-purple-500 dark:text-purple-400" },
  { value: "client_managed", label: "Client Managed", description: "Client pays themselves — we only track it", icon: Lock, color: "bg-muted text-muted-foreground" },
] as const;

const defaultForm = {
  name: "",
  provider: "",
  category: "domain",
  ownership: "internal" as "internal" | "on_behalf" | "client_managed",
  amount: "",
  currency: "KES",
  billing_cycle: "yearly",
  next_renewal_date: "",
  login_url: "",
  notes: "",
};

type Subscription = {
  id: string;
  name: string;
  provider?: string | null;
  category: string;
  ownership?: "internal" | "on_behalf" | "client_managed" | null;
  amount?: number | null;
  currency?: string | null;
  billing_cycle: string;
  next_renewal_date: string;
  last_paid_date?: string | null;
  auto_renew?: boolean | null;
  login_url?: string | null;
  notes?: string | null;
  active?: boolean | null;
  created_at: string;
};

export function SubscriptionsPageClient() {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeOwnership, setActiveOwnership] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/subscriptions");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setSubscriptions(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setError("");
    setOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditTarget(sub);
    setForm({
      name: sub.name,
      provider: sub.provider ?? "",
      category: sub.category,
      ownership: sub.ownership ?? "internal",
      amount: sub.amount != null ? String(sub.amount) : "",
      currency: sub.currency ?? "KES",
      billing_cycle: sub.billing_cycle,
      next_renewal_date: sub.next_renewal_date,
      login_url: sub.login_url ?? "",
      notes: sub.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function handleMarkPaid(sub: Subscription) {
    setMarkingPaidId(sub.id);
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}/mark-paid`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubscriptions((prev) => prev.map((s) => s.id === sub.id ? { ...s, ...json.data } : s));
      }
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: form.amount ? Number(form.amount) : undefined,
        login_url: form.login_url || undefined,
        notes: form.notes || undefined,
      };
      const url = editTarget ? `/api/admin/subscriptions/${editTarget.id}` : "/api/admin/subscriptions";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      if (editTarget) {
        setSubscriptions((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...data.data } : s));
      } else {
        setSubscriptions((prev) => [...prev, data.data].sort((a, b) => a.next_renewal_date.localeCompare(b.next_renewal_date)));
      }
      setOpen(false);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(sub: Subscription) {
    if (!confirm(`Delete "${sub.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/subscriptions/${sub.id}`, { method: "DELETE" });
    setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
  }

  const filteredSubscriptions = subscriptions.filter((s) =>
    (activeCategory === "all" || s.category === activeCategory) &&
    (activeOwnership === "all" || s.ownership === activeOwnership || (!s.ownership && activeOwnership === "internal"))
  );
  const now = new Date();
  const renewingSoon = subscriptions.filter((s) => {
    const d = new Date(s.next_renewal_date);
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 14;
  });
  const monthlyCost = subscriptions.filter((s) => s.billing_cycle === "monthly").reduce((sum, s) => sum + Number(s.amount ?? 0), 0);
  const annualCost = subscriptions.filter((s) => s.billing_cycle === "yearly").reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Track domains, hosting, tools, and renewal dates.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />Add Subscription
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value={subscriptions.length} icon={Rss} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Renewing (14d)" value={renewingSoon.length} icon={AlertTriangle} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Monthly Cost" value={`KES ${monthlyCost.toLocaleString()}`} icon={Rss} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Annual Cost" value={`KES ${annualCost.toLocaleString()}`} icon={Rss} />
      </div>

      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setActiveOwnership("all")} className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${activeOwnership === "all" ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>All ownership</button>
          {OWNERSHIP_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setActiveOwnership(o.value)} className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${activeOwnership === o.value ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>{o.label}</button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setActiveCategory("all")} className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${activeCategory === "all" ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>All categories</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-sm text-xs font-medium border capitalize transition-colors ${activeCategory === cat ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30">
        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {renewingSoon.length > 0 ? `${renewingSoon.length} renewals due soon` : "No upcoming renewals"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {renewingSoon.length > 0 ? "Review these subscriptions before renewal dates slip past." : "Add subscriptions to track renewal dates and get alerts 14 days before they're due."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Rss size={16} />All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && subscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading subscriptions…</p></div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Rss size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No subscriptions tracked yet.</p>
              <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors">
                <Plus size={13} />Add Subscription
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSubscriptions.map((sub) => {
                const ownerDef = OWNERSHIP_OPTIONS.find((o) => o.value === (sub.ownership ?? "internal"));
                const isBusy = markingPaidId === sub.id;
                const canMarkPaid = sub.ownership !== "client_managed";
                const daysToRenewal = Math.ceil((new Date(sub.next_renewal_date).getTime() - Date.now()) / 86400000);
                const isOverdue = daysToRenewal < 0;
                const isDueSoon = daysToRenewal >= 0 && daysToRenewal <= 14;
                return (
                  <div key={sub.id} className="px-6 py-4 flex items-start justify-between gap-4 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{sub.name}</p>
                        <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium border capitalize border-border text-muted-foreground">{sub.category}</span>
                        {ownerDef && (
                          <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium ${ownerDef.color}`}>{ownerDef.label}</span>
                        )}
                        {isOverdue && <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-red-400/10 text-red-500">Overdue</span>}
                        {!isOverdue && isDueSoon && <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-amber-400/10 text-amber-500">Due soon</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sub.provider || "No provider"}
                        {sub.last_paid_date ? ` · Last paid: ${new Date(sub.last_paid_date).toLocaleDateString("en-KE")}` : ""}
                      </p>
                      {sub.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sub.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canMarkPaid && (
                        <button
                          onClick={() => handleMarkPaid(sub)}
                          disabled={isBusy}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm text-xs font-medium border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                          title="Mark as paid — advances renewal date and records expense"
                        >
                          {isBusy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                          Paid
                        </button>
                      )}
                      <button onClick={() => openEdit(sub)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(sub)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{(sub.currency ?? "KES")} {Number(sub.amount ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{sub.billing_cycle.replace("_", " ")}</p>
                      <p className={`text-xs mt-1 ${isOverdue ? "text-red-500 font-medium" : isDueSoon ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
                        {isOverdue ? `${Math.abs(daysToRenewal)}d overdue` : `Renews ${new Date(sub.next_renewal_date).toLocaleDateString("en-KE")}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sub-name">Name *</Label>
                <Input id="sub-name" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Brightex Domain .co.ke" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-provider">Provider</Label>
                <Input id="sub-provider" value={form.provider} onChange={(e) => set("provider", e.target.value)} placeholder="e.g. Namecheap" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => v && set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => v && set("billing_cycle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{cycles.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ownership</Label>
              <Select value={form.ownership} onValueChange={(v) => v && set("ownership", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex flex-col">
                        <span>{o.label}</span>
                        <span className="text-[11px] text-muted-foreground">{o.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sub-amount">Amount (KES)</Label>
                <Input id="sub-amount" type="number" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-renewal">Next Renewal Date *</Label>
                <Input id="sub-renewal" type="date" value={form.next_renewal_date} onChange={(e) => set("next_renewal_date", e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-url">Login URL</Label>
              <Input id="sub-url" type="url" value={form.login_url} onChange={(e) => set("login_url", e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-notes">Notes</Label>
              <Textarea id="sub-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Subscription"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
