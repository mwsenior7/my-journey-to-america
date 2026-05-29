"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ComposableMap, Geographies, Geography, Line, Marker } from "react-simple-maps";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const GEO_URL = "/countries-110m.json";

// ── Country coordinates (lon, lat) ────────────────────────────────────────────
const COUNTRY_COORDS: Record<string, [number, number]> = {
  // Americas
  Mexico: [-102, 23], Canada: [-96, 60], Brazil: [-52, -10],
  Colombia: [-74, 4], Venezuela: [-66, 8], Peru: [-76, -9],
  Argentina: [-64, -34], Ecuador: [-78, -1], Chile: [-71, -35],
  Bolivia: [-65, -17], Paraguay: [-58, -23], Uruguay: [-56, -32],
  Guyana: [-59, 5], Suriname: [-56, 4],
  "Trinidad and Tobago": [-61, 10], Trinidad: [-61, 10],
  Jamaica: [-77, 18], Cuba: [-79, 22], Haiti: [-73, 19],
  "Dominican Republic": [-71, 19], "Puerto Rico": [-66, 18],
  Guatemala: [-90, 15], "El Salvador": [-88, 14], Honduras: [-87, 15],
  Nicaragua: [-85, 13], "Costa Rica": [-84, 10], Panama: [-80, 9],
  Belize: [-88, 17], Barbados: [-59, 13], Bahamas: [-77, 25],
  "Antigua and Barbuda": [-62, 17], Grenada: [-62, 12],
  "Saint Lucia": [-61, 14], Guadeloupe: [-61, 16], Martinique: [-61, 15],
  // Europe
  "United Kingdom": [-2, 52], UK: [-2, 52], England: [-2, 52],
  Scotland: [-4, 56], Wales: [-3, 52], Ireland: [-8, 53],
  France: [2, 46], Germany: [10, 51], Italy: [12, 42],
  Spain: [-3, 40], Portugal: [-8, 40], Netherlands: [5, 52],
  Belgium: [4, 51], Switzerland: [8, 47], Austria: [15, 47],
  Sweden: [15, 62], Norway: [8, 62], Denmark: [10, 56],
  Finland: [26, 64], Poland: [20, 52], Ukraine: [32, 49],
  Russia: [100, 60], Romania: [25, 45], Hungary: [19, 47],
  "Czech Republic": [16, 50], Czechia: [16, 50], Slovakia: [19, 49],
  Bulgaria: [25, 43], Serbia: [21, 44], Croatia: [16, 45],
  "Bosnia and Herzegovina": [17, 44], Bosnia: [17, 44],
  Albania: [20, 41], Greece: [22, 39], Turkey: [35, 39],
  Lithuania: [24, 56], Latvia: [25, 57], Estonia: [25, 59],
  Belarus: [28, 53], Moldova: [29, 47], "North Macedonia": [22, 42],
  Kosovo: [21, 42], Montenegro: [19, 43], Slovenia: [15, 46],
  Luxembourg: [6, 50], Iceland: [-19, 65], Malta: [14, 36],
  Cyprus: [33, 35],
  // Middle East
  Iran: [54, 32], Iraq: [44, 33], Syria: [38, 35], Lebanon: [36, 33],
  Israel: [35, 31], Jordan: [37, 31], "Saudi Arabia": [45, 24],
  Yemen: [48, 16], Kuwait: [48, 29], UAE: [54, 24],
  "United Arab Emirates": [54, 24], Qatar: [51, 25],
  Bahrain: [50, 26], Oman: [57, 22], Palestine: [35, 32],
  Afghanistan: [67, 33], Egypt: [30, 27], Libya: [17, 25],
  Tunisia: [9, 34], Algeria: [3, 28], Morocco: [-5, 32],
  // Asia
  China: [104, 35], India: [78, 20], Pakistan: [70, 30],
  Bangladesh: [90, 24], "Sri Lanka": [81, 7], Nepal: [84, 28],
  Bhutan: [90, 27], Japan: [138, 36], "South Korea": [128, 36],
  Korea: [128, 36], "North Korea": [127, 40], Taiwan: [121, 24],
  "Hong Kong": [114, 22], Vietnam: [108, 14], Thailand: [101, 15],
  Indonesia: [106, -6], Malaysia: [109, 2], Philippines: [122, 12],
  Myanmar: [96, 17], Burma: [96, 17], Cambodia: [105, 12],
  Laos: [103, 18], Singapore: [104, 1], Mongolia: [103, 46],
  Kazakhstan: [67, 48], Uzbekistan: [63, 41], Kyrgyzstan: [74, 41],
  Tajikistan: [71, 39], Turkmenistan: [59, 40], Azerbaijan: [48, 40],
  Georgia: [44, 42], Armenia: [45, 40],
  // Africa
  Nigeria: [8, 10], Ethiopia: [40, 8], Kenya: [38, 0], Ghana: [-1, 8],
  "South Africa": [25, -29], Tanzania: [35, -6], Uganda: [32, 1],
  Cameroon: [12, 6], Somalia: [46, 6], Sudan: [30, 12],
  "South Sudan": [31, 7], Eritrea: [39, 15], Rwanda: [30, -2],
  Zimbabwe: [30, -20], Zambia: [27, -13], Senegal: [-14, 14],
  Liberia: [-9, 6], "Sierra Leone": [-12, 8], Guinea: [-11, 11],
  "Ivory Coast": [-7, 8], "Côte d'Ivoire": [-7, 8],
  Congo: [24, -3], "Democratic Republic of the Congo": [24, -3],
  DRC: [24, -3], Angola: [18, -12], Mozambique: [35, -18],
  Madagascar: [47, -20], Malawi: [34, -13], Botswana: [24, -22],
  Namibia: [18, -22], Gabon: [12, -1], Burundi: [30, -3],
  Mali: [-2, 17], Niger: [8, 17], Chad: [18, 15],
  "Burkina Faso": [-1, 12], Togo: [1, 8], Benin: [2, 9],
  Mauritania: [-11, 20], "Cape Verde": [-24, 16],
  // Oceania
  Australia: [134, -25], "New Zealand": [172, -41],
  Fiji: [178, -18], "Papua New Guinea": [147, -6],
};

