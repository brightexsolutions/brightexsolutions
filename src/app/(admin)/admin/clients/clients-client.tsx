"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, Pencil, Trash2, Loader2, PanelRightOpen } from "lucide-react";
import { QuickClientPanel } from "@/components/admin/quick-client-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn, normalisePhone } from "@/lib/utils";

const classificationColors: Record<string, string> = {
  lead: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  qualified: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  unqualified: "bg-slate-400/10 text-slate-400 border-slate-400/20",
  ghost: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  active: "bg-brand-gold/10 text-brand-gold border-brand-gold/20",
  past: "bg-muted text-muted-foreground border-border",
};

const tabs = ["All", "Leads", "Qualified", "Active", "Unqualified", "Ghost", "Past"];

const emptyForm = { name: "", email: "", phone: "", company: "", classification: "lead", source: "direct", notes: "" };

type Client = {
  id: string; name: string; email?: string | null; phone?: string | null;
  company?: string | null; classification: string; source?: string | null;
  notes?: string | null; last_contacted_at?: string | null; created_at: string;
};

export function ClientsPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [open, setOpen] = useState(false);
  const [panelClientId, setPanelClientId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/clients");
    const json = await res.json();
    if (res.ok) setClients(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditTarget(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      company: client.company ?? "",
      classification: client.classification,
      source: client.source ?? "direct",
      notes: client.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editTarget ? `/api/admin/clients/${editTarget.id}` : "/api/admin/clients";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save"); return; }
      if (editTarget) {
        setClients((prev) => prev.map((c) => c.id === editTarget.id ? json.data : c));
      } else {
        setClients((prev) => [json.data, ...prev]);
      }
      setOpen(false);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Delete ${client.name}? This cannot be undone.`)) return;
    setBusyId(client.id);
    try {
      await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== client.id));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = clients.filter((c) =>
    activeTab === "All" || c.classification.toLowerCase() === activeTab.toLowerCase().replace(/s$/, "")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your client directory and pipeline.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <UserPlus size={15} />Add Client
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={clients.length} icon={Users} />
        <StatCard title="Active" value={clients.filter((c) => c.classification === "active").length} icon={Users} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Leads" value={clients.filter((c) => c.classification === "lead").length} icon={Users} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Ghost Follow-ups" value={clients.filter((c) => c.classification === "ghost").length} icon={Users} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
      </div>

      <div className="flex gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
              activeTab === tab ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground hover:border-brand-gold/40")}>
            {tab}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users size={16} />Client Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading clients…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No clients in this segment yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((client) => (
                <div key={client.id} className="px-6 py-4 flex items-start justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{client.name}</p>
                      <span className={cn("px-2 py-0.5 rounded-sm text-[11px] font-medium border capitalize", classificationColors[client.classification] ?? "bg-muted text-muted-foreground border-border")}>
                        {client.classification}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {client.company || "No company"}{client.email ? ` · ${client.email}` : ""}{client.phone ? ` · ${client.phone}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Source: {client.source?.replace("_", " ") || "unspecified"}</p>
                    {client.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{client.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPanelClientId(client.id)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-brand-gold transition-colors" title="Quick view">
                      <PanelRightOpen size={13} />
                    </button>
                    <button onClick={() => openEdit(client)} disabled={busyId === client.id} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(client)} disabled={busyId === client.id} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                      {busyId === client.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground">
                    <p>Added {new Date(client.created_at).toLocaleDateString("en-KE")}</p>
                    {client.last_contacted_at && <p className="mt-1">Last contact {new Date(client.last_contacted_at).toLocaleDateString("en-KE")}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickClientPanel clientId={panelClientId} onClose={() => setPanelClientId(null)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  onBlur={(e) => setForm((f) => ({ ...f, phone: normalisePhone(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Classification</Label>
                <Select value={form.classification} onValueChange={(v) => v && setForm((f) => ({ ...f, classification: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(classificationColors).map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => v && setForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["direct", "contact_form", "referral", "social", "other"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional context…" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
