"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Plus, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, Pencil, Trash2, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const integrationLevels = [
  { level: "Passive", desc: "HTTP ping + SSL check — no changes to the tracked site" },
  { level: "Active", desc: "Structured health endpoint — one file added to the site" },
  { level: "WordPress", desc: "mu-plugin + config line — full WP version and update tracking" },
];

const statusConfig = {
  up: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40", label: "Up" },
  degraded: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40", label: "Degraded" },
  down: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40", label: "Down" },
  unknown: { icon: Globe, color: "text-muted-foreground", bg: "bg-muted border-border", label: "Unknown" },
};

const defaultForm = {
  name: "",
  url: "",
  platform: "nextjs",
  hosting: "vercel",
  notes: "",
};

type Site = {
  id: string;
  name: string;
  url: string;
  platform?: string | null;
  hosting?: string | null;
  integration_level?: string | null;
  status?: "up" | "degraded" | "down" | "unknown" | null;
  last_checked?: string | null;
  response_time_ms?: number | null;
  ssl_expiry?: string | null;
  requires_update?: boolean | null;
  notes?: string | null;
};

export function SiteMonitoringPageClient() {
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Site | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideLevel, setGuideLevel] = useState<"passive" | "active" | "wordpress">("passive");
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  function set(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/sites");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(json.error ?? "Unable to load monitored sites."); return; }
      setSites(json.data ?? []);
      setCurrentTimeMs(Date.now());
    } catch {
      setLoadError("Network error. Please refresh and try again.");
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

  function openEdit(site: Site) {
    setEditTarget(site);
    setForm({
      name: site.name,
      url: site.url,
      platform: site.platform ?? "nextjs",
      hosting: site.hosting ?? "vercel",
      notes: site.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function handleDelete(site: Site) {
    if (!confirm(`Remove "${site.name}" from monitoring? This cannot be undone.`)) return;
    setBusyIds((prev) => { const next = new Set(prev); next.add(site.id); return next; });
    try {
      await fetch(`/api/admin/sites/${site.id}`, { method: "DELETE" });
      setSites((prev) => prev.filter((s) => s.id !== site.id));
    } finally {
      setBusyIds((prev) => { const next = new Set(prev); next.delete(site.id); return next; });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editTarget ? `/api/admin/sites/${editTarget.id}` : "/api/admin/sites";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, notes: form.notes || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to save site");
        return;
      }

      if (editTarget) {
        setSites((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...data.data } : s));
      } else {
        setSites((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setOpen(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function checkAll() {
    setChecking(true);
    try {
      await fetch("/api/admin/sites/health");
      await load();
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  const sslExpiringSoon = sites.filter((site) => {
    if (currentTimeMs === null || !site.ssl_expiry) return false;
    const diffDays = (new Date(site.ssl_expiry).getTime() - currentTimeMs) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });
  const alertCount = sites.filter((site) => site.status === "down" || site.status === "degraded" || site.requires_update).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Site Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Track uptime, SSL expiry, and WordPress updates across all sites.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <BookOpen size={14} />
            Setup Guide
          </button>
          <button
            onClick={checkAll}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Check All Now
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
          >
            <Plus size={15} />
            Add Site
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Sites Monitored" value={sites.length} icon={Globe} />
        <StatCard title="All Up" value={sites.filter((site) => site.status === "up").length} icon={CheckCircle2} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="Alerts" value={alertCount} icon={AlertTriangle} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
        <StatCard title="SSL Expiring" value={sslExpiringSoon.length} icon={AlertTriangle} iconColor="text-red-400" iconBg="bg-red-400/10" />
      </div>

      {loadError && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-500 text-center">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            <cfg.icon size={12} />
            {cfg.label}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe size={16} />Registered Sites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && sites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Loading site health…</p>
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No sites registered yet.</p>
              <p className="text-xs mt-1">Add any site URL and monitoring will start on the next check cycle.</p>
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs font-medium hover:border-brand-gold/40 transition-colors"
              >
                <Plus size={13} />
                Add Site
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sites.map((site) => {
                const status = statusConfig[site.status ?? "unknown"] ?? statusConfig.unknown;
                return (
                  <div key={site.id} className="px-6 py-4 flex items-start gap-4 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-foreground">{site.name}</p>
                        <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium border ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {site.requires_update && (
                          <span className="px-2 py-0.5 rounded-sm text-[11px] font-medium border bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
                            Update available
                          </span>
                        )}
                      </div>
                      <a href={site.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {site.url}
                      </a>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {(site.platform || "other").replace("_", " ")} · {site.hosting || "Hosting unspecified"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {site.response_time_ms ? `${site.response_time_ms}ms · ` : ""}
                        {site.last_checked ? `Checked ${new Date(site.last_checked).toLocaleDateString("en-KE")}` : "Not checked yet"}
                        {site.ssl_expiry ? ` · SSL ${new Date(site.ssl_expiry).toLocaleDateString("en-KE")}` : ""}
                      </p>
                      {site.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{site.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(site)} disabled={busyIds.has(site.id)} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(site)} disabled={busyIds.has(site.id)} className="p-1.5 rounded-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40" title="Remove">
                        {busyIds.has(site.id) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">Integration Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {integrationLevels.map((level, index) => (
              <div key={level.level} className="p-3 rounded-sm border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                  <p className="text-sm font-semibold text-foreground">{level.level}</p>
                </div>
                <p className="text-xs text-muted-foreground">{level.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide Sheet */}
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent className="w-full sm:max-w-3xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <BookOpen size={15} className="text-brand-gold" />
              Site Monitoring Setup Guide
            </SheetTitle>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Level selector tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-muted rounded-sm">
            {(["passive", "active", "wordpress"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setGuideLevel(level)}
                className={`flex-1 px-3 py-1.5 rounded-sm text-xs font-semibold capitalize transition-colors ${
                  guideLevel === level
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {level === "passive" ? "1. Passive" : level === "active" ? "2. Active" : "3. WordPress"}
              </button>
            ))}
          </div>

          {guideLevel === "passive" && (
            <div className="space-y-5">
              <div className="p-3 rounded-sm bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">No changes to the site required</p>
                <p className="text-xs text-muted-foreground">Works for any site on any platform. Just add it to the dashboard and monitoring starts automatically.</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">What gets tracked</h3>
                <ul className="space-y-2">
                  {["HTTP status (up / degraded / down)", "Response time in milliseconds", "SSL certificate expiry date", "WordPress version (via /wp-json/ — free, no plugin needed)"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">How to add a site</h3>
                <ol className="space-y-3">
                  {[
                    { n: 1, text: 'Click "Add Site" on this page.' },
                    { n: 2, text: "Enter the site name, full URL (including https://), platform, and hosting provider." },
                    { n: 3, text: "Leave integration level as Passive and click Add." },
                    { n: 4, text: 'Monitoring begins on the next automatic check cycle (every 6 hours), or click "Check All Now" immediately.' },
                  ].map((step) => (
                    <li key={step.n} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{step.n}</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="p-3 rounded-sm bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">This level is recommended as a starting point for all client sites and any third-party sites you want to watch.</p>
              </div>
            </div>
          )}

          {guideLevel === "active" && (
            <div className="space-y-5">
              <div className="p-3 rounded-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">One file + one environment variable</p>
                <p className="text-xs text-muted-foreground">For Next.js or Node.js sites where you have code access. Adds database connectivity status and custom health checks.</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">What gets tracked (beyond Passive)</h3>
                <ul className="space-y-2">
                  {["Database connectivity (ok / error)", "App version / deployment tag", "Custom checks you define (storage, email service, etc.)", "Structured JSON response — richer than a plain HTTP ping"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} className="text-blue-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Setup steps</h3>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Add the health route to the site at <code className="bg-muted px-1 rounded text-[11px]">src/app/api/health/route.ts</code>:</p>
                      <pre className="bg-muted rounded-sm p-3 text-[10px] text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre">{`import { NextResponse } from 'next/server'
export async function GET(request: Request) {
  const token = request.headers.get('x-brightex-token')
  const start = Date.now()
  if (!token || token !== process.env.BRIGHTEX_HEALTH_TOKEN) {
    return NextResponse.json({ status: 'ok',
      timestamp: new Date().toISOString() })
  }
  // Add your checks here:
  const checks: Record<string, string> = {}
  // try { await db.execute('SELECT 1'); checks.database = 'ok' }
  // catch { checks.database = 'error' }
  const status = Object.values(checks)
    .includes('error') ? 'degraded' : 'ok'
  return NextResponse.json({
    status, timestamp: new Date().toISOString(),
    site: process.env.NEXT_PUBLIC_SITE_NAME ?? 'unknown',
    checks, response_time_ms: Date.now() - start,
  })
}`}</pre>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Add to the site&apos;s Vercel environment variables:</p>
                      <pre className="bg-muted rounded-sm p-3 text-[10px] text-muted-foreground overflow-x-auto">{`BRIGHTEX_HEALTH_TOKEN=<generate a random 32-char string>
NEXT_PUBLIC_SITE_NAME=your-site-name`}</pre>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-muted-foreground">Deploy the site. Verify the endpoint responds at <code className="bg-muted px-1 rounded text-[11px]">https://yoursite.com/api/health</code>.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <p className="text-xs text-muted-foreground">In the dashboard: add or edit the site → set Integration Level to <strong>Active</strong> → paste the health URL and the token. Save.</p>
                  </li>
                </ol>
              </div>
              <div className="p-3 rounded-sm bg-muted/50 border border-border">
                <p className="text-xs font-medium text-foreground mb-1">Standard for all Brightex-built projects</p>
                <p className="text-xs text-muted-foreground">Every project delivered by Brightex must include this route from day 1. It&apos;s non-negotiable on the project delivery checklist.</p>
              </div>
            </div>
          )}

          {guideLevel === "wordpress" && (
            <div className="space-y-5">
              <div className="p-3 rounded-sm bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Upload 1 file + add 1 config line</p>
                <p className="text-xs text-muted-foreground">For WordPress sites where you have wp-admin, FTP, or cPanel access. Tracks WP version, PHP version, and pending plugin/theme updates.</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">What gets tracked (beyond Passive)</h3>
                <ul className="space-y-2">
                  {["WordPress core version + whether an update is available", "PHP version", "Number of plugins with pending updates", "Number of themes with pending updates", "Whether the site is using the latest WP core"].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} className="text-purple-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Setup steps</h3>
                <ol className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Create the file <code className="bg-muted px-1 rounded text-[11px]">/wp-content/mu-plugins/brightex-health.php</code>:</p>
                      <pre className="bg-muted rounded-sm p-3 text-[10px] text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre">{`<?php
// Plugin Name: Brightex Health Monitor
add_action('rest_api_init', function () {
  register_rest_route('brightex/v1', '/health', [
    'methods' => 'GET',
    'callback' => 'brightex_health_check',
    'permission_callback' => '__return_true',
  ]);
});
function brightex_health_check(WP_REST_Request $req) {
  $token = $req->get_header('x-brightex-token');
  $stored = defined('BRIGHTEX_HEALTH_TOKEN')
    ? BRIGHTEX_HEALTH_TOKEN : '';
  if (empty($token) || $token !== $stored) {
    return new WP_REST_Response(['status'=>'ok'],200);
  }
  $upd = get_site_transient('update_plugins');
  $plugins = $upd ? count((array)$upd->response) : 0;
  $thupd = get_site_transient('update_themes');
  $themes = $thupd ? count((array)$thupd->response) : 0;
  $core = get_preferred_from_update_core();
  return new WP_REST_Response([
    'status'            => 'ok',
    'wp_version'        => get_bloginfo('version'),
    'php_version'       => PHP_VERSION,
    'plugin_updates'    => $plugins,
    'theme_updates'     => $themes,
    'needs_core_update' => ($core&&$core->response==='upgrade'),
    'timestamp'         => date('c'),
  ], 200);
}`}</pre>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Add this line to <code className="bg-muted px-1 rounded text-[11px]">wp-config.php</code> (above the line that says &quot;That&apos;s all, stop editing!&quot;):</p>
                      <pre className="bg-muted rounded-sm p-3 text-[10px] text-muted-foreground overflow-x-auto">{`define('BRIGHTEX_HEALTH_TOKEN', 'your-secret-here');`}</pre>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-muted-foreground">Test the endpoint: <code className="bg-muted px-1 rounded text-[11px]">https://clientsite.com/wp-json/brightex/v1/health</code> — should return <code className="bg-muted px-1 rounded text-[11px]">{`{"status":"ok"}`}</code>.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <p className="text-xs text-muted-foreground">In the dashboard: edit the site → set Integration Level to <strong>WordPress</strong> → paste the health URL and the token. Save.</p>
                  </li>
                </ol>
              </div>
              <div className="p-3 rounded-sm bg-muted/50 border border-border">
                <p className="text-xs font-medium text-foreground mb-1">How to upload the file</p>
                <p className="text-xs text-muted-foreground">Use cPanel File Manager → navigate to <code className="bg-muted px-1 rounded text-[11px]">wp-content/mu-plugins/</code> (create folder if it doesn&apos;t exist) and upload the file. Or use FTP/SFTP. The plugin activates automatically — no wp-admin activation needed.</p>
              </div>
            </div>
          )}

          </div>{/* end scrollable body */}

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t border-border bg-card shrink-0">
            <button
              onClick={() => { setGuideOpen(false); openCreate(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy text-sm font-semibold hover:bg-brand-gold-hover transition-colors"
            >
              <Plus size={14} />
              Add a Site Now
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Site" : "Add Site"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Site Name *</Label>
              <Input id="site-name" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Beco Interiors" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-url">URL *</Label>
              <Input id="site-url" type="url" value={form.url} onChange={(e) => set("url", e.target.value)} required placeholder="https://example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(value) => value && set("platform", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["nextjs", "wordpress", "html", "other"].map((platform) => (
                      <SelectItem key={platform} value={platform}>{platform === "nextjs" ? "Next.js" : platform === "html" ? "HTML/CSS" : platform.charAt(0).toUpperCase() + platform.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hosting</Label>
                <Select value={form.hosting} onValueChange={(value) => value && set("hosting", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["vercel", "netlify", "hostinger", "cpanel", "other"].map((hosting) => (
                      <SelectItem key={hosting} value={hosting}>{hosting.charAt(0).toUpperCase() + hosting.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-notes">Notes</Label>
              <Textarea id="site-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-brand-gold text-brand-navy hover:bg-brand-gold-hover">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Site"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
