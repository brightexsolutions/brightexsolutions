import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import {
  SITE_NAME, SITE_URL, BUSINESS_EMAIL, BUSINESS_PHONE, BUSINESS_WHATSAPP,
} from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
  completed_at?: string | null;
};

type Comm = {
  id: string;
  type?: string | null;
  subject?: string | null;
  sent_at?: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STEPS = ["discovery", "design", "development", "review", "live", "completed"] as const;

const STATUS_LABELS: Record<string, string> = {
  discovery: "Discovery",
  design: "Design",
  development: "Development",
  review: "Review & Testing",
  live: "Live",
  completed: "Completed",
  paused: "Paused",
};

const TYPE_LABELS: Record<string, string> = {
  website: "Website",
  mobile: "Mobile App",
  erp: "ERP System",
  consultancy: "Consultancy",
  design: "Design",
  other: "Project",
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateShort(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getPortalData(token: string) {
  const supabase = createAdminClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id, name, type, status, start_date, end_date, is_retainer, portal_enabled,
      clients(id, name, company),
      tasks(id, title, status, due_date, completed_at)
    `)
    .eq("portal_token", token)
    .is("deleted_at", null)
    .single();

  if (error || !project) return null;
  if (!project.portal_enabled) return null;

  const clientRow = project.clients as unknown as { id: string; name?: string | null; company?: string | null } | null;

  const { data: comms } = await supabase
    .from("communications")
    .select("id, type, subject, sent_at, created_at")
    .eq("client_id", clientRow?.id ?? "")
    .eq("direction", "out")
    .order("sent_at", { ascending: false })
    .limit(20);

  return {
    project,
    clientName: clientRow?.name ?? null,
    clientCompany: clientRow?.company ?? null,
    tasks: (project.tasks as Task[]) ?? [],
    comms: (comms ?? []) as Comm[],
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPortalData(token);
  if (!data) notFound();

  const { project, clientName, clientCompany, tasks, comms } = data;

  const firstName = clientName?.split(" ")[0] ?? "there";
  const typeLabel = TYPE_LABELS[project.type ?? ""] ?? "Project";
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const currentStepIdx = STATUS_STEPS.indexOf(project.status as typeof STATUS_STEPS[number]);

  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "completed");
  const activeTasks = tasks.filter((t) => t.status === "in_progress");
  const upcomingTasks = tasks.filter((t) => t.status === "todo");
  const progressPct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const NAVY = "#152238";
  const GOLD = "#f9a825";

  return (
    <div className="min-h-screen" style={{ background: "#f1f5f9" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{ background: NAVY }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold"
              style={{ background: GOLD, color: NAVY }}
            >
              B
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{SITE_NAME}</p>
              <p className="text-white/50 text-[11px]">Project Updates Portal</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${BUSINESS_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium px-3 py-1.5 rounded-sm"
            style={{ background: GOLD, color: NAVY }}
          >
            Chat with us
          </a>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div style={{ background: NAVY }} className="px-4 pt-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/60 text-sm mb-1">Hello, {firstName} 👋</p>
          <h1 className="text-white text-2xl font-bold font-display leading-tight">
            {project.name}
          </h1>
          {clientCompany && (
            <p className="text-white/50 text-sm mt-1">{clientCompany}</p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-sm uppercase tracking-wider"
              style={{ background: GOLD, color: NAVY }}
            >
              {statusLabel}
            </span>
            <span className="text-white/40 text-[11px] font-medium uppercase tracking-wider">
              {typeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content card stack ──────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-16 space-y-4">

        {/* Progress bar card */}
        <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Progress
            </p>
            <span className="text-sm font-bold" style={{ color: NAVY }}>
              {progressPct}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 100 ? "#10b981" : GOLD,
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {doneTasks.length} of {tasks.length} task{tasks.length !== 1 ? "s" : ""} completed
          </p>
        </div>

        {/* Pipeline card */}
        <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Project Phase
          </p>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = step === project.status && project.status !== "paused";
              const isPast = currentStepIdx > idx && project.status !== "paused";
              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 transition-colors"
                      style={
                        isActive
                          ? { borderColor: GOLD, background: GOLD, color: NAVY }
                          : isPast
                          ? { borderColor: "#10b981", background: "#10b981", color: "#fff" }
                          : { borderColor: "#e2e8f0", background: "#f8fafc", color: "#94a3b8" }
                      }
                    >
                      {isPast ? "✓" : idx + 1}
                    </div>
                    <span
                      className="text-[9px] capitalize text-center leading-tight hidden sm:block"
                      style={{
                        color: isActive ? GOLD : isPast ? "#10b981" : "#cbd5e1",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {step}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className="h-0.5 flex-1 mx-0.5 mb-3 rounded-full"
                      style={{ background: isPast || currentStepIdx > idx ? "#10b981" : "#e2e8f0" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {project.status === "paused" && (
            <p className="text-center text-xs text-slate-400 mt-3">This project is currently paused — we&apos;ll be in touch soon.</p>
          )}
        </div>

        {/* Timeline card */}
        {(project.start_date || project.end_date) && (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Timeline
            </p>
            <div className="grid grid-cols-2 gap-4">
              {project.start_date && (
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Start date</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>
                    {fmtDate(project.start_date)}
                  </p>
                </div>
              )}
              {project.end_date && (
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">
                    {project.is_retainer ? "First billing" : "Estimated delivery"}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>
                    {fmtDate(project.end_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Currently In Progress
            </p>
            <div className="space-y-2">
              {activeTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse"
                    style={{ background: GOLD }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{t.title}</p>
                    {t.due_date && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Due {fmtDateShort(t.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming tasks */}
        {upcomingTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Upcoming
            </p>
            <div className="space-y-2">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600">{t.title}</p>
                    {t.due_date && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Due {fmtDateShort(t.due_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed tasks */}
        {doneTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Completed
            </p>
            <div className="space-y-2">
              {doneTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: "#10b981" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 line-through">{t.title}</p>
                    {(t.completed_at ?? t.due_date) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.completed_at
                          ? `Done ${fmtDateShort(t.completed_at)}`
                          : `Due ${fmtDateShort(t.due_date)}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No tasks yet */}
        {tasks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60 text-center">
            <p className="text-slate-400 text-sm">Task list will appear here as work progresses.</p>
          </div>
        )}

        {/* Communications */}
        {comms.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Communications
            </p>
            <div className="space-y-3">
              {comms.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div
                    className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ background: `${NAVY}10`, color: NAVY }}
                  >
                    {c.type === "email" ? "✉" : c.type === "whatsapp" ? "💬" : c.type === "call" ? "📞" : "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {c.subject ?? "Communication"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                      {c.type ?? "Message"} · {fmtDateShort(c.sent_at ?? c.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact card */}
        <div
          className="rounded-lg p-5 border"
          style={{ background: NAVY, borderColor: `${NAVY}80` }}
        >
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3">
            Need to reach us?
          </p>
          <div className="space-y-2">
            <a
              href={`https://wa.me/${BUSINESS_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm font-medium"
              style={{ color: GOLD }}
            >
              <span>💬</span> Chat on WhatsApp
            </a>
            <a
              href={`mailto:${BUSINESS_EMAIL}`}
              className="flex items-center gap-2.5 text-sm"
              style={{ color: "#ffffff99" }}
            >
              <span>✉</span> {BUSINESS_EMAIL}
            </a>
            <a
              href={`tel:${BUSINESS_PHONE}`}
              className="flex items-center gap-2.5 text-sm"
              style={{ color: "#ffffff99" }}
            >
              <span>📞</span> {BUSINESS_PHONE}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-slate-400">
            Powered by{" "}
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-500 hover:text-slate-700">
              {SITE_NAME}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
