"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = ["Products", "Trials", "Subscriptions"] as const;
type Tab = (typeof tabs)[number];

const categories = ["erp", "crm", "booking", "analytics", "hospitality", "other"];

const defaultProduct = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  category: "erp",
  starting_price: "",
  trial_days: "7",
  target_industries: "",
};

type Product = {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  category: string;
  status: string;
  trial_days?: number | null;
  pricing_tiers?: Array<{
    name: string;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    features: string[];
  }> | null;
  target_industries?: string[] | null;
};

type Trial = {
  id: string;
  status: string;
  requester_name: string;
  requester_email: string;
  requester_company?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  products?: { id: string; name: string; slug: string } | null;
};

type ProductSubscription = {
  id: string;
  plan_name?: string | null;
  amount: number;
  currency?: string | null;
  status: string;
  started_at?: string | null;
  next_billing_date?: string | null;
  products?: { id: string; name: string } | null;
  clients?: { id: string; name: string } | null;
};

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Products");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(defaultProduct);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>([]);

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [productsRes, trialsRes, subscriptionsRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/products?type=trials"),
        fetch("/api/admin/products?type=subscriptions"),
      ]);
      const [productsJson, trialsJson, subscriptionsJson] = await Promise.all([
        productsRes.json().catch(() => ({})),
        trialsRes.json().catch(() => ({})),
        subscriptionsRes.json().catch(() => ({})),
      ]);
      if (!productsRes.ok || !trialsRes.ok || !subscriptionsRes.ok) {
        setLoadError(productsJson.error ?? trialsJson.error ?? subscriptionsJson.error ?? "Unable to load product data.");
        return;
      }
      setProducts(productsJson.data ?? []);
      setTrials(trialsJson.data ?? []);
      setSubscriptions(subscriptionsJson.data ?? []);
    } catch {
      setLoadError("Network error. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultProduct);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditTarget(product);
    const firstTier = product.pricing_tiers?.[0];
    setForm({
      name: product.name,
      slug: product.slug,
      tagline: product.tagline ?? "",
      description: product.description ?? "",
      category: product.category,
      starting_price: firstTier?.price_monthly ? String(firstTier.price_monthly) : "",
      trial_days: String(product.trial_days ?? 7),
      target_industries: (product.target_industries ?? []).join(", "),
    });
    setOpen(true);
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const monthlyPrice = form.starting_price ? Number(form.starting_price) : 0;
      const payload = {
        name: form.name,
        slug: form.slug,
        tagline: form.tagline || undefined,
        description: form.description || undefined,
        category: form.category,
        trial_days: Number(form.trial_days) || 7,
        pricing_tiers: monthlyPrice > 0 ? [{
          name: "Starter",
          price_monthly: monthlyPrice,
          price_yearly: monthlyPrice * 12,
          currency: "KES",
          features: [],
        }] : [],
        target_industries: form.target_industries.split(",").map((e) => e.trim()).filter(Boolean),
        status: "published",
      };

      const url = editTarget ? `/api/admin/products/${editTarget.id}` : "/api/admin/products";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;

      if (editTarget) {
        setProducts((prev) => prev.map((p) => p.id === editTarget.id ? { ...p, ...json.data } : p));
      } else {
        setProducts((prev) => [json.data, ...prev]);
      }
      setForm(defaultProduct);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const publishedProducts = products.filter((p) => p.status === "published");
  const activeTrials = trials.filter((t) => t.status === "active");
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const productMrr = activeSubscriptions.reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage Brightex-built licensable software products.</p>
        </div>
        {activeTab === "Products" && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
          >
            <Plus size={15} />
            New Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Published" value={publishedProducts.length} icon={Package} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Active Trials" value={activeTrials.length} icon={Package} iconColor="text-blue-400" iconBg="bg-blue-400/10" />
        <StatCard title="Subscriptions" value={activeSubscriptions.length} icon={Package} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="MRR" value={`KES ${productMrr.toLocaleString()}`} icon={Package} />
      </div>

      {loadError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-500 text-center">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab ? "border-brand-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

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
            <CardContent className="p-0">
              {loading && products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading products…</p></div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No products yet.</p>
                  <p className="text-xs mt-1">Create a product to display it on the public /products page.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {products.map((product) => {
                    const firstTier = product.pricing_tiers?.[0];
                    return (
                      <div key={product.id} className="px-6 py-4 flex items-start gap-4 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold text-foreground">{product.name}</p>
                            <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-muted-foreground uppercase">
                              {product.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium ${product.status === "published" ? "bg-emerald-400/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                              {product.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">/products/{product.slug}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {product.tagline || product.description || "No summary yet."}
                          </p>
                          {product.target_industries && product.target_industries.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.target_industries.map((ind) => (
                                <span key={ind} className="px-1.5 py-0.5 rounded-sm text-[10px] border border-border text-muted-foreground">{ind}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {firstTier?.price_monthly ? `KES ${Number(firstTier.price_monthly).toLocaleString()}/mo` : "Custom pricing"} · {product.trial_days ?? 7}-day trial
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(product)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(product)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Trials" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Package size={16} />Trial Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && trials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading trial requests…</p></div>
            ) : trials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No trial requests yet.</p>
                <p className="text-xs mt-1">Trial requests appear here when visitors submit the trial form on a product page.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trials.map((trial) => (
                  <div key={trial.id} className="rounded-sm border border-border p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{trial.requester_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{trial.requester_email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {trial.products?.name ?? "Unknown product"}
                        {trial.requester_company ? ` · ${trial.requester_company}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex px-2 py-0.5 rounded-sm text-[11px] font-medium bg-blue-400/10 text-blue-500">{trial.status}</span>
                      {trial.expires_at && (
                        <p className="text-xs text-muted-foreground mt-2">Expires {new Date(trial.expires_at).toLocaleDateString("en-KE")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Subscriptions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Package size={16} />Product Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && subscriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Loading subscriptions…</p></div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No active subscriptions yet.</p>
                <p className="text-xs mt-1">Subscriptions appear when trials convert to paid plans.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="rounded-sm border border-border p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{sub.products?.name ?? "Unknown product"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{sub.clients?.name ?? "No client linked"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{sub.plan_name || "Active plan"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{(sub.currency ?? "KES")} {Number(sub.amount ?? 0).toLocaleString()}</p>
                      {sub.next_billing_date && (
                        <p className="text-xs text-muted-foreground mt-1">Next billing {new Date(sub.next_billing_date).toLocaleDateString("en-KE")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input
                  placeholder="School ERP"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editTarget ? f.slug : slugify(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input
                  placeholder="school-erp"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input placeholder="Complete school management in one platform." value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Describe what this product does…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-sm border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {categories.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Starting Price (KES/mo)</Label>
                <Input type="number" min="0" placeholder="8000" value={form.starting_price} onChange={(e) => setForm((f) => ({ ...f, starting_price: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Trial Days</Label>
                <Input type="number" min="1" max="30" value={form.trial_days} onChange={(e) => setForm((f) => ({ ...f, trial_days: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Industries</Label>
                <Input placeholder="Schools, Clinics" value={form.target_industries} onChange={(e) => setForm((f) => ({ ...f, target_industries: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name || !form.slug} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
