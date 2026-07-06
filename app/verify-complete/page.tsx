"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "verified" | "failed">("pending");

  useEffect(() => {
    // Poll for verification status — Veriff webhook may take a few seconds
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      try {
        const res = await fetch("/api/veriff-status");
        const data = await res.json();

        if (data.verified) {
          setStatus("verified");
          setTimeout(() => router.push("/share"), 2000);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setStatus("failed");
          return;
        }

        setTimeout(poll, 3000);
      } catch {
        attempts++;
        if (attempts >= maxAttempts) setStatus("failed");
        else setTimeout(poll, 3000);
      }
    };

    poll();
  }, [router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-navy/10 p-8 text-center">
        {status === "pending" && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <h1 className="text-2xl font-bold text-navy mb-3">Verifying your identity…</h1>
            <p className="text-navy/60">This usually takes just a few seconds. Please wait.</p>
          </>
        )}
        {status === "verified" && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-navy mb-3">You're verified!</h1>
            <p className="text-navy/60">Taking you to share your story…</p>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-navy mb-3">Verification incomplete</h1>
            <p className="text-navy/60 mb-6">
              We couldn't confirm your verification yet. This can happen if you are under 18,
              your ID was not accepted, or the process timed out.
            </p>
            <button
              onClick={() => router.push("/verify")}
              className="bg-gold text-navy font-semibold py-3 px-6 rounded-xl hover:bg-gold/90 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
