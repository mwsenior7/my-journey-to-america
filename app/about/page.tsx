export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      {/* Intro */}
      <section className="mb-16">
        <h1 className="text-4xl font-bold text-navy mb-4">About Us</h1>
        <p className="text-navy/70 text-lg leading-relaxed mb-4">
          My Journey to America was born from a simple belief: every immigrant
          story deserves to be told, preserved, and celebrated. We are a
          living archive — part Ellis Island, part oral history project, part
          community — built by immigrants, for everyone.
        </p>
        <p className="text-navy/70 text-lg leading-relaxed">
          Since our founding, we have collected thousands of first-hand accounts
          spanning more than 100 countries of origin. Whether you arrived last
          year or your grandparents arrived a century ago, your story has a home
          here.
        </p>
      </section>

      {/* Mission */}
      <section className="bg-navy text-cream rounded-2xl p-10 mb-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
        <p className="text-cream/80 text-lg italic leading-relaxed max-w-2xl mx-auto">
          &ldquo;To preserve the human stories behind immigration — honoring
          sacrifice, celebrating resilience, and reminding America of the
          journeys that built it.&rdquo;
        </p>
      </section>

      {/* Values */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-navy mb-8">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Dignity", body: "Every story is treated with respect, care, and accuracy." },
            { title: "Belonging", body: "No matter where you're from, you have a place here." },
            { title: "Memory", body: "We preserve stories so they are never forgotten." },
          ].map((v) => (
            <div
              key={v.title}
              className="border border-gold/40 rounded-2xl p-6 hover:border-gold transition-colors"
            >
              <h3 className="text-gold font-bold text-xl mb-2">{v.title}</h3>
              <p className="text-navy/70 text-sm">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
