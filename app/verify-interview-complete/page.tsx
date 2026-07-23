"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_KEY = "mjtoa_share_draft";

export default function VerifyInterviewCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "ok" | "under_13" | "failed">("pending");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      try {
        const res = await fetch("/api/interview-age-check-status");
        const data = await res.json();

        if (data.status === "ok") {
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              parsed.phase = "interview";
              parsed.autoResume = true;
              localStorage.setItem(DRAFT_KEY, JSON.stringify(parsed));
            }
          } catch {
            // if this fails the user can still resume manually from /share
          }
          setStatus("ok");
          setTimeout(() => router.push("/share"), 1500);
          return;
        }

        if (data.status === "under_13") {
          try {
            localStorage.removeItem(DRAFT_KEY);
          } catch {
            // if this fails there's no draft to worry about resuming anyway
          }
          setStatus("under_13");
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
            <h1 className="text-2xl font-bold text-navy mb-3">Just a moment…</h1>
            <p className="text-navy/60">We're confirming your age. This usually takes just a few seconds.</p>
          </>
        )}
        {status === "ok" && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-navy mb-3">Thanks — you're all set!</h1>
            <p className="text-navy/60">Taking you back to your story…</p>
          </>
        )}
        {status === "under_13" && (
          <>
            <div className="text-4xl mb-4">💛</div>
            <h1 className="text-2xl font-bold text-navy mb-3">Thanks for letting us know</h1>
            <p className="text-navy/60 leading-relaxed">
              My Journey to America is only able to publish stories from people 13 and older,
              so we won't be able to continue right now. What you shared has been deleted, and
              we hope you'll come back and share your story when you're a bit older!
            </p>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-navy mb-3">Verification incomplete</h1>
            <p className="text-navy/60 mb-6">
              We couldn't confirm this yet. Your answers are still saved — you can head back and try again.
            </p>
            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem(DRAFT_KEY);
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.phase = "interview";
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(parsed));
                  }
                } catch {
                  // if this fails the user can still resume manually from /share
                }
                router.push("/share");
              }}
              className="bg-gold text-navy font-semibold py-3 px-6 rounded-xl hover:bg-gold/90 transition-colors"
            >
              Back to Your Story
            </button>
          </>
        )}
      </div>
    </div>
  );
}
