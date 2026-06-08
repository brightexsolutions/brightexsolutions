"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, Pencil, Trash2, Loader2, PanelRightOpen } from "lucide-react";
import { QuickClientPanel } from "@/components/admin/quick-client-panel";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, type Column, type RowAction } from "@/components/admin/data-table";
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

const CLASSIFICATION_FILTER = {
  key: "classification",
  label: "Type",
  options: [
    { label: "All", value: "" },
    { label: "Leads", value: "lead" },
    { label: "Qualified", value: "qualified" },
    { label: "Active", value: "active" },
    { label: "Unqualified", value: "unqualified" },
    { label: "Ghost", value: "ghost" },
    { label: "Past", value: "past" },
  ],
};

const emptyForm = { name: "", email: "", phone: "", company: "", classification: "lead", source: "direct", notes: "" };

type Client = {
  id: string; name: string; email?: string | null; phone?: string | null;
  company?: string | null; classification: string; source?: string | null;
  notes?: string | null; last_contacted_at?: string | null; created_at: string;
};

export function ClientsPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState("");
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

  const displayClients = classFilter
    ? clients.filter((c) => c.classification === classFilter)
    : clients;

  const clientColumns: Column<Record<string, unknown>>[] = [
    {
      key: "name",
      label: "Client",
      sortable: true,
      render: (row) => (
        <StackedCell
          primary={String(row.name)}
          secondary={row.company ? String(row.company) : undefined}
        />
      ),
    },
    {
      key: "classification",
      label: "Type",
      render: (row) => (
        <span className={cn(
          "px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize",
          classificationColors[String(row.classification)] ?? "bg-muted text-muted-foreground border-border"
        )}>
          {String(row.classification)}
        </span>
      ),
    },
    {
      key: "email",
      label: "Contact",
      className: "hidden md:table-cell",
      render: (row) => (
        <StackedCell
          primary={row.email ? String(row.email) : "—"}
          secondary={row.phone ? String(row.phone) : undefined}
        />
      ),
    },
    {
      key: "source",
      label: "Source",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-sm text-muted-foreground capitalize">
          {row.source ? String(row.source).replace(/_/g, " ") : "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Added",
      className: "hidden xl:table-cell",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(String(row.created_at)).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
  ];

  const clientActions: RowAction<Record<string, unknown>>[] = [
    {
      label: "Quick view",
      icon: <PanelRightOpen size={13} />,
      onClick: (row) => setPanelClientId(String(row.id)),
    },
    {
      label: "Edit",
      icon: <Pencil size={13} />,
      onClick: (row) => openEdit(row as unknown as Client),
    },
    {
      label: "Delete",
      icon: <Trash2 size={13} />,
      destructive: true,
      onClick: (row) => handleDelete(row as unknown as Client),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your client directory and pipeline.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <UserPlus size={15} />Add Client
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value={clients.length} icon={Users} accent={{ bg: "bg-blue-400/10", text: "text-blue-400" }} />
        <StatCard title="Active" value={clients.filter((c) => c.classification === "active").length} icon={Users} accent={{ bg: "bg-emerald-400/10", text: "text-emerald-400" }} />
        <StatCard title="Leads" value={clients.filter((c) => c.classification === "lead").length} icon={Users} accent={{ bg: "bg-brand-gold/10", text: "text-brand-gold" }} />
        <StatCard title="Ghost Follow-ups" value={clients.filter((c) => c.classification === "ghost").length} icon={Users} accent={{ bg: "bg-amber-400/10", text: "text-amber-400" }} />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={clientColumns}
          data={displayClients as unknown as Record<string, unknown>[]}
          actions={clientActions}
          searchable
          searchPlaceholder="Search clients…"
          searchKeys={["name", "company", "email", "phone"]}
          filters={[CLASSIFICATION_FILTER]}
          activeFilters={{ classification: classFilter }}
          onFilterChange={(_, v) => setClassFilter(v)}
          maxHeight="520px"
          emptyMessage={loading ? "Loading clients…" : "No clients in this segment."}
        />
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
