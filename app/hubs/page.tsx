import Link from "next/link";

const hubs = [
  {
    name: "Latin America",
    emoji: "🌎",
    description:
      "Stories from Mexico, Brazil, Colombia, Cuba, and across Central and South America.",
    color: "from-yellow-50 to-orange-50",
    countries: ["Mexico", "Brazil", "Colombia", "Cuba", "Peru", "Argentina", "Venezuela"],
  },
  {
    name: "South Asia",
    emoji: "🌏",
    description: "Journeys from India, Pakistan, Bangladesh, Sri Lanka, and Nepal.",
    color: "from-orange-50 to-red-50",
    countries: ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal"],
  },
  {
    name: "Middle East & Africa",
    emoji: "🌍",
    description: "Voices from Egypt, Nigeria, Ethiopia, Syria, Lebanon, and beyond.",
    color: "from-amber-50 to-yellow-50",
    countries: ["Egypt", "Nigeria", "Ethiopia", "Syria", "Lebanon", "Kenya", "Ghana"],
  },
  {
    name: "Europe",
    emoji: "🏛️",
    description: "Stories from Ukraine, Poland, Ireland, Greece, and across the continent.",
    color: "from-blue-50 to-indigo-50",
    countries: ["Ukraine", "Poland", "Ireland", "Greece", "Germany", "Italy", "Portugal"],
  },
  {
    name: "East & Southeast Asia",
    emoji: "🏯",
    description: "Narratives from China, the Philippines, Vietnam, Korea, and Japan.",
    color: "from-red-50 to-pink-50",
    countries: ["China", "Philippines", "Vietnam", "South Korea", "Japan", "Thailand"],
  },
  {
    name: "Caribbean",
    emoji: "🌊",
    description:
      "Rich stories from Haiti, Jamaica, Dominican Republic, and island nations.",
    color: "from-teal-50 to-cyan-50",
    countries: ["Haiti", "Jamaica", "Dominican Republic", "Trinidad and Tobago", "Barbados"],
  },
];

export default function HubsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-navy mb-2">Community Hubs</h1>
      <p className="text-navy/60 mb-12 text-lg">
        Find your community. Explore stories by region and connect with others
        who share your background.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hubs.map((hub) => (
          <div
            key={hub.name}
            className={`bg-gradient-to-br ${hub.color} rounded-2xl border border-navy/10 p-8 flex flex-col gap-4`}
          >
            <div className="flex flex-col gap-2">
              <span className="text-5xl">{hub.emoji}</span>
              <h2 className="text-xl font-bold text-navy">{hub.name}</h2>
              <p className="text-sm text-navy/60">{hub.description}</p>
            </div>

            {/* Country chips */}
            <div className="flex flex-wrap gap-2 mt-auto">
              {hub.countries.map((country) => (
                <Link
                  key={country}
                  href={`/browse?country=${encodeURIComponent(country)}`}
                  className="text-xs font-semibold text-navy/70 bg-white/70 border border-navy/10 px-3 py-1.5 rounded-full hover:bg-white hover:border-navy/30 transition-colors"
                >
                  {country}
                </Link>
              ))}
            </div>

            <Link
              href={`/browse?q=${encodeURIComponent(hub.name)}`}
              className="text-sm font-semibold text-gold hover:underline"
            >
              Browse all {hub.name} stories →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
