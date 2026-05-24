import Link from "next/link";
import HeroBackground from "@/components/HeroBackground";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

const communityHubs = [
  { name: "Latin America",       emoji: "🌎", count: "2,400+" },
  { name: "South Asia",          emoji: "🌏", count: "1,800+" },
  { name: "Middle East & Africa",emoji: "🌍", count: "1,200+" },
  { name: "Europe",              emoji: "🏛️", count: "900+"   },
];

export default async function HomePage() {
  const [
    { data: recent },
    { count: storyCount },
    { data: countryRows },
    { data: stateRows },
  ] = await Promise.all([
    supabase
      .from("stories")
      .select("id, name, country, year_arrived, story_text")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("stories").select("*", { count: "exact", head: true }),
    supabase.from("stories").select("country"),
    supabase
      .from("stories")
      .select("us_state")
      .not("us_state", "is", null),
  ]);

  const stories = recent ?? [];
  const totalStories = storyCount ?? 0;
  const uniqueCountries = new Set(
    (countryRows ?? []).map((r) => r.country).filter(Boolean)
  ).size;
  const uniqueStates = new Set(
    (stateRows ?? []).map((r) => r.us_state).filter(Boolean)
  ).size;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: "#1B2A4A",
          color: "#FAF7F2",
          position: "relative",
          overflow: "hidden",
          minHeight: "540px",
        }}
        className="py-28 px-4 text-center flex items-center justify-center"
      >
        <HeroBackground />

        <div style={{ position: "relative", zIndex: 10 }}>
          <p
            className="text-sm font-semibold tracking-[0.2em] uppercase mb-5"
            style={{ color: "#C9A84C", opacity: 0.9 }}
          >
            An Archive of Immigration Stories
          </p>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            Every Journey{" "}
            <span style={{ color: "#C9A84C" }}>Tells a Story.</span>
          </h1>
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-12"
            style={{ color: "#FAF7F2", opacity: 0.8, lineHeight: "1.75" }}
          >
            A living archive of immigration stories — told by the people who
            lived them. Discover where people came from, how they arrived, and
            who they became.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/browse"
              style={{ backgroundColor: "#C9A84C", color: "#1B2A4A" }}
              className="font-bold px-10 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base"
            >
              Browse Stories
            </Link>
            <Link
              href="/share"
              style={{ border: "2px solid #C9A84C", color: "#C9A84C" }}
              className="font-bold px-10 py-3.5 rounded-full hover:opacity-80 transition-opacity text-base"
            >
              Share Your Story
            </Link>
          </div>

          <div
            className="flex flex-wrap justify-center gap-8 mt-14 text-sm"
            style={{ color: "#FAF7F2", opacity: 0.6 }}
          >
            {[
              [totalStories > 0 ? totalStories.toLocaleString() : "0", "Stories archived"],
              [uniqueCountries > 0 ? String(uniqueCountries) : "0", "Countries represented"],
              [uniqueStates > 0 ? String(uniqueStates) : "0", "US states covered"],
            ].map(([num, label]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-bold" style={{ color: "#C9A84C", opacity: 1 }}>
                  {num}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#FAF7F2" }} className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 style={{ color: "#1B2A4A" }} className="text-3xl font-bold mb-4">
            Our Mission
          </h2>
          <p style={{ color: "#1B2A4A", opacity: 0.75 }} className="text-lg leading-relaxed">
            My Journey to America is a community-powered platform that preserves
            and celebrates the immigrant experience. We believe every story of
            arrival — of sacrifice, resilience, and renewal — is a vital thread
            in the fabric of American life. We give those stories a permanent home.
          </p>
        </div>
      </section>

      {/* ── Recent Stories ───────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#FAF7F2" }} className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 style={{ color: "#1B2A4A" }} className="text-3xl font-bold">
              {stories.length > 0 ? "Recent Stories" : "Share the First Story"}
            </h2>
            {stories.length > 0 && (
              <Link href="/browse" style={{ color: "#C9A84C" }} className="font-semibold hover:underline text-sm">
                View all →
              </Link>
            )}
          </div>

          {stories.length === 0 ? (
            <div className="text-center py-16">
              <p style={{ color: "#1B2A4A", opacity: 0.5 }} className="mb-6 text-lg">
                No stories yet — be the first to share yours.
              </p>
              <Link
                href="/share"
                style={{ backgroundColor: "#1B2A4A", color: "#FAF7F2" }}
                className="inline-block font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
              >
                Share Your Story
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {stories.map((story) => {
                const excerpt =
                  story.story_text.length > 220
                    ? story.story_text.slice(0, 220) + "…"
                    : story.story_text;
                return (
                  <article
                    key={story.id}
                    className="bg-white rounded-2xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow"
                    style={{
                      border: "1px solid rgba(27,42,74,0.12)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div>
                      <h3 style={{ color: "#1B2A4A" }} className="font-bold text-lg">
                        {story.name}
                      </h3>
                      <p style={{ color: "#1B2A4A", opacity: 0.6 }} className="text-sm">
                        {story.country}
                        {story.year_arrived ? ` · ${story.year_arrived}` : ""}
                      </p>
                    </div>
                    <p
                      style={{ color: "#1B2A4A", opacity: 0.75 }}
                      className="text-sm leading-relaxed flex-1"
                    >
                      &ldquo;{excerpt}&rdquo;
                    </p>
                    <Link
                      href={`/stories/${story.id}`}
                      style={{ color: "#C9A84C" }}
                      className="text-sm font-semibold hover:underline mt-auto"
                    >
                      Read full story →
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Community Hubs ───────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#1B2A4A", color: "#FAF7F2" }} className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Community Hubs</h2>
          <p className="mb-12 max-w-xl mx-auto" style={{ opacity: 0.75 }}>
            Find stories from your home region. Connect with others who share
            your roots, your language, and your path.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {communityHubs.map((hub) => (
              <Link
                key={hub.name}
                href="/hubs"
                className="rounded-2xl p-6 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <span className="text-4xl">{hub.emoji}</span>
                <span className="font-semibold" style={{ color: "#FAF7F2" }}>
                  {hub.name}
                </span>
                <span className="text-xs" style={{ color: "#FAF7F2", opacity: 0.6 }}>
                  {hub.count} stories
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/hubs"
            style={{ backgroundColor: "#C9A84C", color: "#1B2A4A" }}
            className="inline-block mt-10 font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Explore All Hubs
          </Link>
        </div>
      </section>
    </div>
  );
}