// ── US state coordinates (geographic center) ──────────────────────────────────
const STATE_COORDS: Record<string, [number, number]> = {
  Alabama: [-86.9, 32.8], Alaska: [-153, 64], Arizona: [-111.9, 34.2],
  Arkansas: [-92.2, 34.7], California: [-119.4, 36.8], Colorado: [-105.5, 39.1],
  Connecticut: [-72.7, 41.6], Delaware: [-75.5, 39.0], Florida: [-81.5, 27.6],
  Georgia: [-83.4, 32.9], Hawaii: [-157.5, 21.1], Idaho: [-114.5, 44.4],
  Illinois: [-89.2, 40.0], Indiana: [-86.3, 40.3], Iowa: [-93.2, 42.0],
  Kansas: [-98.3, 38.5], Kentucky: [-85.3, 37.5], Louisiana: [-91.8, 31.2],
  Maine: [-69.4, 44.7], Maryland: [-76.8, 39.0], Massachusetts: [-71.5, 42.4],
  Michigan: [-85.4, 44.3], Minnesota: [-94.6, 46.4], Mississippi: [-89.7, 32.7],
  Missouri: [-92.6, 38.5], Montana: [-110.5, 46.9], Nebraska: [-99.9, 41.5],
  Nevada: [-116.4, 38.8], "New Hampshire": [-71.6, 43.2], "New Jersey": [-74.4, 40.1],
  "New Mexico": [-106.2, 34.3], "New York": [-75.5, 43.0],
  "North Carolina": [-79.4, 35.6], "North Dakota": [-100.5, 47.5],
  Ohio: [-82.8, 40.4], Oklahoma: [-97.1, 35.6], Oregon: [-120.6, 44.1],
  Pennsylvania: [-77.2, 40.6], "Rhode Island": [-71.5, 41.7],
  "South Carolina": [-80.9, 33.8], "South Dakota": [-100.3, 44.4],
  Tennessee: [-86.7, 35.8], Texas: [-99.9, 31.5], Utah: [-111.1, 39.3],
  Vermont: [-72.7, 44.0], Virginia: [-78.7, 37.5], Washington: [-120.7, 47.5],
  "West Virginia": [-80.5, 38.6], Wisconsin: [-89.6, 44.3], Wyoming: [-107.5, 43.1],
  "District of Columbia": [-77.0, 38.9], DC: [-77.0, 38.9],
};

