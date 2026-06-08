"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, CheckCircle2, Clock3, Send } from "lucide-react";
import { normalisePhone } from "@/lib/utils";

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

export function BookingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      purpose: "intro_call",
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          scheduled_at: toNairobiIso(data.scheduled_at),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setServerError(json.error ?? "We could not save your booking right now. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError("Network error. Please try again in a moment.");
    }
  }

  if (submitted) {
    return (
      <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={30} className="text-brand-gold" />
        </div>
        <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white mb-3">
          Booking received
        </h2>
        <p className="text-brand-muted leading-relaxed">
          We&apos;ve saved your request and sent the details to the Brightex team. You&apos;ll get a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-11 h-11 rounded-sm bg-brand-gold/10 flex items-center justify-center shrink-0">
          <CalendarDays size={20} className="text-brand-gold" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white">
            Request a Call
          </h2>
          <p className="text-sm text-brand-muted mt-1">
            Share a preferred time in Nairobi time (EAT). We&apos;ll confirm the slot by email.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
              Full Name <span className="text-brand-gold">*</span>
            </label>
            <input
              {...register("booker_name")}
              type="text"
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
            />
            {errors.booker_name && <p className="mt-1.5 text-xs text-red-500">{errors.booker_name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
              Email <span className="text-brand-gold">*</span>
            </label>
            <input
              {...register("booker_email")}
              type="email"
              placeholder="jane@company.com"
              className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
            />
            {errors.booker_email && <p className="mt-1.5 text-xs text-red-500">{errors.booker_email.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
              Phone
            </label>
            {(() => {
              const phoneReg = register("booker_phone");
              return (
                <input
                  {...phoneReg}
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
                  onBlur={(e) => {
                    setValue("booker_phone", normalisePhone(e.target.value));
                    phoneReg.onBlur(e);
                  }}
                />
              );
            })()}
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
              Call Type <span className="text-brand-gold">*</span>
            </label>
            <select
              {...register("purpose")}
              className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-brand-navy text-brand-navy dark:text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
            >
              {purposeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
            Preferred Time <span className="text-brand-gold">*</span>
          </label>
          <div className="relative">
            <input
              {...register("scheduled_at")}
              type="datetime-local"
              className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
            />
            <Clock3 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
          </div>
          {errors.scheduled_at && <p className="mt-1.5 text-xs text-red-500">{errors.scheduled_at.message}</p>}
          <p className="mt-1.5 text-xs text-brand-muted">
            Available hours are typically Monday to Friday, 9am to 5pm EAT.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-2">
            Notes
          </label>
          <textarea
            {...register("notes")}
            rows={4}
            placeholder="Briefly share what you’d like to discuss."
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm resize-none"
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
          className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Confirm Request
              <Send size={15} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
