/**
 * Shown when a client opens an edit link for a submission that is closed to
 * further changes, most often because we have read it.
 *
 * A closed door needs to say who closed it and what to do next, or it reads as
 * a broken link. Their answers stay visible below the notice: the point is that
 * the record is fixed, not that it is hidden from the person who wrote it.
 */

import { SITE_NAME, BUSINESS_WHATSAPP } from "@/lib/constants";
import { SERVICE_LABELS } from "@/lib/intake-schema";
import type { IntakeLockReason } from "@/lib/intake-submission";

const NAVY = "#152238";
const GOLD = "#f9a825";

const HEADING: Record<IntakeLockReason, string> = {
  reviewed: "We have read your requirements",
  archived: "This request is closed",
  budget: "Your answers are final",
};

export function IntakeLockedNotice({
  clientName,
  reason,
  message,
  intake,
  newRequestHref,
}: {
  clientName: string;
  reason: IntakeLockReason;
  message: string;
  intake: {
    projectTitle: string | null;
    serviceType: string | null;
    serviceTypes: string[] | null;
    submittedAt: string | null;
    reviewedAt?: string | null;
  };
  /** Omitted when we have no client-scoped link to start a fresh request. */
  newRequestHref?: string;
}) {
  const firstName = clientName.trim().split(" ")[0] || "there";

  const services = (intake.serviceTypes?.length
    ? intake.serviceTypes
    : intake.serviceType ? [intake.serviceType] : []
  ).map((s) => SERVICE_LABELS[s] ?? s);

  const fmt = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString("en-KE", {
          day: "numeric", month: "long", year: "numeric",
        })
      : null;

  const submittedLabel = fmt(intake.submittedAt);
  const reviewedLabel = fmt(intake.reviewedAt);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f1f5f9" }}>
      <div style={{ background: NAVY }} className="shrink-0">
        <div style={{ height: 3, background: GOLD }} />
        <div className="px-4 pt-6 pb-6 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-extrabold shrink-0 shadow-sm"
              style={{ background: GOLD, color: NAVY }}>B</div>
            <p className="text-white font-semibold text-sm tracking-wide">{SITE_NAME}</p>
          </div>
          <h1 className="text-white text-xl font-bold leading-snug">
            {HEADING[reason]}, {firstName}
          </h1>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            Nothing is lost. Everything you sent us is below.
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-3">

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {reason === "reviewed" && reviewedLabel
                    ? `Reviewed on ${reviewedLabel}`
                    : HEADING[reason]}
                </p>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{message}</p>
              </div>
            </div>

            <a
              href={`https://wa.me/${BUSINESS_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full mt-5 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: GOLD, color: NAVY }}
            >
              Message us about a change
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              What you sent us
            </p>
            <p className="text-base font-bold text-slate-800 leading-snug">
              {intake.projectTitle || services[0] || "Your requirements"}
            </p>
            {services.length > 0 && (
              <p className="text-xs text-[#f9a825] font-medium mt-0.5">{services.join(" + ")}</p>
            )}
            {submittedLabel && (
              <p className="text-xs text-slate-400 mt-1">Sent on {submittedLabel}</p>
            )}
          </div>

          {newRequestHref && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
              <p className="text-sm font-semibold text-slate-700">Need something different?</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                If this is a new project rather than a change to the one above, start a separate
                request and we will treat it on its own.
              </p>
              <a
                href={newRequestHref}
                className="inline-flex items-center justify-center w-full mt-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                Start a new request
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
