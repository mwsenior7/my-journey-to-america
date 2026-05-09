import Link from "next/link";

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
      <section className="bg-navy text-cream py-24 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          Every Journey{" "}
          <span className="text-gold">Tells a Story.</span>
        </h1>
        <p className="text-lg md:text-xl text-cream/80 max-w-2xl mx-auto mb-10">
          A living archive of immigration stories — told by the people who lived
          them. Discover where people came from, how they arrived, and who they
          became.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/browse"
            className="bg-gold text-navy font-semibold px-8 py-3 rounded-full hover:bg-gold/90 transition-colors"
          >
            Browse Stories
          </Link>
          <Link
            href="/share"
            className="border border-gold text-gold font-semibold px-8 py-3 rounded-full hover:bg-gold/10 transition-colors"
          >
            Share Your Story
          </Link>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 px-4 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-navy mb-4">Our Mission</h2>
        <p className="text-navy/70 text-lg leading-relaxed">
          My Journey to America is a community-powered platform that preserves
          and celebrates the immigrant experience. We believe every story of
          arrival — of sacrifice, resilience, and renewal — is a vital thread in
          the fabric of American life. We give those stories a permanent home.
        </p>
      </section>

      {/* Featured Stories */}
      <section className="bg-cream py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-navy">Featured Stories</h2>
            <Link href="/browse" className="text-gold font-semibold hover:underline text-sm">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {featuredStories.map((story) => (
              <article
                key={story.id}
                className="bg-white rounded-2xl shadow-sm border border-navy/10 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-navy text-lg">{story.name}</h3>
                    <p className="text-sm text-navy/60">
                      {story.origin} &middot; {story.year}
                    </p>
                  </div>
                  <span className="bg-gold/20 text-gold text-xs font-semibold px-3 py-1 rounded-full">
                    Featured
                  </span>
                </div>
                <p className="text-navy/75 text-sm leading-relaxed flex-1">
                  &ldquo;{story.excerpt}&rdquo;
                </p>
                <Link
                  href="/browse"
                  className="text-gold text-sm font-semibold hover:underline mt-auto"
                >
                  Read full story →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Community Hubs Teaser */}
      <section className="py-16 px-4 bg-navy text-cream">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Community Hubs</h2>
          <p className="text-cream/70 mb-12 max-w-xl mx-auto">
            Find stories from your home region. Connect with others who share
            your roots, your language, and your path.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {communityHubs.map((hub) => (
              <Link
                key={hub.name}
                href="/hubs"
                className="bg-white/10 hover:bg-white/20 transition-colors rounded-2xl p-6 flex flex-col items-center gap-2"
              >
                <span className="text-4xl">{hub.emoji}</span>
                <span className="font-semibold text-cream">{hub.name}</span>
                <span className="text-xs text-cream/60">{hub.count}</span>
              </Link>
            ))}
          </div>
          <Link
            href="/hubs"
            className="inline-block mt-10 bg-gold text-navy font-semibold px-8 py-3 rounded-full hover:bg-gold/90 transition-colors"
          >
            Explore All Hubs
          </Link>
        </div>
      </section>
    </div>
  );
}
