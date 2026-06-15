"use client";

import { useEffect, useState, useCallback } from "react";
import { Rss, Plus, AlertTriangle, Pencil, Trash2, CheckCircle2, Loader2, Building2, Users, Lock, ExternalLink, Bell, Mail, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, type Column, type RowAction, type FilterConfig } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/admin/confirm-dialog";

const categories = ["domain", "hosting", "tool", "software", "other"];
const cycles = ["monthly", "yearly", "one_time"];

const OWNERSHIP_OPTIONS = [
  { value: "internal", label: "Internal", description: "Our own business subscription — we pay", icon: Building2, color: "bg-blue-400/10 text-blue-500 dark:text-blue-400" },
  { value: "on_behalf", label: "On Behalf of Client", description: "We pay it, but it's for a client — expense to us", icon: Users, color: "bg-purple-400/10 text-purple-500 dark:text-purple-400" },
  { value: "client_managed", label: "Client Managed", description: "Client pays themselves — we only track it", icon: Lock, color: "bg-muted text-muted-foreground" },
] as const;

type Client = { id: string; name: string; email?: string | null; phone?: string | null };

const defaultForm = {
  name: "",
  provider: "",
  category: "domain",
  ownership: "internal" as "internal" | "on_behalf" | "client_managed",
  client_id: "",
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
  client_id?: string | null;
  clients?: Client | null;
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
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeOwnership, setActiveOwnership] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [busyNotifyIds, setBusyNotifyIds] = useState<Set<string>>(new Set());

  function set(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [subsRes, clientsRes] = await Promise.all([
      fetch("/api/admin/subscriptions"),
      fetch("/api/admin/clients?minimal=1"),
    ]);
    const subsJson = await subsRes.json().catch(() => ({}));
    const clientsJson = await clientsRes.json().catch(() => ({}));
    if (subsRes.ok) setSubscriptions(subsJson.data ?? []);
    if (clientsRes.ok) setClients(clientsJson.data ?? []);
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
      client_id: sub.client_id ?? "",
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

  async function handleNotify(sub: Subscription, channel: "email" | "whatsapp") {
    setBusyNotifyIds((prev) => { const n = new Set(prev); n.add(sub.id); return n; });
    try {
      const res = await fetch(`/api/admin/subscriptions/${sub.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(json.error ?? "Failed to send notification"); return; }
      if (channel === "whatsapp" && json.wa_link) {
        window.open(json.wa_link, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusyNotifyIds((prev) => { const n = new Set(prev); n.delete(sub.id); return n; });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        amount: form.amount ? Number(form.amount) : undefined,
        login_url: form.login_url || undefined,
        notes: form.notes || undefined,
        client_id: form.client_id || undefined,
      };
      // Only send client_id for non-internal ownership
      if (form.ownership === "internal") delete payload.client_id;

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
    if (!await confirm({ message: `Delete "${sub.name}"? This cannot be undone.` })) return;
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

  const needsClientSelector = form.ownership === "on_behalf" || form.ownership === "client_managed";

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

      {loadError && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800/30 text-sm text-red-600 dark:text-red-400">
          {loadError}
          <button onClick={() => setLoadError("")} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value={subscriptions.length} icon={Rss} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Renewing (14d)" value={renewingSoon.length} icon={AlertTriangle} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Monthly Cost" value={`KES ${monthlyCost.toLocaleString()}`} icon={Rss} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Annual Cost" value={`KES ${annualCost.toLocaleString()}`} icon={Rss} />
      </div>

      {renewingSoon.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {renewingSoon.length} renewal{renewingSoon.length !== 1 ? "s" : ""} due in the next 14 days — review before they slip past.
          </p>
        </div>
      )}

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "name",
              label: "Subscription",
              sortable: true,
              render: (row) => {
                const s = row as unknown as Subscription;
                const ownerDef = OWNERSHIP_OPTIONS.find((o) => o.value === (s.ownership ?? "internal"));
                return (
                  <div className="flex flex-col gap-1 min-w-0">
                    <StackedCell primary={s.name} secondary={s.provider ?? undefined} />
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground capitalize">{s.category}</span>
                      {ownerDef && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ownerDef.color}`}>{ownerDef.label}</span>}
                      {s.clients && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-400/10 text-sky-600 dark:text-sky-400">
                          {s.clients.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "amount",
              label: "Cost",
              render: (row) => {
                const s = row as unknown as Subscription;
                return (
                  <StackedCell
                    primary={`${s.currency ?? "KES"} ${Number(s.amount ?? 0).toLocaleString()}`}
                    secondary={s.billing_cycle.replace(/_/g, " ")}
                  />
                );
              },
            },
            {
              key: "next_renewal_date",
              label: "Renewal",
              sortable: true,
              render: (row) => {
                const s = row as unknown as Subscription;
                const daysToRenewal = Math.ceil((new Date(s.next_renewal_date).getTime() - Date.now()) / 86400000);
                const isOverdue = daysToRenewal < 0;
                const isDueSoon = daysToRenewal >= 0 && daysToRenewal <= 14;
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">{new Date(s.next_renewal_date).toLocaleDateString("en-KE")}</span>
                    <span className={`text-xs font-medium ${isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-muted-foreground"}`}>
                      {isOverdue ? `${Math.abs(daysToRenewal)}d overdue` : isDueSoon ? `${daysToRenewal}d to renew` : `${daysToRenewal}d remaining`}
                    </span>
                  </div>
                );
              },
            },
            {
              key: "actions_inline",
              label: "",
              className: "w-40",
              render: (row) => {
                const s = row as unknown as Subscription;
                const isBusy = markingPaidId === s.id;
                const isNotifyBusy = busyNotifyIds.has(s.id);
                const canMarkPaid = s.ownership !== "client_managed";
                const hasClient = !!s.clients;
                return (
                  <div className="flex items-center gap-1.5">
                    {canMarkPaid && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkPaid(s); }}
                        disabled={isBusy}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Paid
                      </button>
                    )}
                    {hasClient && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          disabled={isNotifyBusy}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-sky-400/10 text-sky-600 dark:text-sky-400 hover:bg-sky-400/20 transition-colors disabled:opacity-50"
                        >
                          {isNotifyBusy ? <Loader2 size={10} className="animate-spin" /> : <Bell size={10} />} Notify
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleNotify(s, "email")} disabled={!s.clients?.email}>
                            <Mail size={13} className="mr-2" />
                            {s.clients?.email ? `Email ${s.clients.name}` : "No email on file"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNotify(s, "whatsapp")} disabled={!s.clients?.phone}>
                            <MessageSquare size={13} className="mr-2" />
                            {s.clients?.phone ? `WhatsApp ${s.clients.name}` : "No phone on file"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {s.login_url && (
                      <a href={s.login_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-muted-foreground hover:text-brand-gold transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filteredSubscriptions as unknown as Record<string, unknown>[]}
          actions={[
            { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEdit(row as unknown as Subscription) },
            { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => handleDelete(row as unknown as Subscription) },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search subscriptions…"
          searchKeys={["name", "provider", "category"]}
          filters={[
            { key: "category", label: "Category", options: [{ label: "All", value: "" }, ...categories.map((c) => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))] } as FilterConfig,
            { key: "ownership", label: "Ownership", options: [{ label: "All", value: "" }, ...OWNERSHIP_OPTIONS.map((o) => ({ label: o.label, value: o.value }))] } as FilterConfig,
          ]}
          activeFilters={{ category: activeCategory === "all" ? "" : activeCategory, ownership: activeOwnership === "all" ? "" : activeOwnership }}
          onFilterChange={(key, val) => {
            if (key === "category") setActiveCategory(val || "all");
            if (key === "ownership") setActiveOwnership(val || "all");
          }}
          maxHeight="520px"
          emptyMessage={loading ? "Loading subscriptions…" : "No subscriptions tracked yet."}
        />
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
            {needsClientSelector && (
              <div className="space-y-1.5">
                <Label>Linked Client</Label>
                <Select value={form.client_id} onValueChange={(v) => set("client_id", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          {c.email && <span className="text-[11px] text-muted-foreground">{c.email}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Link a client so renewal reminders are automatically sent to their email.</p>
              </div>
            )}
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
