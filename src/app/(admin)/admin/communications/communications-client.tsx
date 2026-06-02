"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Communication | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
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

  async function handleDelete(entry: Communication) {
    if (!confirm(`Delete this communication log? This cannot be undone.`)) return;
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
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />Log Entry
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Logs" value={communications.length} icon={MessageSquare} />
        <StatCard title="Emails Sent" value={communications.filter((e) => e.type === "email").length} icon={MessageSquare} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Calls Logged" value={communications.filter((e) => e.type === "call").length} icon={MessageSquare} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="Meetings" value={communications.filter((e) => e.type === "meeting").length} icon={MessageSquare} iconColor="text-purple-400" iconBg="bg-purple-400/10" />
      </div>

      <div className="flex gap-1 flex-wrap">
        {filters.map((filter) => (
          <button key={filter} onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${activeFilter === filter ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground hover:border-brand-gold/40"}`}
          >{filter}</button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare size={16} />Communication Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && communications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading communication history…</p></div>
          ) : filteredCommunications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No communications logged yet.</p>
              <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors">
                <Plus size={13} />Log Entry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCommunications.map((entry) => (
                <div key={entry.id} className="px-6 py-4 flex items-start justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{entry.subject || "No subject"}</p>
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium capitalize ${typeColors[entry.type] ?? "bg-muted text-muted-foreground"}`}>{entry.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.clients?.company || entry.clients?.name || "No client linked"} · {entry.direction === "out" ? "Outbound" : "Inbound"}
                    </p>
                    {entry.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.body}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(entry)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(entry)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{new Date(entry.sent_at).toLocaleDateString("en-KE")}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{entry.status || "sent"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
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
              <Label htmlFor="comm-body">Notes / Body</Label>
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
    </div>
  );
}
