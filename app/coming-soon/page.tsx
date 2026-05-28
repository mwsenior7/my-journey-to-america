"use client";

import { useState } from "react";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate a brief submission delay; wire to a real API when ready
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#1B2A4A",
        color: "#FAF7F2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,168,76,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Decorative compass ring */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "560px",
          height: "560px",
          borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.12)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "720px",
          height: "720px",
          borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.06)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            color: "#C9A84C",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
            opacity: 0.9,
          }}
        >
          An Archive of Immigration Stories
        </p>

        {/* Site name */}
        <h1
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "1.25rem",
          }}
        >
          My Journey{" "}
          <span style={{ color: "#C9A84C" }}>to America</span>
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "1.125rem",
            lineHeight: 1.75,
            opacity: 0.75,
            marginBottom: "2.5rem",
          }}
        >
          A collection of immigrant stories — coming soon.
        </p>

        {/* Gold divider */}
        <div
          style={{
            width: "48px",
            height: "2px",
            backgroundColor: "#C9A84C",
            margin: "0 auto 2.5rem",
            opacity: 0.6,
          }}
        />

        {/* Email signup */}
        {submitted ? (
          <div
            style={{
              backgroundColor: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.35)",
              borderRadius: "1rem",
              padding: "1.25rem 1.5rem",
            }}
          >
            <p style={{ color: "#C9A84C", fontWeight: 600, marginBottom: "0.25rem" }}>
              You&apos;re on the list.
            </p>
            <p style={{ opacity: 0.65, fontSize: "0.9rem" }}>
              We&apos;ll let you know the moment we launch.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p
              style={{
                fontSize: "0.875rem",
                opacity: 0.6,
                marginBottom: "1rem",
              }}
            >
              Be the first to know when we launch.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "9999px",
                    border: "1.5px solid rgba(201,168,76,0.35)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#FAF7F2",
                    fontSize: "0.95rem",
                    outline: "none",
                    minWidth: 0,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(201,168,76,0.7)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(201,168,76,0.35)";
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: "#C9A84C",
                    color: "#1B2A4A",
                    fontWeight: 700,
                    padding: "0.75rem 1.5rem",
                    borderRadius: "9999px",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                    opacity: loading ? 0.7 : 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {loading ? "…" : "Notify me"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Footer note */}
        <p
          style={{
            marginTop: "3rem",
            fontSize: "0.75rem",
            opacity: 0.35,
            letterSpacing: "0.05em",
          }}
        >
          &copy; {new Date().getFullYear()} My Journey to America
        </p>
      </div>
    </div>
  );
}
