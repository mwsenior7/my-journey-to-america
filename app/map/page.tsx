import InteractiveMap from "@/components/InteractiveMap";
import Link from "next/link";

export const metadata = {
  title: "Journey Map | My Journey to America",
  description:
    "An interactive map showing the paths immigrants took to reach America — every line a life, every dot a destination.",
};

export default function MapPage() {
  return (
    <div style={{ backgroundColor: "#1B2A4A", minHeight: "100vh" }}>
      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p
              className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
              style={{ color: "#C9A84C", opacity: 0.85 }}
            >
              Living Archive
            </p>
            <h1
              className="text-4xl md:text-5xl font-extrabold leading-tight"
              style={{ color: "#FAF7F2" }}
            >
              Every Journey,{" "}
              <span style={{ color: "#C9A84C" }}>Mapped.</span>
            </h1>
            <p
              className="mt-3 text-base max-w-xl leading-relaxed"
              style={{ color: "rgba(250,247,242,0.6)" }}
            >
              Each line traces a real person&rsquo;s path from their home country to
              their new life in America. Click any line to read their story.
              Lines animate as new stories are submitted — in real time.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
            <Link
              href="/share"
              style={{ backgroundColor: "#C9A84C", color: "#1B2A4A" }}
              className="inline-block font-bold px-7 py-3 rounded-full hover:opacity-90 transition-opacity text-sm text-center"
            >
              Add Your Journey
            </Link>
            <Link
              href="/browse"
              style={{ color: "rgba(250,247,242,0.5)" }}
              className="text-xs text-center hover:opacity-80 transition-opacity"
            >
              Browse all stories →
            </Link>
          </div>
        </div>
      </div>

      {/* Full map — full-bleed, spans the full viewport width */}
      <div className="w-full px-4 pb-12">
        <InteractiveMap compact={false} />
      </div>

      {/* How it works */}
      <div
        className="border-t"
        style={{ borderColor: "rgba(201,168,76,0.15)" }}
      >
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h2
            className="text-sm font-semibold tracking-widest uppercase mb-6"
            style={{ color: "rgba(201,168,76,0.6)" }}
          >
            How to read this map
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: "Animated lines",
                desc: "Each arc draws from a person's country of origin to their US state. Lines animate on load and when new stories arrive.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                ),
                title: "Color by decade",
                desc: "The color of each line shows when someone arrived — from amber (before 1980) through gold (2020s).",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                ),
                title: "Click to read",
                desc: "Tap or click any line or origin dot to open a preview of that person's story, then follow the link to read the full account.",
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col gap-2">
                <div style={{ color: "#C9A84C" }}>{item.icon}</div>
                <h3 className="font-semibold text-sm" style={{ color: "#FAF7F2" }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(250,247,242,0.5)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
