import Link from "next/link";

export type StoryCardData = {
  id: string;
  author_name: string;
  country_of_origin: string;
  us_state: string | null;
  year_of_arrival: number | null;
  profession: string | null;
  story_text: string;
  preview_text?: string | null;
  read_count?: number | null;
  tags?: string[] | null;
  audio_url?: string | null;
  video_url?: string | null;
};

export default function StoryCard({ story: s }: { story: StoryCardData }) {
  return (
    <article className="bg-white rounded-2xl border border-navy/10 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-bold text-navy text-lg leading-snug">{s.author_name}</h2>
        <p className="text-sm text-navy/50">
          {s.country_of_origin}
          {s.us_state      && ` · ${s.us_state}`}
          {s.year_of_arrival && ` · ${s.year_of_arrival}`}
          {s.profession    && ` · ${s.profession}`}
        </p>
      </div>

      <p className="text-sm text-navy/75 leading-relaxed line-clamp-5 flex-1">
        {s.preview_text && s.preview_text.trim()
          ? s.preview_text.trim()
          : `${s.story_text.slice(0, 150)}...`}
      </p>

      <Link
        href={`/stories/${s.id}`}
        className="text-sm font-semibold hover:underline"
        style={{ color: "#C9A84C" }}
      >
        Read their story →
      </Link>

      {(s.read_count ?? 0) > 0 && (
        <p className="text-xs font-medium" style={{ color: "#C9A84C" }}>
          👁 {s.read_count} {s.read_count === 1 ? "read" : "reads"}
        </p>
      )}

      {s.tags && s.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {s.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gold/10 text-navy/60 font-medium px-2.5 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {s.audio_url && (
        <audio controls src={s.audio_url} className="w-full h-9" preload="none" />
      )}

      {s.video_url && (
        <div className="flex items-center pt-1 mt-auto">
          <a
            href={s.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-navy/40 hover:text-navy transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch video
          </a>
        </div>
      )}
    </article>
  );
}
