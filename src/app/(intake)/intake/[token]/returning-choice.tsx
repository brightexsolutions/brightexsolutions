"use client";

/**
 * Shown when a client reopens their original intake link having already
 * submitted. Coming back nearly always means "I need to change something", so
 * the previous submission is offered first and starting fresh is the
 * deliberate second option, rather than the other way round.
 */

import { SITE_NAME, BUSINESS_WHATSAPP } from "@/lib/constants";
import { SERVICE_LABELS } from "@/lib/intake-schema";

const NAVY = "#152238";
const GOLD = "#f9a825";

export function ReturningClientChoice({
  clientName,
  intake,
  editsRemaining,
  maxEdits,
  newRequestHref,
}: {
  clientName: string;
  intake: {
    projectTitle: string | null;
    serviceType: string | null;
    serviceTypes: string[] | null;
    submittedAt: string | null;
    editToken: string;
  };
  editsRemaining: number;
  maxEdits: number;
  newRequestHref: string;
}) {
  const firstName = clientName.trim().split(" ")[0] || "there";

  const services = (intake.serviceTypes?.length
    ? intake.serviceTypes
    : intake.serviceType ? [intake.serviceType] : []
  ).map((s) => SERVICE_LABELS[s] ?? s);

  const submittedLabel = intake.submittedAt
    ? new Date(intake.submittedAt).toLocaleDateString("en-KE", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

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
          <h1 className="text-white text-xl font-bold leading-snug">Welcome back, {firstName}</h1>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            You have already sent us your requirements. You can update them, or start a separate request.
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-3">

          {/* The existing submission */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Your submission
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

            {/* Only rendered when editing is genuinely open. Every closed case,
                whether we have read it or the allowance is spent, is caught by
                intakeEditLock() upstream and shown as IntakeLockedNotice, so
                the reason for closing lives in one place rather than two. */}
            <div className="mt-5">
              <a
                href={`/intake/edit/${intake.editToken}`}
                className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: GOLD, color: NAVY }}
              >
                Update my answers
              </a>
              <p className="text-[11px] text-slate-400 mt-2 text-center leading-relaxed">
                Everything you told us is still there. You can update it{" "}
                {editsRemaining} more {editsRemaining === 1 ? "time" : "times"} out of {maxEdits}.
                Once we have read your requirements they are locked in, so send any changes before then.
              </p>
            </div>
          </div>

          {/* A genuinely separate request */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <p className="text-sm font-semibold text-slate-700">Need something different?</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              If this is a new project rather than a change to the one above, start a separate request
              and we will treat it on its own.
            </p>
            <a
              href={newRequestHref}
              className="inline-flex items-center justify-center w-full mt-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Start a new request
            </a>
          </div>

          <div className="text-center pt-2">
            <a href={`https://wa.me/${BUSINESS_WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline">
              Or message us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
