"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Story } from "@/lib/supabase";
import { US_STATES } from "@/lib/us-states";
import StoryCard from "@/components/StoryCard";
import BackToTop from "@/components/BackToTop";

const PAGE_SIZE = 100;

const DECADES = Array.from({ length: 13 }, (_, i) => ({
  label: `${1900 + i * 10}s`,
  value: String(1900 + i * 10),
}));

type Filters = {
  country: string;
  us_state: string;
  decade: string;
  profession: string;
};

const SELECT =
  "border border-navy/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white";

function BrowseContent() {
  const searchParams = useSearchParams();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>({
    country:    searchParams.get("country")    ?? "",
    us_state:   searchParams.get("state")      ?? "",
    decade:     searchParams.get("decade")     ?? "",
    profession: searchParams.get("profession") ?? "",
  });
  const [countries, setCountries] = useState<string[]>([]);
  const [professions, setProfessions] = useState<string[]>([]);

  useEffect(() => {
    async function loadMeta() {
      const [cRes, pRes] = await Promise.all([
        supabase.from("stories").select("country_of_origin").eq("status", "approved"),
        supabase.from("stories").select("profession").eq("status", "approved").not("profession", "is", null),
      ]);
      if (cRes.data) {
        setCountries(
          Array.from(new Set(cRes.data.map((r) => r.country_of_origin).filter(Boolean))).sort()
        );
      }
      if (pRes.data) {
        setProfessions(
          Array.from(new Set(pRes.data.map((r) => r.profession).filter(Boolean))).sort()
        );
      }
    }
    loadMeta();
  }, []);

  async function fetchStories(filtersArg: Filters) {
    let q = supabase
      .from("stories")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (filtersArg.country)    q = q.eq("country_of_origin", filtersArg.country);
    if (filtersArg.us_state)   q = q.eq("us_state", filtersArg.us_state);
    if (filtersArg.decade) {
      const start = parseInt(filtersArg.decade, 10);
      q = q.gte("year_of_arrival", start).lt("year_of_arrival", start + 10);
    }
    if (filtersArg.profession) q = q.eq("profession", filtersArg.profession);

    const { data, error } = await q;
    if (error) {
      setFetchError("Failed to load stories. Please refresh and try again.");
    } else {
      setStories(data ?? []);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(null);
      await fetchStories(filters);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filtered = stories.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.author_name.toLowerCase().includes(q) ||
      s.country_of_origin.toLowerCase().includes(q) ||
      s.story_text.toLowerCase().includes(q) ||
      (s.us_state?.toLowerCase().includes(q) ?? false) ||
      (s.profession?.toLowerCase().includes(q) ?? false) ||
      (s.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
    );
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function setFilter(key: keyof Filters) {
    return (e: React.ChangeEvent<HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-navy mb-2">Browse Stories</h1>
      <p className="text-navy/60 mb-10 text-lg">
        Thousands of journeys, each one unique. Search, filter, and explore.
      </p>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filters.country}    onChange={setFilter("country")}    className={SELECT} aria-label="Filter by country">
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filters.us_state}   onChange={setFilter("us_state")}   className={SELECT} aria-label="Filter by US state">
          <option value="">All States</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.decade}     onChange={setFilter("decade")}     className={SELECT} aria-label="Filter by decade">
          <option value="">Any Decade</option>
          {DECADES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>

        <select value={filters.profession} onChange={setFilter("profession")} className={SELECT} aria-label="Filter by profession">
          <option value="">All Professions</option>
          {professions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters({ country: "", us_state: "", decade: "", profession: "" })}
            className="bg-navy/10 text-navy text-sm font-semibold px-4 py-2 rounded-lg hover:bg-navy/20 transition-colors"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-10">
        <input
          type="text"
          placeholder="Search by name, country, state, profession, or tag…"
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

      {loading && (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      )}

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div className="text-center py-32">
          <p className="text-2xl font-bold text-navy mb-3">
            {query || activeFilterCount > 0
              ? "No stories match your search"
              : "No stories yet"}
          </p>
          <p className="text-navy/60 mb-10">
            {query || activeFilterCount > 0
              ? "Try adjusting your filters or search terms."
              : "Be the first to share your journey to America."}
          </p>
          {!query && activeFilterCount === 0 && (
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

      {!loading && !fetchError && filtered.length > 0 && (
        <p className="text-sm text-navy/50 mb-6">
          {filtered.length} {filtered.length === 1 ? "story" : "stories"}
          {query ? ` matching "${query}"` : ""}
        </p>
      )}

      {!loading && !fetchError && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      )}

      <BackToTop />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-48">
          <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
