export const dynamic = "force-dynamic";

import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { supabase, type Story } from "@/lib/supabase";
import ShareButton from "./ShareButton";
import StoryPageClient from "./StoryPageClient";

const getStory = cache(async (id: string): Promise<Story | null> => {
  noStore();
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

      <StoryPageClient
        storyId={story.id}
        authorName={story.author_name}
        countryOfOrigin={story.country_of_origin}
        usState={story.us_state ?? null}
        yearOfArrival={story.year_of_arrival ?? null}
        profession={story.profession ?? null}
        tags={story.tags ?? null}
        initialText={story.story_text}
        initialAudioUrl={story.audio_url}
        initialVideoUrl={story.video_url}
        isAuthor={isAuthor}
        originalLang={story.original_language ?? "en"}
        translations={translations}
        readCount={story.read_count ?? 0}
      />

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
