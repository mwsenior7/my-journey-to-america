import Link from "next/link";
import HeroBackground from "@/components/HeroBackground";

const featuredStories = [
  {
    id: 1,
    name: "Maria Santos",
    origin: "São Paulo, Brazil",
    year: 2018,
    excerpt:
      "I arrived in Chicago with two suitcases and a dream. The cold was unlike anything I had known, but the warmth of neighbors who shared my language made me feel less alone.",
  },
  {
    id: 2,
    name: "Amir Khalil",
    origin: "Cairo, Egypt",
    year: 2015,
    excerpt:
      "Navigating the visa process took three years. When I finally landed in Houston, I wept at the gate — not from sadness, but from relief that a new chapter had truly begun.",
  },
  {
    id: 3,
    name: "Priya Nair",
    origin: "Kerala, India",
    year: 2020,
    excerpt:
      "I came for a PhD and stayed for love — both for my partner and for a country that kept surprising me with its kindness and its contradictions.",
  },
];

const communityHubs = [
  { name: "Latin America", emoji: "🌎", count: "2,400+ stories" },
  { name: "South Asia", emoji: "🌏", count: "1,800+ stories" },
  { name: "Middle East & Africa", emoji: "🌍", count: "1,200+ stories" },
  { name: "Europe", emoji: "🏛️", count: "900+ stories" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
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
        {/* Decorative SVG background */}
        <HeroBackground />

        {/* Text sits above the SVG */}
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
            A living archive of immigration stories — told by the people who lived
            them. Discover where people came from, how they arrived, and who they
            became.
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

          {/* Stat strip */}
          <div
            className="flex flex-wrap justify-center gap-8 mt-14 text-sm"
            style={{ color: "#FAF7F2", opacity: 0.6 }}
          >
            {[
              ["8,000+", "Stories archived"],
              ["140+",   "Countries represented"],
              ["50",     "US states covered"],
            ].map(([num, label]) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-bold" style={{ color: "#C9A84C", opacity: 1 }}>{num}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
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

      {/* Featured Stories */}
      <section style={{ backgroundColor: "#FAF7F2" }} className="pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 style={{ color: "#1B2A4A" }} className="text-3xl font-bold">
              Featured Stories
            </h2>
            <Link href="/browse" style={{ color: "#C9A84C" }} className="font-semibold hover:underline text-sm">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {featuredStories.map((story) => (
              <article
                key={story.id}
                className="bg-white rounded-2xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow"
                style={{ border: "1px solid rgba(27,42,74,0.12)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 style={{ color: "#1B2A4A" }} className="font-bold text-lg">
                      {story.name}
                    </h3>
                    <p style={{ color: "#1B2A4A", opacity: 0.6 }} className="text-sm">
                      {story.origin} &middot; {story.year}
                    </p>
                  </div>
                  <span
                    style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
                    className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                  >
                    Featured
                  </span>
                </div>
                <p style={{ color: "#1B2A4A", opacity: 0.75 }} className="text-sm leading-relaxed flex-1">
                  &ldquo;{story.excerpt}&rdquo;
                </p>
                <Link href="/browse" style={{ color: "#C9A84C" }} className="text-sm font-semibold hover:underline mt-auto">
                  Read full story →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Community Hubs Teaser */}
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
                <span className="font-semibold" style={{ color: "#FAF7F2" }}>{hub.name}</span>
                <span className="text-xs" style={{ color: "#FAF7F2", opacity: 0.6 }}>{hub.count}</span>
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
