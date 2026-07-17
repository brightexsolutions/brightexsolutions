"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Plus, Pencil, Trash2, Sparkles, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, type Column, type RowAction, type FilterConfig } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { EmailComposer } from "@/components/admin/email-composer";

const typeColors: Record<string, string> = {
  email: "bg-blue-400/10 text-blue-400",
  whatsapp: "bg-emerald-400/10 text-emerald-400",
  call: "bg-amber-400/10 text-amber-400",
  meeting: "bg-purple-400/10 text-purple-400",
};

const filters = ["All", "Email", "WhatsApp", "Call", "Meeting"];

const defaultForm = {
  type: "email",
  direction: "out",
  subject: "",
  body: "",
};

type Communication = {
  id: string;
  client_id?: string | null;
  type: string;
  subject?: string | null;
  body?: string | null;
  direction: string;
  sent_at: string;
  status?: string | null;
  clients?: {
    id: string;
    name?: string | null;
    company?: string | null;
  } | null;
};

export function CommunicationsPageClient() {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Communication | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);

  function set(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/communications");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setCommunications(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setError("");
    setOpen(true);
  }

  function openEdit(entry: Communication) {
    setEditTarget(entry);
    setForm({
      type: entry.type,
      direction: entry.direction,
      subject: entry.subject ?? "",
      body: entry.body ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editTarget ? `/api/admin/communications/${editTarget.id}` : "/api/admin/communications";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      if (editTarget) {
        setCommunications((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, ...data.data } : c));
      } else {
        setCommunications((prev) => [data.data, ...prev]);
      }
      setOpen(false);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function draftWithAI() {
    if (!form.subject.trim()) { setError("Add a subject first so AI knows what to draft."); return; }
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "draft_reply",
          clientName: "the client",
          subject: form.subject,
          context: form.body || form.subject,
          tone: "warm",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.result) {
        set("body", data.result);
      } else {
        setError(data.error ?? "AI draft failed. Try again.");
      }
    } catch { setError("Network error."); }
    finally { setDrafting(false); }
  }

  async function handleDelete(entry: Communication) {
    if (!await confirm({ message: "Delete this communication log? This cannot be undone." })) return;
    await fetch(`/api/admin/communications/${entry.id}`, { method: "DELETE" });
    setCommunications((prev) => prev.filter((c) => c.id !== entry.id));
  }

  const filteredCommunications = communications.filter((entry) => {
    if (activeFilter === "All") return true;
    return entry.type.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">Log calls, emails, and meetings with clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setComposerOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-brand-gold/40 text-brand-gold font-semibold text-sm hover:bg-brand-gold/10 transition-colors">
            <Send size={15} />Compose Email
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
            <Plus size={15} />Log Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Logs" value={communications.length} icon={MessageSquare} />
        <StatCard title="Emails Sent" value={communications.filter((e) => e.type === "email").length} icon={MessageSquare} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Calls Logged" value={communications.filter((e) => e.type === "call").length} icon={MessageSquare} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Meetings" value={communications.filter((e) => e.type === "meeting").length} icon={MessageSquare} iconColor="text-purple-400" iconBg="bg-purple-400/10" />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "subject",
              label: "Subject",
              sortable: true,
              render: (row) => {
                const e = row as unknown as Communication;
                return (
                  <div className="flex flex-col gap-1 min-w-0">
                    <StackedCell
                      primary={e.subject || "No subject"}
                      secondary={e.body ? e.body.slice(0, 80) + (e.body.length > 80 ? "…" : "") : undefined}
                    />
                    <span className={`self-start px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${typeColors[e.type] ?? "bg-muted text-muted-foreground"}`}>{e.type}</span>
                  </div>
                );
              },
            },
            {
              key: "client",
              label: "Client",
              render: (row) => {
                const e = row as unknown as Communication;
                return <span className="text-sm text-foreground">{e.clients?.company || e.clients?.name || <span className="text-muted-foreground">No client</span>}</span>;
              },
            },
            {
              key: "direction",
              label: "Direction",
              render: (row) => {
                const e = row as unknown as Communication;
                return <span className={`text-xs font-medium capitalize ${e.direction === "out" ? "text-blue-500" : "text-emerald-500"}`}>{e.direction === "out" ? "Outbound" : "Inbound"}</span>;
              },
            },
            {
              key: "sent_at",
              label: "Date",
              sortable: true,
              render: (row) => {
                const e = row as unknown as Communication;
                return <StackedCell primary={new Date(e.sent_at).toLocaleDateString("en-KE")} secondary={e.status ?? "sent"} />;
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filteredCommunications as unknown as Record<string, unknown>[]}
          actions={[
            { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEdit(row as unknown as Communication) },
            { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => handleDelete(row as unknown as Communication) },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search communications…"
          searchKeys={["subject", "body"]}
          filters={[
            { key: "type", label: "Type", options: [{ label: "All", value: "" }, ...Object.keys(typeColors).map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))] } as FilterConfig,
          ]}
          activeFilters={{ type: activeFilter === "All" ? "" : activeFilter.toLowerCase() }}
          onFilterChange={(_, val) => setActiveFilter(val ? val.charAt(0).toUpperCase() + val.slice(1) : "All")}
          maxHeight="520px"
          emptyMessage={loading ? "Loading communication history…" : "No communications logged yet."}
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Log Entry" : "Log Communication"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => v && set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(typeColors).map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => v && set("direction", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out">Outbound</SelectItem>
                    <SelectItem value="in">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comm-subject">Subject *</Label>
              <Input id="comm-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} required placeholder="Brief description" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="comm-body">Notes / Body</Label>
                {form.type === "email" && (
                  <button
                    type="button"
                    onClick={draftWithAI}
                    disabled={drafting}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-hover font-medium transition-colors disabled:opacity-50"
                  >
                    {drafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {drafting ? "Drafting…" : "Draft with AI"}
                  </button>
                )}
              </div>
              <Textarea id="comm-body" rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Key points, outcomes, follow-ups…" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Log Entry"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={() => load()}
      />
    </div>
  );
}
