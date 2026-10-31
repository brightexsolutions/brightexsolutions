"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, StackedCell, type Column, type RowAction, type FilterConfig } from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  DEFAULT_POPUP, TRIGGER_LABELS, FREQUENCY_LABELS, STYLE_LABELS, describePopup, readPopup, type PopupConfig,
} from "@/lib/popup-config";

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
  popup: DEFAULT_POPUP as PopupConfig,
  pagesText: "",
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
  popup?: unknown;
};

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnnouncementsPageClient() {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [visualIdea, setVisualIdea] = useState("");

  const toneByType: Record<string, string> = { info: "professional", offer: "promotional", promo: "promotional", alert: "professional" };

  async function writeWithAI() {
    const topic = form.title.trim() || form.body.trim();
    if (!topic) { setError("Add a title first so AI knows what to announce."); return; }
    setAiDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "write_caption",
          topic,
          platforms: ["Website Announcement Banner"],
          tone: toneByType[form.type] ?? "professional",
          includeHashtags: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.result) {
        const raw = (data.result as string).replace(/\*\*\[Website Announcement Banner\]\*\*\n?/i, "").trim();
        const splitIdx = raw.search(/\*\*Visual idea\*\*/i);
        if (splitIdx !== -1) {
          set("body", raw.slice(0, splitIdx).trim());
          setVisualIdea(raw.slice(splitIdx).replace(/\*\*Visual idea\*\*/i, "").trim());
        } else {
          set("body", raw);
          setVisualIdea("");
        }
      } else {
        setError(data.error ?? "AI draft failed. Try again.");
      }
    } catch { setError("Network error."); }
    finally { setAiDrafting(false); }
  }

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
    setVisualIdea("");
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
      popup: readPopup(ann.popup) ?? DEFAULT_POPUP,
      pagesText: (readPopup(ann.popup)?.pages ?? []).join(", "),
    });
    setError("");
    setVisualIdea("");
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
      // Creating: an empty date must be omitted (POST's schema only allows
      // undefined). Editing: an empty date means "clear it", which needs an
      // explicit null (PATCH's schema accepts null, unlike POST's).
      const emptyDate = editTarget ? null : undefined;
      const { pagesText, popup: popupForm, ...rest } = form;
      const popup: PopupConfig = {
        ...popupForm,
        pages: pagesText.split(/[,\n]/).map((p) => p.trim()).filter(Boolean).map((p) => (p.startsWith("/") ? p : `/${p}`)),
      };
      // Only send pop-up settings once they are used, so plain announcements keep
      // saving even before migration 043 has added the column.
      const sendPopup = popup.enabled || !!readPopup(editTarget?.popup);
      const payload = {
        ...rest,
        ...(sendPopup ? { popup } : {}),
        cta_label: form.cta_label || undefined,
        cta_url: form.cta_url || undefined,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : emptyDate,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : emptyDate,
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
    if (!await confirm({ message: `Delete "${ann.title}"? This cannot be undone.` })) return;
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
          <p className="text-sm text-muted-foreground mt-1">Banners and offers on the site.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />New Announcement
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard loading={loading} title="Active" value={announcements.filter((a) => a.active).length} icon={Megaphone} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard loading={loading} title="Scheduled" value={scheduledAnnouncements.length} icon={Megaphone} iconColor="text-blue-400" iconBg="bg-brand-gold/10" />
        <StatCard loading={loading} title="Offers" value={announcements.filter((a) => a.type === "offer" || a.type === "promo").length} icon={Megaphone} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard loading={loading} title="Total" value={announcements.length} icon={Megaphone} />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            {
              key: "title",
              label: "Announcement",
              sortable: true,
              render: (row) => {
                const ann = row as unknown as Announcement;
                return (
                  <div className="flex flex-col gap-1 min-w-0">
                    <StackedCell primary={ann.title} secondary={ann.body ? ann.body.slice(0, 80) + (ann.body.length > 80 ? "…" : "") : undefined} />
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${typeColors[ann.type] ?? "bg-muted text-muted-foreground border-border"}`}>{ann.type}</span>
                      {ann.active && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-400/10 text-emerald-500 border border-emerald-400/20">Live</span>}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "display_location",
              label: "Location",
              render: (row) => {
                const ann = row as unknown as Announcement;
                const pop = readPopup(ann.popup);
                return (
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-xs text-muted-foreground">{(ann.display_location ?? []).map((l) => locationLabels[l] ?? l).join(", ") || (pop?.enabled ? "Pop-up only" : "No location")}</span>
                    {pop?.enabled && (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-brand-gold/15 text-[11px] font-medium text-amber-800 dark:text-brand-gold whitespace-nowrap">
                        Pop-up · {describePopup(pop)}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: "ends_at",
              label: "Ends",
              render: (row) => {
                const ann = row as unknown as Announcement;
                return ann.ends_at
                  ? <span className="text-sm text-muted-foreground">{new Date(ann.ends_at).toLocaleDateString("en-KE")}</span>
                  : <span className="text-xs text-muted-foreground">No expiry</span>;
              },
            },
            {
              key: "toggle",
              label: "",
              className: "w-28",
              render: (row) => {
                const ann = row as unknown as Announcement;
                return (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(ann); }}
                    className={cn("flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors",
                      ann.active ? "border-red-200 text-red-500 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/20" : "border-emerald-200 text-emerald-600 dark:border-emerald-800/40 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    )}
                  >
                    {ann.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                    {ann.active ? "Deactivate" : "Activate"}
                  </button>
                );
              },
            },
          ] as Column<Record<string, unknown>>[]}
          data={filteredAnnouncements as unknown as Record<string, unknown>[]}
          actions={[
            { label: "Edit", icon: <Pencil size={13} />, onClick: (row) => openEdit(row as unknown as Announcement) },
            { label: "Delete", icon: <Trash2 size={13} />, destructive: true, onClick: (row) => handleDelete(row as unknown as Announcement) },
          ] as RowAction<Record<string, unknown>>[]}
          searchable
          searchPlaceholder="Search announcements…"
          searchKeys={["title", "body"]}
          filters={[
            { key: "type", label: "Type", options: [{ label: "All", value: "" }, ...Object.keys(typeColors).map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))] } as FilterConfig,
            { key: "active", label: "Status", options: [{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }] } as FilterConfig,
          ]}
          activeFilters={{ active: activeOnly ? "true" : "" }}
          onFilterChange={(key, val) => { if (key === "active") setActiveOnly(val === "true"); }}
          loading={loading} emptyMessage={"No announcements yet."}
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="ann-body">Body</Label>
                <button
                  type="button"
                  onClick={writeWithAI}
                  disabled={aiDrafting}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-hover font-medium transition-colors disabled:opacity-50"
                >
                  {aiDrafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {aiDrafting ? "Drafting…" : "Write with AI"}
                </button>
              </div>
              <Textarea id="ann-body" rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} />
              {visualIdea && (
                <div className="flex items-start gap-2 p-2.5 rounded-sm border border-dashed border-brand-gold/40 bg-brand-gold/5">
                  <Sparkles size={13} className="text-brand-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-brand-gold uppercase tracking-widest mb-0.5">Visual idea</p>
                    <p className="text-xs text-foreground leading-relaxed">{visualIdea}</p>
                  </div>
                </div>
              )}
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
              <Label>Where it shows</Label>
              <p className="text-xs text-muted-foreground -mt-0.5">Turn all of these off for a pop-up only announcement.</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(locationLabels).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleLocation(key)}
                    className={cn("px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors",
                      form.display_location.includes(key) ? "bg-brand-navy text-white border-brand-navy" : "border-border text-muted-foreground hover:border-brand-gold/40"
                    )}>{label}</button>
                ))}
              </div>
            </div>
            <PopupSettings
              value={form.popup}
              pagesText={form.pagesText}
              onChange={(popup) => setForm((f) => ({ ...f, popup }))}
              onPagesText={(pagesText) => setForm((f) => ({ ...f, pagesText }))}
            />
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

// ─── Pop-up settings ──────────────────────────────────────────────────────────

const POPUP_SELECT = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm";

function PopupSettings({
  value, pagesText, onChange, onPagesText,
}: {
  value: PopupConfig;
  pagesText: string;
  onChange: (v: PopupConfig) => void;
  onPagesText: (v: string) => void;
}) {
  const set = <K extends keyof PopupConfig>(k: K, v: PopupConfig[K]) => onChange({ ...value, [k]: v });
  return (
    <fieldset className="rounded-2xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <legend className="text-sm font-semibold text-foreground">Show as a pop-up</legend>
          <p className="text-xs text-muted-foreground">Appears on the website when the conditions below are met.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          onClick={() => set("enabled", !value.enabled)}
          className={cn("relative h-7 w-12 rounded-full transition-colors shrink-0", value.enabled ? "bg-brand-gold" : "bg-muted")}
        >
          <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-[left]", value.enabled ? "left-6" : "left-1")} />
          <span className="sr-only">Show as a pop-up</span>
        </button>
      </div>

      {value.enabled && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pop-trigger">When it appears</Label>
            <div className="flex gap-2">
              <select id="pop-trigger" className={POPUP_SELECT} value={value.trigger} onChange={(e) => set("trigger", e.target.value as PopupConfig["trigger"])}>
                {Object.entries(TRIGGER_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {value.trigger === "delay" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Input type="number" min={0} max={600} className="w-20" value={value.delaySeconds} onChange={(e) => set("delaySeconds", Number(e.target.value) || 0)} /> sec
                </label>
              )}
              {value.trigger === "scroll" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Input type="number" min={1} max={100} className="w-20" value={value.scrollPercent} onChange={(e) => set("scrollPercent", Number(e.target.value) || 50)} /> %
                </label>
              )}
            </div>
            {value.trigger === "exit" && <p className="text-xs text-muted-foreground">On phones, which have no exit gesture, it shows after 30 seconds instead.</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pop-pages">Pages</Label>
            <Input id="pop-pages" value={pagesText} onChange={(e) => onPagesText(e.target.value)} placeholder="All pages. Or list them: /, /services, /blog/*" />
            <p className="text-xs text-muted-foreground">Leave empty for every page. End with /* to include everything under a section.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pop-audience">Who sees it</Label>
            <select id="pop-audience" className={POPUP_SELECT} value={value.audience} onChange={(e) => set("audience", e.target.value as PopupConfig["audience"])}>
              <option value="all">Everyone</option>
              <option value="new">First-time visitors</option>
              <option value="returning">Returning visitors</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pop-device">Device</Label>
            <select id="pop-device" className={POPUP_SELECT} value={value.device} onChange={(e) => set("device", e.target.value as PopupConfig["device"])}>
              <option value="all">Phones and computers</option>
              <option value="mobile">Phones only</option>
              <option value="desktop">Computers only</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pop-frequency">How often</Label>
            <div className="flex gap-2">
              <select id="pop-frequency" className={POPUP_SELECT} value={value.frequency} onChange={(e) => set("frequency", e.target.value as PopupConfig["frequency"])}>
                {Object.entries(FREQUENCY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {value.frequency === "days" && (
                <Input type="number" min={1} max={365} className="w-20" aria-label="Days" value={value.frequencyDays} onChange={(e) => set("frequencyDays", Number(e.target.value) || 7)} />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pop-style">Style</Label>
            <select id="pop-style" className={POPUP_SELECT} value={value.style} onChange={(e) => set("style", e.target.value as PopupConfig["style"])}>
              {Object.entries(STYLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
      )}
    </fieldset>
  );
}
