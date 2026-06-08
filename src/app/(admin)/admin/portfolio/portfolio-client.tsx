"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Globe, Image as ImageIcon, Eye, EyeOff, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCENT_PRESETS = [
  "#f9a825", "#3b82f6", "#8b5cf6", "#10b981",
  "#f97316", "#6366f1", "#ec4899", "#14b8a6",
];

const defaultForm = {
  name: "",
  category: "",
  description: "",
  url: "",
  image_url: "",
  tags: "",
  accent_color: "#f9a825",
  featured: false,
  display_order: 0,
  active: true,
};

type FormState = typeof defaultForm;

type Project = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  url: string;
  image_url?: string | null;
  tags?: string[] | null;
  accent_color?: string | null;
  featured?: boolean | null;
  display_order?: number | null;
  active?: boolean | null;
  created_at: string;
};

function screenshotUrl(url: string, customImage?: string | null): string {
  if (customImage) return customImage;
  try { return `https://image.thum.io/get/width/600/crop/400/${encodeURIComponent(url)}`; }
  catch { return ""; }
}

export function PortfolioPageClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portfolio");
      const json = await res.json();
      setProjects(json.data ?? []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setError("");
    setOpen(true);
  }

  function openEdit(p: Project) {
    setEditTarget(p);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description ?? "",
      url: p.url,
      image_url: p.image_url ?? "",
      tags: (p.tags ?? []).join(", "),
      accent_color: p.accent_color ?? "#f9a825",
      featured: p.featured ?? false,
      display_order: p.display_order ?? 0,
      active: p.active ?? true,
    });
    setError("");
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        image_url: form.image_url?.trim() || null,
      };
      const url = editTarget ? `/api/admin/portfolio/${editTarget.id}` : "/api/admin/portfolio";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      setOpen(false);
      load();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    try {
      await fetch(`/api/admin/portfolio/${id}`, { method: "DELETE" });
      setDeleteId(null);
      load();
    } catch { /* ignore */ }
  }

  async function toggleActive(p: Project) {
    await fetch(`/api/admin/portfolio/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage the projects displayed on the public website.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={15} /> Add Project
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Total Projects</p>
            <p className="text-3xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Published</p>
            <p className="text-3xl font-bold text-green-600">{projects.filter(p => p.active).length}</p>
          </CardContent>
        </Card>
        <Card className="hidden sm:block">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Featured</p>
            <p className="text-3xl font-bold text-brand-gold">{projects.filter(p => p.featured).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-14 h-10 bg-muted rounded-sm shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted/60 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Globe size={28} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No projects yet. Add your first one.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {projects.map((p) => (
                <div key={p.id} className={cn("flex items-center gap-4 px-6 py-4 transition-colors", !p.active && "opacity-50")}>
                  {/* Thumbnail */}
                  <div
                    className="w-16 h-11 rounded-sm shrink-0 bg-muted bg-cover bg-center border border-border"
                    style={{
                      backgroundImage: screenshotUrl(p.url, p.image_url) ? `url(${screenshotUrl(p.url, p.image_url)})` : "none",
                      borderLeft: `3px solid ${p.accent_color ?? "#f9a825"}`,
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      {p.featured && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-gold/10 text-brand-gold">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                  </div>

                  {/* Tags preview */}
                  <div className="hidden md:flex gap-1.5">
                    {(p.tags ?? []).slice(0, 2).map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Order */}
                  <div className="hidden sm:flex items-center gap-1 text-muted-foreground/50 text-xs">
                    <GripVertical size={12} />
                    {p.display_order ?? 0}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(p)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title={p.active ? "Hide" : "Show"}
                    >
                      {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Project Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Beco Interiors" />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="E-Commerce Redesign" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Site URL *</Label>
              <Input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com" type="url" />
              <p className="text-[11px] text-muted-foreground">If no custom image is set, a screenshot will be auto-generated from this URL.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Custom Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://... (leave blank to use auto screenshot)" type="url" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief project description..." rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
              <Input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="WordPress, SEO, E-Commerce" />
            </div>

            <div className="space-y-2">
              <Label>Accent Colour</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, accent_color: c }))}
                    className={cn("w-7 h-7 rounded-full border-2 transition-all", form.accent_color === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <Input
                  value={form.accent_color}
                  onChange={(e) => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  className="w-28 text-xs"
                  placeholder="#f9a825"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} min={0} max={999} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.featured}
                  onChange={(e) => setForm(f => ({ ...f, featured: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the project from the portfolio. This cannot be undone.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && confirmDelete(deleteId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
