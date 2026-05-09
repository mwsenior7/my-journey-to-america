export default function BrowsePage() {
  const stories = [
    { name: "Maria Santos", origin: "Brazil", year: 2018, tags: ["Latin America", "Chicago"] },
    { name: "Amir Khalil", origin: "Egypt", year: 2015, tags: ["Middle East", "Houston"] },
    { name: "Priya Nair", origin: "India", year: 2020, tags: ["South Asia", "Boston"] },
    { name: "Yuki Tanaka", origin: "Japan", year: 2012, tags: ["East Asia", "Seattle"] },
    { name: "Olga Petrenko", origin: "Ukraine", year: 2022, tags: ["Europe", "New York"] },
    { name: "Diego Morales", origin: "Mexico", year: 2019, tags: ["Latin America", "Los Angeles"] },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-navy mb-2">Browse Stories</h1>
      <p className="text-navy/60 mb-10 text-lg">
        Thousands of journeys, each one unique. Search, filter, and explore.
      </p>

      {/* Search bar placeholder */}
      <div className="flex gap-3 mb-10">
        <input
          type="text"
          placeholder="Search by name, country, city..."
          className="flex-1 border border-navy/20 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-white"
        />
        <button className="bg-navy text-cream px-6 py-3 rounded-full text-sm font-semibold hover:bg-navy/90 transition-colors">
          Search
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((s) => (
          <div
            key={s.name}
            className="bg-white rounded-2xl border border-navy/10 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="font-bold text-navy text-lg">{s.name}</h2>
            <p className="text-sm text-navy/60 mb-3">
              {s.origin} &middot; {s.year}
            </p>
            <div className="flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs bg-gold/20 text-gold font-semibold px-3 py-1 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
