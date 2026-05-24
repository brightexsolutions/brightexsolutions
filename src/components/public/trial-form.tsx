"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Zap } from "lucide-react";

const schema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email("Please enter a valid email").trim(),
  company: z.string().max(100).trim().optional(),
  phone: z.string().max(20).trim().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  productSlug: string;
  productName: string;
  trialDays: number;
  pricingFrom: string;
}

export function TrialForm({ productSlug, productName, trialDays, pricingFrom }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await fetch(`/api/products/${productSlug}/trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-brand-gold" />
        </div>
        <h3 className="font-display text-xl font-bold text-brand-navy dark:text-white mb-2">
          Trial request received!
        </h3>
        <p className="text-brand-muted text-sm leading-relaxed">
          We'll set up your {trialDays}-day trial and send access details to your email within a few hours.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-sm bg-white dark:bg-brand-navy-light border border-brand-border dark:border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-sm bg-brand-gold/10 flex items-center justify-center">
          <Zap size={18} className="text-brand-gold" />
        </div>
        <div>
          <div className="font-semibold text-brand-navy dark:text-white text-sm">
            Start your {trialDays}-day free trial
          </div>
          <div className="text-xs text-brand-muted">
            {productName} · then from {pricingFrom}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-1.5">
            Full Name <span className="text-brand-gold">*</span>
          </label>
          <input
            {...register("name")}
            type="text"
            placeholder="Jane Doe"
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-1.5">
            Work Email <span className="text-brand-gold">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="jane@school.ac.ke"
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-1.5">
            Organisation
          </label>
          <input
            {...register("company")}
            type="text"
            placeholder="School / Company name"
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider mb-1.5">
            Phone
          </label>
          <input
            {...register("phone")}
            type="tel"
            placeholder="+254 7XX XXX XXX"
            className="w-full px-4 py-3 rounded-sm border border-brand-border dark:border-white/15 bg-brand-bg dark:bg-white/5 text-brand-navy dark:text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-sm border border-red-200 dark:border-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
          ) : (
            <>
              <Zap size={15} />
              Start Free Trial
            </>
          )}
        </button>

        <p className="text-xs text-center text-brand-muted">
          No credit card required. Cancel anytime.
        </p>
      </form>
    </div>
  );
}
