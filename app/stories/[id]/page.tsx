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
import RelatedStories from "@/components/RelatedStories";
import BackToTop from "@/components/BackToTop";

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

  const { data: translationsRaw } = await supabase
    .from("story_translations")
    .select("language_code, story_text")
    .eq("story_id", story.id);
  const translations = translationsRaw ?? [];

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

      <RelatedStories storyId={story.id} />

      <BackToTop />
    </div>
  );
}
