"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Clock3, Send } from "lucide-react";
import { normalisePhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

const schema = z.object({
  booker_name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  booker_email: z.string().email("Please enter a valid email").max(150).trim(),
  booker_phone: z.string().max(30).trim().optional(),
  purpose: z.enum(["intro_call", "project_review", "consultation", "other"]),
  scheduled_at: z.string().min(1, "Choose a preferred date and time"),
  notes: z.string().max(1000).trim().optional(),
});

type FormData = z.infer<typeof schema>;

const purposeOptions = [
  { value: "intro_call", label: "Intro Call" },
  { value: "project_review", label: "Project Review" },
  { value: "consultation", label: "Consultation" },
  { value: "other", label: "Other" },
] as const;

function toNairobiIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00+03:00`
    : value;
}

interface BookingFormProps {
  variant?: "card" | "embedded";
}

const fieldClass = "w-full px-4 py-3 rounded-sm ring-1 ring-inset ring-slate-300 dark:ring-white/15 bg-white dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold transition-colors text-sm";
const labelClass = "block text-xs font-semibold text-slate-600 dark:text-white/60 mb-2";

export function BookingForm({ variant = "card" }: BookingFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: "intro_call" },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, scheduled_at: toNairobiIso(data.scheduled_at) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setServerError(json.error ?? "We could not save your booking. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Network error. Please try again in a moment.");
    }
  }

  const successContent = (
    <div className={cn("text-center", variant === "card" ? "p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10" : "py-8")}>
      <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={30} className="text-brand-gold" />
      </div>
      <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">Booking received</h2>
      <p className="text-brand-muted leading-relaxed">
        We&apos;ve saved your request and will confirm the slot by email shortly.
      </p>
    </div>
  );

  if (submitted) return successContent;

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Full Name <span className="text-brand-gold">*</span></label>
          <input {...register("booker_name")} type="text" placeholder="Jane Doe" className={fieldClass} />
          {errors.booker_name && <p className="mt-1.5 text-xs text-red-500">{errors.booker_name.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Email <span className="text-brand-gold">*</span></label>
          <input {...register("booker_email")} type="email" placeholder="jane@company.com" className={fieldClass} />
          {errors.booker_email && <p className="mt-1.5 text-xs text-red-500">{errors.booker_email.message}</p>}
        </div>
      </div>

      {/* Phone + Call Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Phone</label>
          {(() => {
            const phoneReg = register("booker_phone");
            return (
              <input
                {...phoneReg}
                type="tel"
                placeholder="+254 7XX XXX XXX"
                className={fieldClass}
                onBlur={(e) => {
                  setValue("booker_phone", normalisePhone(e.target.value));
                  phoneReg.onBlur(e);
                }}
              />
            );
          })()}
        </div>
        <div>
          <label className={labelClass}>Call Type <span className="text-brand-gold">*</span></label>
          <select {...register("purpose")} className={fieldClass}>
            {purposeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preferred Time */}
      <div>
        <label className={labelClass}>Preferred Date & Time <span className="text-brand-gold">*</span></label>
        <div className="relative">
          <input
            {...register("scheduled_at")}
            type="datetime-local"
            className={fieldClass}
          />
          <Clock3 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
        </div>
        {errors.scheduled_at && <p className="mt-1.5 text-xs text-red-500">{errors.scheduled_at.message}</p>}
        <p className="mt-1.5 text-[11px] text-brand-muted">All times in Nairobi time (EAT, UTC+3). Mon–Fri 9am–5pm.</p>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes <span className="text-brand-muted/60">(optional)</span></label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Briefly describe what you'd like to discuss."
          className={cn(fieldClass, "resize-none")}
        />
      </div>

      {serverError && (
        <div className="rounded-sm border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-gold text-brand-navy font-bold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Confirm Booking
            <Send size={14} />
          </>
        )}
      </button>
    </form>
  );

  if (variant === "embedded") return formContent;

  return (
    <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10">
      {formContent}
    </div>
  );
}
