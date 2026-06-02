"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  info: "bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
  offer: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
  promo: "bg-brand-gold/10 text-brand-gold border-brand-gold/30",
  alert: "bg-red-400/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
};

const locationLabels: Record<string, string> = {
  banner: "Site Banner",
  home_hero: "Home Hero",
  contact_page: "Contact Page",
};

const defaultForm = {
  title: "",
  body: "",
  type: "info",
  cta_label: "",
  cta_url: "",
  display_location: ["banner"] as string[],
  starts_at: "",
  ends_at: "",
};

type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  cta_label?: string | null;
  cta_url?: string | null;
  display_location?: string[] | null;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
};

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnnouncementsPageClient() {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  function set(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleLocation(location: string) {
    setForm((current) => ({
      ...current,
      display_location: current.display_location.includes(location)
        ? current.display_location.filter((e) => e !== location)
        : [...current.display_location, location],
    }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setAnnouncements(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setError("");
    setOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditTarget(ann);
    setForm({
      title: ann.title,
      body: ann.body ?? "",
      type: ann.type,
      cta_label: ann.cta_label ?? "",
      cta_url: ann.cta_url ?? "",
      display_location: ann.display_location ?? ["banner"],
      starts_at: toLocalDatetimeValue(ann.starts_at),
      ends_at: toLocalDatetimeValue(ann.ends_at),
    });
    setError("");
    setOpen(true);
  }

  async function handleToggleActive(ann: Announcement) {
    const res = await fetch(`/api/admin/announcements/${ann.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !ann.active }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.map((a) => a.id === ann.id ? { ...a, active: !ann.active } : a));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        cta_label: form.cta_label || undefined,
        cta_url: form.cta_url || undefined,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        ...(editTarget ? {} : { active: false }),
      };
      const url = editTarget ? `/api/admin/announcements/${editTarget.id}` : "/api/admin/announcements";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      if (editTarget) {
        setAnnouncements((prev) => prev.map((a) => a.id === editTarget.id ? { ...a, ...data.data } : a));
      } else {
        setAnnouncements((prev) => [data.data, ...prev]);
      }
      setOpen(false);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(ann: Announcement) {
    if (!confirm(`Delete "${ann.title}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/announcements/${ann.id}`, { method: "DELETE" });
    setAnnouncements((prev) => prev.filter((a) => a.id !== ann.id));
  }

  const now = new Date();
  const filteredAnnouncements = announcements.filter((a) => !activeOnly || a.active);
  const scheduledAnnouncements = announcements.filter((a) => a.starts_at && new Date(a.starts_at) > now);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage banners, offers, and promos on the public site.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />New Announcement
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active" value={announcements.filter((a) => a.active).length} icon={Megaphone} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Scheduled" value={scheduledAnnouncements.length} icon={Megaphone} iconColor="text-blue-400" iconBg="bg-brand-gold/10" />
        <StatCard title="Offers" value={announcements.filter((a) => a.type === "offer" || a.type === "promo").length} icon={Megaphone} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Total" value={announcements.length} icon={Megaphone} />
      </div>

      <div className="flex items-center gap-3">
        {[{ label: "All", val: false }, { label: "Active Only", val: true }].map(({ label, val }) => (
          <button key={label} onClick={() => setActiveOnly(val)}
            className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
              activeOnly === val ? "bg-muted text-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"
            )}>{label}</button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Megaphone size={16} />Announcements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading announcements…</p></div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No announcements yet.</p>
              <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors">
                <Plus size={13} />New Announcement
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredAnnouncements.map((ann) => (
                <div key={ann.id} className="px-6 py-4 flex items-start justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium border capitalize ${typeColors[ann.type] ?? "bg-muted text-muted-foreground border-border"}`}>{ann.type}</span>
                      {ann.active && <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-emerald-400/10 text-emerald-500 border border-emerald-400/20">Live</span>}
                    </div>
                    {ann.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ann.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {(ann.display_location ?? []).map((l) => locationLabels[l] ?? l).join(", ") || "No location"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleToggleActive(ann)} className={cn("px-2 py-1 rounded-sm text-[11px] font-medium border transition-colors", ann.active ? "border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20")} title={ann.active ? "Deactivate" : "Activate"}>
                      {ann.active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => openEdit(ann)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(ann)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    {ann.ends_at && <p className="text-xs text-muted-foreground">Ends {new Date(ann.ends_at).toLocaleDateString("en-KE")}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ann-title">Title *</Label>
                <Input id="ann-title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => v && set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(typeColors).map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-body">Body</Label>
              <Textarea id="ann-body" rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ann-cta-label">CTA Label</Label>
                <Input id="ann-cta-label" value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="e.g. Get Started" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-cta-url">CTA URL</Label>
                <Input id="ann-cta-url" value={form.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="/contact or https://example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Display Locations</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(locationLabels).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleLocation(key)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
                      form.display_location.includes(key) ? "bg-brand-navy text-white border-brand-navy" : "border-border text-muted-foreground hover:border-brand-gold/40"
                    )}>{label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ann-start">Start Date</Label>
                <Input id="ann-start" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-end">End Date</Label>
                <Input id="ann-end" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create (Draft)"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
