"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Story } from "@/lib/supabase";

export default function BrowsePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setFetchError("Failed to load stories. Please refresh and try again.");
      } else {
        setStories(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = stories.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.author_name.toLowerCase().includes(q) ||
      s.country_of_origin.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      (s.us_state?.toLowerCase().includes(q) ?? false) ||
      (s.profession?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-navy mb-2">Browse Stories</h1>
      <p className="text-navy/60 mb-10 text-lg">
        Thousands of journeys, each one unique. Search, filter, and explore.
      </p>

      {/* Search bar */}
      <div className="flex gap-3 mb-10">
        <input
          type="text"
          placeholder="Search by name, country, state, profession…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border border-navy/20 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="bg-navy/10 text-navy px-5 py-3 rounded-full text-sm font-semibold hover:bg-navy/20 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          {fetchError}
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && filtered.length === 0 && (
        <div className="text-center py-32">
          <p className="text-2xl font-bold text-navy mb-3">
            {query ? "No stories match your search" : "No stories yet"}
          </p>
          <p className="text-navy/60 mb-10">
            {query
              ? "Try different keywords — name, country, or US state."
              : "Be the first to share your journey to America."}
          </p>
          {!query && (
            <Link
              href="/share"
              style={{ backgroundColor: "#1B2A4A", color: "#FAF7F2" }}
              className="inline-block font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Share Your Story
            </Link>
          )}
        </div>
      )}

      {/* Results count */}
      {!loading && !fetchError && filtered.length > 0 && (
        <p className="text-sm text-navy/50 mb-6">
          {filtered.length} {filtered.length === 1 ? "story" : "stories"}
          {query ? ` matching "${query}"` : ""}
        </p>
      )}

      {/* Story grid */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="bg-white rounded-2xl border border-navy/10 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
            >
              {s.is_featured && (
                <span
                  className="self-start text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: "rgba(201,168,76,0.15)",
                    color: "#C9A84C",
                  }}
                >
                  Featured
                </span>
              )}

              <h2 className="font-bold text-navy text-lg leading-snug">
                {s.title}
              </h2>

              <p className="text-sm text-navy/60">
                {s.author_name}
                {s.country_of_origin && ` · ${s.country_of_origin}`}
                {s.year_of_arrival && ` · ${s.year_of_arrival}`}
              </p>

              <p className="text-sm text-navy/75 leading-relaxed line-clamp-4 flex-1">
                {s.story_text}
              </p>

              <div className="flex flex-wrap gap-2 mt-auto pt-1">
                {s.us_state && (
                  <span className="text-xs bg-navy/5 text-navy/60 font-medium px-3 py-1 rounded-full">
                    {s.us_state}
                  </span>
                )}
                {s.profession && (
                  <span className="text-xs bg-navy/5 text-navy/60 font-medium px-3 py-1 rounded-full">
                    {s.profession}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
