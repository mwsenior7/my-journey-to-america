"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Story } from "@/lib/supabase";

function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/);
  if (yt) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${yt[1]}`}
        className="w-full aspect-video rounded-xl border border-navy/10"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeo[1]}`}
        className="w-full aspect-video rounded-xl border border-navy/10"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-semibold text-navy/60 hover:text-navy transition-colors border border-navy/20 px-4 py-2.5 rounded-lg"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Watch video
    </a>
  );
}

export default function StoryPage({ params }: { params: { id: string } }) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("id", params.id)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setStory(data);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-48">
        <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <p className="text-2xl font-bold text-navy mb-4">Story not found</p>
        <Link href="/browse" className="text-gold font-semibold hover:underline">
          ← Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Back */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-sm text-navy/50 hover:text-navy transition-colors mb-10"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Browse Stories
      </Link>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/50 mb-3">
          <span className="font-medium text-navy/70">{story.country}</span>
          {story.us_state && <><span>·</span><span>{story.us_state}</span></>}
          {story.year_arrived && <><span>·</span><span>{story.year_arrived}</span></>}
          {story.profession && <><span>·</span><span>{story.profession}</span></>}
        </div>

        <h1 className="text-4xl font-extrabold text-navy leading-tight mb-2">
          {story.name}
        </h1>

        {story.tags && story.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {story.tags.map((tag) => (
              <Link
                key={tag}
                href={`/browse?q=${encodeURIComponent(tag)}`}
                className="text-xs bg-gold/10 text-navy/60 font-medium px-3 py-1 rounded-full hover:bg-gold/20 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Story text */}
      <div
        className="prose prose-navy max-w-none text-navy/80 leading-[1.9] text-[1.0625rem] mb-12"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {story.story_text}
      </div>

      {/* Audio */}
      {story.audio_url && (
        <div className="mb-10">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-3">
            Audio Recording
          </p>
          <audio controls src={story.audio_url} className="w-full" />
        </div>
      )}

      {/* Video */}
      {story.video_url && (
        <div className="mb-10">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-3">
            Video
          </p>
          <VideoEmbed url={story.video_url} />
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between pt-6 border-t border-navy/10">
        <p className="text-xs text-navy/40">
          Submitted {new Date(story.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy/50 hover:text-navy transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </>
          )}
        </button>
      </div>
    </div>
  );
}
