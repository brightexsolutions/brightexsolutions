"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ImpersonateHandler() {
  const searchParams = useSearchParams();
  // The token extracted server-side from action_link is a token *hash* (long hex
  // string), not a 6-digit OTP. verifyOtp expects { token_hash, type } for this form.
  const tokenHash = searchParams.get("token") ?? "";
  const next = searchParams.get("next") ?? "/admin";
  const [status, setStatus] = useState<"verifying" | "redirecting" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!tokenHash) {
      setErrorMsg("Invalid or missing login token.");
      setStatus("error");
      return;
    }

    const supabase = createClient();

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }).then(({ error }) => {
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }
      setStatus("redirecting");
      // Hard navigation so the new session cookies are sent on the next request,
      // allowing middleware to verify the correct role claim.
      window.location.href = next;
    });
  }, [tokenHash, next]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      {status === "error" ? (
        <>
          <p className="text-sm font-medium text-red-500">Session could not be established.</p>
          <p className="text-xs text-muted-foreground">
            {errorMsg || "The link may have expired. Go back and try again."}
          </p>
          <a href="/admin/team" className="text-xs text-brand-gold hover:underline">Back to Team</a>
        </>
      ) : (
        <>
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {status === "redirecting" ? "Opening portal…" : "Verifying session…"}
          </p>
        </>
      )}
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ImpersonateHandler />
    </Suspense>
  );
}
