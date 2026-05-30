import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { supabase, type Story } from "@/lib/supabase";
import ShareButton from "./ShareButton";
import StoryEditor from "./StoryEditor";

const getStory = cache(async (id: string): Promise<Story | null> => {
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const story = await getStory(params.id);
  if (!story) return { title: "Story Not Found — My Journey to America" };

  const excerpt =
    story.story_text.length > 160
      ? story.story_text.slice(0, 160) + "…"
      : story.story_text;

  return {
    title: `${story.author_name}'s Journey — My Journey to America`,
    description: excerpt,
    openGraph: {
      title: `${story.author_name}'s Immigration Journey`,
      description: excerpt,
      type: "article",
    },
  };
}

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

export default async function StoryPage({ params }: { params: { id: string } }) {
  const story = await getStory(params.id);
  if (!story) notFound();

  const { userId } = await auth();
  const isAuthor = !!userId && story.clerk_user_id === userId;

  const [{ data: translationsRaw }, { data: relatedRaw }] = await Promise.all([
    supabase
      .from("story_translations")
      .select("language_code, story_text")
      .eq("story_id", story.id),
    supabase
      .from("stories")
      .select("id, author_name, country_of_origin, year_of_arrival, story_text")
      .eq("country_of_origin", story.country_of_origin)
      .eq("status", "approved")
      .neq("id", story.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const translations = translationsRaw ?? [];
  const related = relatedRaw ?? [];

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
          <span className="font-medium text-navy/70">{story.country_of_origin}</span>
          {story.us_state     && <><span>·</span><span>{story.us_state}</span></>}
          {story.year_of_arrival && <><span>·</span><span>{story.year_of_arrival}</span></>}
          {story.profession   && <><span>·</span><span>{story.profession}</span></>}
        </div>

        <h1 className="text-4xl font-extrabold text-navy leading-tight mb-2">
          {story.author_name}
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
      <StoryEditor
        storyId={story.id}
        initialText={story.story_text}
        isAuthor={isAuthor}
        originalLang={story.original_language ?? "en"}
        translations={translations}
      />

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
      <div className="flex items-center justify-between pt-6 border-t border-navy/10 mb-16">
        <p className="text-xs text-navy/40">
          Submitted{" "}
          {new Date(story.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <ShareButton />
      </div>

      {/* Related stories */}
      {related.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-navy mb-6">
            More stories from {story.country_of_origin}
          </h2>
          <div className="flex flex-col gap-4">
            {related.map((r) => {
              const excerpt =
                r.story_text.length > 180
                  ? r.story_text.slice(0, 180) + "…"
                  : r.story_text;
              return (
                <Link
                  key={r.id}
                  href={`/stories/${r.id}`}
                  className="group bg-white rounded-2xl border border-navy/10 p-5 hover:border-gold/40 hover:shadow-md transition-all flex flex-col gap-2"
                >
                  <div>
                    <p className="font-bold text-navy group-hover:text-navy leading-snug">
                      {r.author_name}
                    </p>
                    <p className="text-xs text-navy/50">
                      {r.country_of_origin}
                      {r.year_of_arrival ? ` · ${r.year_of_arrival}` : ""}
                    </p>
                  </div>
                  <p className="text-sm text-navy/65 leading-relaxed">{excerpt}</p>
                  <span className="text-xs font-semibold text-gold mt-1">
                    Read story →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
