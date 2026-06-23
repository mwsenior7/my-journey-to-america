"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminStory = {
  id: string;
  author_name: string;
  country_of_origin: string;
  year_of_arrival: number | null;
  us_state: string | null;
  profession: string | null;
  story_text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  tags: string[] | null;
  moderation_reason: string | null;
  audio_url: string | null;
  video_url: string | null;
  interview_audio_urls: string[];
};

type AdminReport = {
  id: string;
  story_id: string;
  reporter_email: string | null;
  reason: string;
  comment: string | null;
  ai_category: string | null;
  ai_summary: string | null;
  created_at: string;
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

export default function AdminPanel() {
  const router = useRouter();
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stories" | "reports">("stories");

  useEffect(() => {
    refreshStories();
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  async function updateStatus(storyId: string, status: "approved" | "rejected" | "pending") {
    setUpdating(storyId);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, status }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setFetchError(errorData.error ?? "Failed to update status. Please try again.");
        return;
      }
      await refreshStories();
    } catch {
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
        router.push("/admin/login");
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
        router.push("/admin/login");
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setFetchError(errorData.error ?? "Failed to load stories.");
        return;
      }
      const { stories: data } = await res.json();
      setStories(data ?? []);
    } catch {
      setFetchError("Network error fetching stories.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchReports() {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      }
    } finally {
      setReportsLoading(false);
    }
  }

  const total    = stories.length;
  const pending  = stories.filter((s) => s.status === "pending").length;
  const approved = stories.filter((s) => s.status === "approved").length;
  const rejected = stories.filter((s) => s.status === "rejected").length;

  const visible = statusFilter === "all"
    ? stories
    : stories.filter((s) => s.status === statusFilter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
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
            onClick={handleLogout}
            className="text-sm font-semibold text-navy/60 hover:text-navy transition-colors border border-navy/20 rounded-lg px-4 py-2 hover:border-navy/40"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Total",    value: total,    color: "text-navy" },
          { label: "Pending",  value: pending,  color: "text-yellow-700" },
          { label: "Approved", value: approved, color: "text-green-700" },
          { label: "Rejected", value: rejected, color: "text-red-700" },
          { label: "Reports", value: reports.length, color: "text-orange-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-navy/10 p-5 shadow-sm">
            <p className="text-xs text-navy/50 font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("stories")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "stories" ? "bg-navy text-cream" : "bg-navy/10 text-navy"}`}
            >
              Stories
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("reports"); fetchReports(); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "reports" ? "bg-navy text-cream" : "bg-navy/10 text-navy"}`}
            >
              Reports {reports.length > 0 && `(${reports.length})`}
            </button>
          </div>

      {activeTab === "stories" && (
        <>
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

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm mb-6">
          {fetchError}
        </div>
      )}

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
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-navy text-lg">{story.author_name}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[story.status]}`}>
                      {story.status}
                    </span>
                  </div>
                  <p className="text-sm text-navy/50 mt-0.5">
                    {story.country_of_origin}
                    {story.us_state      && ` · ${story.us_state}`}
                    {story.year_of_arrival && ` · arrived ${story.year_of_arrival}`}
                    {story.profession    && ` · ${story.profession}`}
                    <span className="ml-2 text-navy/35">Submitted {formatDate(story.created_at)}</span>
                  </p>
                </div>

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

              <p className="text-sm text-navy/70 leading-relaxed">
                {isExpanded ? story.story_text : preview}
              </p>

              <button
                onClick={() => setExpandedId(isExpanded ? null : story.id)}
                className="mt-2 text-xs font-semibold text-gold hover:underline"
              >
                {isExpanded ? "Show less" : "Read full story"}
              </button>

              {story.moderation_reason && (
                <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-blue-500 text-xs font-bold uppercase tracking-wide shrink-0 mt-0.5">AI</span>
                  <p className="text-xs text-blue-700 leading-relaxed">{story.moderation_reason}</p>
                </div>
              )}

              {(story.audio_url || story.video_url || (story.interview_audio_urls && story.interview_audio_urls.length > 0)) && (
                <div className="mt-3 border border-navy/10 rounded-lg px-3 py-2.5 flex flex-col gap-2">
                  <p className="text-xs font-bold text-navy/50 uppercase tracking-wide">Recordings</p>
                  {story.audio_url && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-navy/50">Story audio</span>
                      <audio controls src={story.audio_url} preload="none" className="w-full h-8" />
                    </div>
                  )}
                  {story.video_url && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-navy/50">Video</span>
                      <a
                        href={story.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gold underline underline-offset-2 hover:text-gold/80 break-all"
                      >
                        {story.video_url}
                      </a>
                    </div>
                  )}
                  {story.interview_audio_urls && story.interview_audio_urls.map((url, i) => (
                    <div key={url} className="flex flex-col gap-1">
                      <span className="text-xs text-navy/50">Interview Q{i + 1}</span>
                      <audio controls src={url} preload="none" className="w-full h-8" />
                    </div>
                  ))}
                </div>
              )}

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
        </>
      )}

      {activeTab === "reports" && (
        <div>
          {reportsLoading && <p className="text-navy/50 text-sm">Loading reports...</p>}
          {!reportsLoading && reports.length === 0 && (
            <p className="text-navy/50 text-sm">No reports yet.</p>
          )}
          {reports.map(report => (
            <div key={report.id} className="border border-navy/10 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  {report.ai_category ?? "UNCATEGORIZED"}
                </span>
                <span className="text-xs text-navy/40">{formatDate(report.created_at)}</span>
              </div>
              <p className="text-sm text-navy mb-1"><strong>Story ID:</strong> {report.story_id}</p>
              <p className="text-sm text-navy mb-1"><strong>Reason:</strong> {report.reason}</p>
              {report.comment && <p className="text-sm text-navy mb-1"><strong>Comment:</strong> {report.comment}</p>}
              {report.reporter_email && <p className="text-sm text-navy mb-1"><strong>Reporter:</strong> {report.reporter_email}</p>}
              {report.ai_summary && <p className="text-sm text-navy/60 mt-2 italic">{report.ai_summary}</p>}
              <a
                href={`/stories/${report.story_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold hover:underline mt-2 inline-block"
              >
                View story →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
