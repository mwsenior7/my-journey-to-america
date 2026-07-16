"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startVerification = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/veriff-session", { method: "POST" });
      const data = await res.json();

      if (data.alreadyVerified) {
        router.push("/share");
        return;
      }

      if (!res.ok || !data.sessionUrl) {
        throw new Error(data.error ?? "Failed to start verification");
      }

      window.location.href = data.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-navy/10 p-8 text-center">
        <div className="text-4xl mb-4">🪪</div>
        <h1 className="text-2xl font-bold text-navy mb-3">
          One More Verification Step
        </h1>
        <p className="text-navy/70 mb-2 leading-relaxed">
          Before you can continue sharing on My Journey to America, we need to verify your age.
          This extra step helps us keep the community safe for everyone.
        </p>
        <p className="text-navy/50 text-sm mb-8 leading-relaxed">
          We use Veriff, a trusted third-party service, to verify your identity and age.
          Your information is handled securely and never stored by us.
        </p>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={startVerification}
          disabled={loading}
          className="w-full bg-gold text-navy font-semibold py-3 px-6 rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Starting verification…" : "Verify My Age"}
        </button>

        <p className="text-xs text-navy/40 mt-6">
          Powered by Veriff · Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}
