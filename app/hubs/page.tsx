import Link from "next/link";

const hubs = [
  {
    name: "Latin America",
    emoji: "🌎",
    count: "2,400+",
    description:
      "Stories from Mexico, Brazil, Colombia, Cuba, and across Central and South America.",
    color: "from-yellow-50 to-orange-50",
  },
  {
    name: "South Asia",
    emoji: "🌏",
    count: "1,800+",
    description:
      "Journeys from India, Pakistan, Bangladesh, Sri Lanka, and Nepal.",
    color: "from-orange-50 to-red-50",
  },
  {
    name: "Middle East & Africa",
    emoji: "🌍",
    count: "1,200+",
    description:
      "Voices from Egypt, Nigeria, Ethiopia, Syria, Lebanon, and beyond.",
    color: "from-amber-50 to-yellow-50",
  },
  {
    name: "Europe",
    emoji: "🏛️",
    count: "900+",
    description:
      "Stories from Ukraine, Poland, Ireland, Greece, and across the continent.",
    color: "from-blue-50 to-indigo-50",
  },
  {
    name: "East & Southeast Asia",
    emoji: "🏯",
    count: "1,100+",
    description:
      "Narratives from China, the Philippines, Vietnam, Korea, and Japan.",
    color: "from-red-50 to-pink-50",
  },
  {
    name: "Caribbean",
    emoji: "🌊",
    count: "600+",
    description:
      "Rich stories from Haiti, Jamaica, Puerto Rico, Dominican Republic, and island nations.",
    color: "from-teal-50 to-cyan-50",
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
          <Link
            key={hub.name}
            href="/browse"
            className={`bg-gradient-to-br ${hub.color} rounded-2xl border border-navy/10 p-8 hover:shadow-md transition-shadow flex flex-col gap-3`}
          >
            <span className="text-5xl">{hub.emoji}</span>
            <h2 className="text-xl font-bold text-navy">{hub.name}</h2>
            <p className="text-sm text-navy/60 flex-1">{hub.description}</p>
            <span className="text-gold font-semibold text-sm">
              {hub.count} stories →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
