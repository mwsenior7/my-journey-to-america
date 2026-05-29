"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type AdminStory = {
  id: string;
  name: string;
  country: string;
  year_arrived: number | null;
  us_state: string | null;
  profession: string | null;
  story_text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  tags: string[] | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
  approved: "bg-green-100  text-green-800  border border-green-200",
  rejected: "bg-red-100    text-red-800    border border-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function AdminPanel({ initiallyAuthenticated }: { initiallyAuthenticated: boolean }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initiallyAuthenticated);
  const [inputPassword, setInputPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (initiallyAuthenticated) {
      refreshStories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: inputPassword }),
    });
    if (res.ok) {
      await refreshStories();
    } else {
      setAuthError("Incorrect password. Please try again.");
    }
  }

  async function updateStatus(storyId: string, status: "approved" | "rejected" | "pending") {
    setUpdating(storyId);
    setFetchError("");
    console.log("[AdminPanel] updateStatus sending:", { storyId, status });
    try {
      const res = await fetch("/api/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, status }),
      });
      console.log("[AdminPanel] updateStatus response status:", res.status);
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[AdminPanel] updateStatus error response:", errorData);
        setFetchError(errorData.error ?? "Failed to update status. Please try again.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      console.log("[AdminPanel] updateStatus success:", data);
      await refreshStories();
    } catch (err) {
      console.error("[AdminPanel] updateStatus network error:", err);
      setFetchError("Network error updating status. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  async function deleteStory(storyId: string) {
    if (!confirm("Are you sure you want to permanently delete this story? This cannot be undone.")) return;
    setUpdating(storyId);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/delete-story", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setFetchError(errorData.error ?? "Failed to delete story. Please try again.");
        return;
      }
      await refreshStories();
    } catch {
      setFetchError("Network error deleting story. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  async function refreshStories() {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/stories");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setFetchError(errorData.error ?? "Failed to load stories.");
        // Don't change auth state on non-401 errors
        return;
      }
      const { stories: data } = await res.json();
      setStories(data ?? []);
      setIsAuthenticated(true);
    } catch {
      setFetchError("Network error fetching stories.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-navy/10 shadow-sm p-10 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-navy mb-1">Admin Panel</h1>
          <p className="text-navy/50 text-sm mb-8">My Journey to America</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Admin password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="border border-navy/20 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              autoFocus
              required
            />
            {authError && (
              <p className="text-red-600 text-sm">{authError}</p>
            )}
            <button
              type="submit"
              disabled={!inputPassword}
              className="bg-navy text-cream font-semibold py-3 rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Compute stats ──────────────────────────────────────────────────────────
  const total    = stories.length;
  const pending  = stories.filter((s) => s.status === "pending").length;
  const approved = stories.filter((s) => s.status === "approved").length;
  const rejected = stories.filter((s) => s.status === "rejected").length;

  const visible = statusFilter === "all"
    ? stories
    : stories.filter((s) => s.status === statusFilter);

  // ── Admin dashboard ────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">Story Moderation</h1>
          <p className="text-navy/50 text-sm mt-1">My Journey to America · Admin Panel</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshStories}
            disabled={loading}
            className="text-sm font-semibold text-navy/60 hover:text-navy transition-colors border border-navy/20 rounded-lg px-4 py-2 hover:border-navy/40 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              setIsAuthenticated(false);
              setStories([]);
            }}
            className="text-sm font-semibold text-navy/60 hover:text-navy transition-colors border border-navy/20 rounded-lg px-4 py-2 hover:border-navy/40"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total",    value: total,    color: "text-navy" },
          { label: "Pending",  value: pending,  color: "text-yellow-700" },
          { label: "Approved", value: approved, color: "text-green-700" },
          { label: "Rejected", value: rejected, color: "text-red-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
            <p className="text-xs text-navy/50 font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "all", "approved", "rejected"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors capitalize ${
              statusFilter === f
                ? "bg-navy text-cream"
                : "bg-navy/5 text-navy/60 hover:bg-navy/10"
            }`}
          >
            {f === "all" ? "All stories" : f}
            {f === "pending" && pending > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm mb-6">
          {fetchError}
        </div>
      )}

      {/* Stories */}
      {loading && stories.length === 0 && (
        <div className="text-center py-24 text-navy/40">
          <p className="text-sm">Loading stories…</p>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="text-center py-24 text-navy/40">
          <p className="text-lg font-semibold">No {statusFilter === "all" ? "" : statusFilter} stories</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {visible.map((story) => {
          const isExpanded = expandedId === story.id;
          const isUpdating = updating === story.id;
          const preview = story.story_text.slice(0, 220) + (story.story_text.length > 220 ? "…" : "");

          return (
            <div
              key={story.id}
              className="bg-white rounded-2xl border border-navy/10 shadow-sm p-6"
            >
              {/* Story header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-navy text-lg">{story.name}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[story.status]}`}>
                      {story.status}
                    </span>
                  </div>
                  <p className="text-sm text-navy/50 mt-0.5">
                    {story.country}
                    {story.us_state    && ` · ${story.us_state}`}
                    {story.year_arrived && ` · arrived ${story.year_arrived}`}
                    {story.profession  && ` · ${story.profession}`}
                    <span className="ml-2 text-navy/35">Submitted {formatDate(story.created_at)}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/stories/${story.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-navy/60 border border-navy/20 rounded-lg px-3 py-1.5 hover:border-navy/40 hover:text-navy transition-colors"
                  >
                    View page ↗
                  </Link>
                  {story.status !== "approved" && (
                    <button
                      onClick={() => updateStatus(story.id, "approved")}
                      disabled={isUpdating}
                      className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? "…" : "Approve"}
                    </button>
                  )}
                  {story.status !== "rejected" && (
                    <button
                      onClick={() => updateStatus(story.id, "rejected")}
                      disabled={isUpdating}
                      className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? "…" : "Reject"}
                    </button>
                  )}
                  {story.status !== "pending" && (
                    <button
                      onClick={() => updateStatus(story.id, "pending")}
                      disabled={isUpdating}
                      className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 hover:bg-yellow-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? "…" : "Reset to pending"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteStory(story.id)}
                    disabled={isUpdating}
                    className="text-xs font-semibold text-red-700 bg-white border border-red-400 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Story preview / full text */}
              <p className="text-sm text-navy/70 leading-relaxed">
                {isExpanded ? story.story_text : preview}
              </p>

              <button
                onClick={() => setExpandedId(isExpanded ? null : story.id)}
                className="mt-2 text-xs font-semibold text-gold hover:underline"
              >
                {isExpanded ? "Show less" : "Read full story"}
              </button>

              {/* Tags */}
              {story.tags && story.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {story.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gold/10 text-navy/60 px-2.5 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
