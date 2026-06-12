"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, Eye, EyeOff, Loader2, LinkIcon } from "lucide-react";
import Image from "next/image";
import { SITE_NAME, BUSINESS_EMAIL } from "@/lib/constants";

const roleLabels: Record<string, string> = {
  subcontractor: "Subcontractor Portal",
  marketing: "Marketing Portal",
  finance: "Finance Portal",
  support: "Support Portal",
};

const roleRedirects: Record<string, string> = {
  subcontractor: "/work",
  marketing: "/team/marketing",
  finance: "/team/finance",
  support: "/team/support",
};

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "subcontractor";

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    // Use @supabase/ssr's createBrowserClient so the session is stored in cookies.
    // Cookies are required for the Next.js middleware to see the session on
    // subsequent navigations and enforce role-based route protection.
    // We do NOT rely on detectSessionInUrl / flowType auto-detection (which was
    // broken before) — instead we explicitly parse the hash and call setSession.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabaseRef.current = supabase;

    const fallbackTimer = setTimeout(() => {
      setInitialising(false);
      setLinkExpired(true);
    }, 10000);

    // Listen for USER_UPDATED (fired after updateUser() sets the password).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED") {
        // Complete server-side registration: create team_members record + set app_metadata
        fetch("/api/team/register", { method: "POST" }).catch(() => {});
        setSuccess(true);
        clearTimeout(fallbackTimer);
        setTimeout(() => router.push(roleRedirects[role] ?? "/work"), 2000);
      }
    });

    // Explicitly parse the #access_token hash that Supabase puts in the URL.
    // More reliable than auto-detection; works regardless of flowType setting.
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";

    if (accessToken) {
      // Clear the hash from the URL — prevents the one-time token being reused.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data: { session }, error }) => {
          clearTimeout(fallbackTimer);
          if (session && !error) {
            setSessionReady(true);
            setInitialising(false);
          } else {
            setLinkExpired(true);
            setInitialising(false);
          }
        });
    } else {
      // No hash — check for an existing session (e.g. page refresh after hash cleared).
      supabase.auth.getSession().then(({ data: { session } }) => {
        clearTimeout(fallbackTimer);
        if (session) {
          setSessionReady(true);
          setInitialising(false);
        } else {
          setLinkExpired(true);
          setInitialising(false);
        }
      });
    }

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [role, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionReady) {
      setError("Session not ready — please wait a moment and try again.");
      return;
    }
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
      const { error: updateError } = await supabaseRef.current!.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(roleRedirects[role] ?? "/work"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (initialising) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Verifying your invite link…</p>
        </div>
      </div>
    );
  }

  if (linkExpired || (!sessionReady && !initialising)) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-10">
            <Image src="/assets/brightex-logo-light.png" alt="Brightex Solutions" width={160} height={40} className="h-10 w-auto"
              unoptimized onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="bg-brand-navy-light rounded-sm border border-white/10 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-5">
              <LinkIcon size={24} className="text-amber-400" />
            </div>
            <h1 className="font-display text-xl font-bold text-white mb-2">Link Expired or Already Used</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              This invite link has expired or has already been used. Please contact the{" "}
              <span className="text-brand-gold">{SITE_NAME} team</span> at{" "}
              <a href={`mailto:${BUSINESS_EMAIL}`} className="text-brand-gold underline underline-offset-2">{BUSINESS_EMAIL}</a>{" "}
              to request a new invite.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Image src="/assets/brightex-logo-light.png" alt="Brightex Solutions" width={160} height={40} className="h-10 w-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>

        <div className="bg-brand-navy-light rounded-sm border border-white/10 p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h1 className="font-display text-xl font-bold text-white mb-2">You&apos;re all set!</h1>
              <p className="text-white/60 text-sm">Redirecting you to your {roleLabels[role] ?? "portal"}…</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-display text-xl font-bold text-white">Set Your Password</h1>
                <p className="text-white/50 text-sm mt-1">
                  You&apos;ve been invited to the Brightex{" "}
                  <span className="text-brand-gold font-medium">{roleLabels[role] ?? "Portal"}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required minLength={8} placeholder="Min. 8 characters"
                      className="w-full px-4 py-3 pr-11 rounded-sm border border-white/15 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Confirm Password</label>
                  <input
                    type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required placeholder="Repeat password"
                    className="w-full px-4 py-3 rounded-sm border border-white/15 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors text-sm"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-sm px-4 py-3">{error}</p>
                )}

                <button type="submit" disabled={loading || !sessionReady}
                  className="w-full py-3.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (<><Loader2 size={16} className="animate-spin" />Setting up account…</>) : "Set Password & Continue"}
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