// ── Decade color coding (vibrant palette) ─────────────────────────────────────
function getDecadeColor(year: number | null): string {
  if (!year) return "#8A9BB5";
  if (year < 1980) return "#F0C050"; // bright gold
  if (year < 1990) return "#F4875A"; // vibrant amber-orange
  if (year < 2000) return "#44B8D4"; // vibrant teal
  if (year < 2010) return "#68BC66"; // vibrant green
  if (year < 2020) return "#9870D8"; // vibrant purple
  return "#E8C440";                   // bright gold for 2020s
}

function getDecadeLabel(year: number | null): string {
  if (!year) return "Year unknown";
  if (year < 1980) return "Before 1980";
  if (year < 1990) return "1980s";
  if (year < 2000) return "1990s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
}

function lookupCountry(name: string): [number, number] | null {
  if (!name) return null;
  const n = name.trim();
  if (COUNTRY_COORDS[n]) return COUNTRY_COORDS[n];
  const lower = n.toLowerCase();
  for (const [key, coords] of Object.entries(COUNTRY_COORDS)) {
    if (key.toLowerCase() === lower) return coords;
  }
  for (const [key, coords] of Object.entries(COUNTRY_COORDS)) {
    const kl = key.toLowerCase();
    if (lower.includes(kl) || kl.includes(lower)) return coords;
  }
  return null;
}

function lookupState(name: string): [number, number] | null {
  if (!name) return null;
  const n = name.trim();
  if (STATE_COORDS[n]) return STATE_COORDS[n];
  const lower = n.toLowerCase();
  for (const [key, coords] of Object.entries(STATE_COORDS)) {
    if (key.toLowerCase() === lower) return coords;
  }
  for (const [key, coords] of Object.entries(STATE_COORDS)) {
    const kl = key.toLowerCase();
    if (lower.includes(kl) || kl.includes(lower)) return coords;
  }
  return null;
}

