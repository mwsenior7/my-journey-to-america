"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StoryCard, { type StoryCardData } from "@/components/StoryCard";

export default function RelatedStories({ storyId }: { storyId: string }) {
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stories/related?id=${encodeURIComponent(storyId)}&offset=${stories.length}`
      );
      if (res.ok) {
        const data = await res.json();
        setStories((prev) => [...prev, ...(data.stories ?? [])]);
        setHasMore(!!data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, stories.length]);

  // Initial load
  useEffect(() => {
    loadMore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Infinite scroll: fetch the next page when the sentinel nears the viewport
  useEffect(() => {
    if (!hasMore || loading || !initialized) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, initialized, loadMore]);

  if (initialized && stories.length === 0) return null;

  return (
    <div className="mt-16 pt-12 border-t border-navy/10">
      <h2 className="text-2xl font-bold text-navy mb-10">More Journeys</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
