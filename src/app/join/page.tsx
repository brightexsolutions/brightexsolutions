"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const roleLabels: Record<string, string> = {
  subcontractor: "Subcontractor Portal",
  marketing: "Marketing Portal",
  finance: "Finance Portal",
};

const roleRedirects: Record<string, string> = {
  subcontractor: "/work",
  marketing: "/team/marketing",
  finance: "/team/finance",
};

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "subcontractor";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase handles the email link magic — check if session was established
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(roleRedirects[role] ?? "/work");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Image
            src="/assets/brightex-logo-light.png"
            alt="Brightex Solutions"
            width={160}
            height={40}
            className="h-10 w-auto"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="bg-brand-navy-light rounded-sm border border-white/10 p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h1 className="font-display text-xl font-bold text-white mb-2">
                You&apos;re all set!
              </h1>
              <p className="text-white/60 text-sm">
                Redirecting you to your {roleLabels[role] ?? "portal"}…
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-display text-xl font-bold text-white">
                  Set Your Password
                </h1>
                <p className="text-white/50 text-sm mt-1">
                  You&apos;ve been invited to the Brightex{" "}
                  <span className="text-brand-gold font-medium">
                    {roleLabels[role] ?? "Portal"}
                  </span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-3 pr-11 rounded-sm border border-white/15 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full px-4 py-3 rounded-sm border border-white/15 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-sm px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Setting up account…" : "Set Password & Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