// ── Legend ────────────────────────────────────────────────────────────────────
const LEGEND = [
  { label: "Pre-1980", color: "#F0C050" },
  { label: "1980s",    color: "#F4875A" },
  { label: "1990s",    color: "#44B8D4" },
  { label: "2000s",    color: "#68BC66" },
  { label: "2010s",    color: "#9870D8" },
  { label: "2020s",    color: "#E8C440" },
  { label: "Unknown",  color: "#8A9BB5" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface MapStory {
  id: string;
  name: string;
  country: string;
  us_state: string | null;
  year_arrived: number | null;
  story_text: string;
  profession: string | null;
}

interface StoryArc {
  story: MapStory;
  from: [number, number];
  to:   [number, number];
  color: string;
  idx: number;
}

// ── Story popup card ──────────────────────────────────────────────────────────
function StoryCard({
  story,
  onClose,
}: {
  story: MapStory;
  onClose: () => void;
}) {
  const excerpt =
    story.story_text.length > 220
      ? story.story_text.slice(0, 220) + "…"
      : story.story_text;
  const color = getDecadeColor(story.year_arrived);
  const decade = getDecadeLabel(story.year_arrived);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none px-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border pointer-events-auto w-full max-w-sm"
        style={{ borderColor: "rgba(27,42,74,0.12)" }}
      >
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-navy text-base leading-tight">{story.name}</h3>
            <p className="text-sm text-navy/60 mt-0.5">
              {story.country}
              {story.us_state ? ` → ${story.us_state}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-3 hover:bg-navy/8 transition-colors"
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5 text-navy/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3">
          {story.year_arrived && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full self-start"
              style={{ backgroundColor: `${color}1A`, color }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              Arrived {story.year_arrived} · {decade}
            </span>
          )}

          <p className="text-sm text-navy/70 leading-relaxed">
            &ldquo;{excerpt}&rdquo;
          </p>

          <Link
            href={`/stories/${story.id}`}
            className="text-sm font-semibold hover:underline self-start"
            style={{ color: "#C9A84C" }}
          >
            Read full story →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InteractiveMap({ compact = false }: { compact?: boolean }) {
  const [stories, setStories] = useState<MapStory[]>([]);
  const [selected, setSelected] = useState<MapStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [newArcIds, setNewArcIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchStories() {
      console.log("[InteractiveMap] Fetching stories from Supabase...");
      // DB uses old column names: author_name, country_of_origin, year_of_arrival
      const { data, error } = await supabase
        .from("stories")
        .select("id, author_name, country_of_origin, us_state, year_of_arrival, story_text, profession")
        .order("created_at", { ascending: false })
        .limit(500);

      console.log("[InteractiveMap] Raw Supabase response:", { data, error });

      if (error) {
        console.error("[InteractiveMap] Supabase error:", error);
      }

      if (data) {
        const mapped: MapStory[] = data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: (s.author_name as string) ?? "",
          country: (s.country_of_origin as string) ?? "",
          us_state: (s.us_state as string | null) ?? null,
          year_arrived: (s.year_of_arrival as number | null) ?? null,
          story_text: (s.story_text as string) ?? "",
          profession: (s.profession as string | null) ?? null,
        }));
        console.log("[InteractiveMap] Mapped stories:", mapped);
        setStories(mapped);
      }
      setLoading(false);
    }
    fetchStories();

    // Real-time: add new stories as they're submitted
    const channel = supabase
      .channel("map-stories-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stories" },
        (payload) => {
          const s = payload.new as Record<string, unknown>;
          const mapped: MapStory = {
            id: s.id as string,
            name: (s.author_name as string) ?? "",
            country: (s.country_of_origin as string) ?? "",
            us_state: (s.us_state as string | null) ?? null,
            year_arrived: (s.year_of_arrival as number | null) ?? null,
            story_text: (s.story_text as string) ?? "",
            profession: (s.profession as string | null) ?? null,
          };
          setStories((prev) => [mapped, ...prev]);
          setNewArcIds((prev) => new Set(prev).add(mapped.id));
          setTimeout(() => {
            setNewArcIds((prev) => {
              const next = new Set(prev);
              next.delete(mapped.id);
              return next;
            });
          }, 4000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const arcs = useMemo<StoryArc[]>(() => {
    console.log("[InteractiveMap] Computing arcs for", stories.length, "stories");
    const result: StoryArc[] = [];
    let idx = 0;
    for (const story of stories) {
      if (!story.country || !story.us_state) {
        console.log("[InteractiveMap] Skip (no country/state):", story.name, "| country:", story.country, "| us_state:", story.us_state);
        continue;
      }
      const from = lookupCountry(story.country);
      const to = lookupState(story.us_state);
      if (!from) { console.log("[InteractiveMap] No coords for country:", story.country); continue; }
      if (!to)   { console.log("[InteractiveMap] No coords for state:", story.us_state); continue; }
      result.push({ story, from, to, color: getDecadeColor(story.year_arrived), idx: idx++ });
    }
    console.log("[InteractiveMap] Generated", result.length, "arcs");
    return result;
  }, [stories]);

  // Unique destination states for star markers
  const uniqueDestinations = useMemo(() => {
    const seen = new Set<string>();
    return arcs.filter((a) => {
      if (!a.story.us_state || seen.has(a.story.us_state)) return false;
      seen.add(a.story.us_state!);
      return true;
    });
  }, [arcs]);

  const handleLineClick = useCallback(
    (story: MapStory) => {
      setSelected((prev) => (prev?.id === story.id ? null : story));
    },
    []
  );

  const mapHeight = compact ? 380 : 700;
  const mapScale  = compact ? 140 : 220;
  const mapCenter: [number, number] = [-30, 15];

  return (
    <div className="flex flex-col gap-0">
      {/* Map canvas */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          height: mapHeight,
          background: "linear-gradient(180deg, #0F1E3A 0%, #1B2A4A 40%, #243354 100%)",
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-gold/70 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-cream/40 text-xs">Loading stories…</p>
          </div>
        )}

        <ComposableMap
          projectionConfig={{ scale: mapScale, center: mapCenter }}
          width={1440}
          height={mapHeight}
          style={{ width: "100%", height: "100%" }}
        >
          {/* World geography */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(250,247,242,0.13)"
                  stroke="rgba(201,168,76,0.42)"
                  strokeWidth={0.65}
                  style={{
                    default: { outline: "none" },
                    hover:   { outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Animated story arcs */}
          {arcs.map((arc) => {
            const isSelected = selected?.id === arc.story.id;
            const isNew = newArcIds.has(arc.story.id);
            const delay = isNew ? 0 : (arc.idx % 30) * 0.08;
            return (
              <Line
                key={arc.story.id}
                from={arc.from}
                to={arc.to}
                stroke={arc.color}
                strokeWidth={isSelected ? 4 : 2.5}
                fill="none"
                {...({
                  strokeDasharray: "2000",
                  strokeLinecap: "round",
                  opacity: selected
                    ? isSelected ? 1 : 0.18
                    : 0.88,
                  style: {
                    animation: `drawLine 2.8s ease-out ${delay}s both`,
                    cursor: "pointer",
                    transition: "opacity 0.25s, stroke-width 0.2s",
                    filter: isSelected
                      ? `drop-shadow(0 0 6px ${arc.color})`
                      : `drop-shadow(0 0 2px ${arc.color}80)`,
                  },
                  onClick: () => handleLineClick(arc.story),
                } as React.SVGProps<SVGPathElement>)}
              />
            );
          })}

          {/* Origin pulsing dots */}
          {arcs.map((arc) => (
            <Marker key={`orig-${arc.story.id}`} coordinates={arc.from}>
              {/* Outer pulse ring */}
              <circle
                r={selected?.id === arc.story.id ? 11 : 8}
                fill="none"
                stroke={arc.color}
                strokeWidth={0.8}
                opacity={selected?.id === arc.story.id ? 0.5 : 0.28}
                style={{ animation: `originPulse ${2 + (arc.idx % 5) * 0.25}s ease-in-out ${(arc.idx % 10) * 0.12}s infinite` }}
              />
              <circle
                r={selected?.id === arc.story.id ? 7 : 5.5}
                fill={arc.color}
                opacity={selected ? (selected.id === arc.story.id ? 1 : 0.25) : 0.92}
                style={{
                  animation: `originPulse ${2 + (arc.idx % 5) * 0.25}s ease-in-out ${(arc.idx % 10) * 0.12}s infinite`,
                  cursor: "pointer",
                  transition: "r 0.2s, opacity 0.25s",
                  filter: `drop-shadow(0 0 3px ${arc.color})`,
                }}
                onClick={() => handleLineClick(arc.story)}
              />
            </Marker>
          ))}

          {/* US destination star markers (one per state) */}
          {uniqueDestinations.map((arc) => (
            <Marker key={`dest-${arc.story.us_state}`} coordinates={arc.to}>
              {/* Outer glow rings */}
              <circle
                r={16}
                fill="none"
                stroke="#E8C440"
                strokeWidth={0.6}
                opacity={0.2}
                style={{ animation: "pulseDot 3.2s ease-in-out infinite" }}
              />
              <circle
                r={10}
                fill="none"
                stroke="#E8C440"
                strokeWidth={1}
                opacity={0.4}
                style={{ animation: "pulseDot 2.8s ease-in-out 0.4s infinite" }}
              />
              {/* Star shape — scaled up for visibility */}
              <polygon
                points="0,-7.5 2.2,-2.8 7.1,-2.8 3.4,1.1 4.6,6.8 0,3.8 -4.6,6.8 -3.4,1.1 -7.1,-2.8 -2.2,-2.8"
                fill="#E8C440"
                opacity={0.95}
                style={{
                  animation: "starGlow 2.4s ease-in-out infinite",
                  filter: "drop-shadow(0 0 4px #E8C440)",
                }}
              />
            </Marker>
          ))}
        </ComposableMap>

        {/* Story popup */}
        {selected && (
          <StoryCard story={selected} onClose={() => setSelected(null)} />
        )}

        {/* Arc count badge */}
        {!loading && arcs.length > 0 && (
          <div
            className="absolute bottom-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(27,42,74,0.9)", color: "#E8C440" }}
          >
            {arcs.length} {arcs.length === 1 ? "journey" : "journeys"} mapped
          </div>
        )}

        {/* Click hint */}
        {!loading && arcs.length > 0 && !selected && (
          <div
            className="absolute bottom-3 right-3 text-xs px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(27,42,74,0.75)", color: "rgba(250,247,242,0.5)" }}
          >
            Click a line to see a story
          </div>
        )}

        {/* No stories yet */}
        {!loading && arcs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-cream/30 text-sm">No approved stories yet — be the first!</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div
          className="flex flex-wrap gap-x-5 gap-y-2 justify-center py-4 px-4"
          style={{ backgroundColor: "#1B2A4A" }}
        >
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs" style={{ color: "rgba(250,247,242,0.55)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
