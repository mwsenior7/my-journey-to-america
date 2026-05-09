export default function SharePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-navy mb-2">Share Your Story</h1>
      <p className="text-navy/60 mb-10 text-lg">
        Your journey matters. Help us preserve it for future generations.
      </p>

      <form className="flex flex-col gap-6 bg-white rounded-2xl border border-navy/10 shadow-sm p-8">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-navy" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            className="border border-navy/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-navy" htmlFor="origin">
            Country of Origin
          </label>
          <input
            id="origin"
            type="text"
            placeholder="Where did you come from?"
            className="border border-navy/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-navy" htmlFor="year">
            Year of Arrival
          </label>
          <input
            id="year"
            type="number"
            placeholder="e.g. 2015"
            className="border border-navy/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-navy" htmlFor="story">
            Your Story
          </label>
          <textarea
            id="story"
            rows={8}
            placeholder="Tell us about your journey — why you came, what it was like to arrive, and how your life has changed..."
            className="border border-navy/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
        </div>

        <button
          type="submit"
          className="bg-navy text-cream font-semibold py-3 rounded-full hover:bg-navy/90 transition-colors"
        >
          Submit Your Story
        </button>
      </form>
    </div>
  );
}
