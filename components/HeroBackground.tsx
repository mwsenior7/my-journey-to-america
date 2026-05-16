"use client";

import { ComposableMap, Geographies, Geography, Line, Marker } from "react-simple-maps";

const GEO_URL = "/countries-110m.json";

// ── Travel arcs: [lon, lat] pairs ─────────────────────────────────────────────
const ARCS: { from: [number,number]; to: [number,number]; delay: number; dur: number }[] = [
  { from: [0,   51], to: [-74, 41], delay: 0.2, dur: 3.5 }, // London    → New York
  { from: [21,  52], to: [-87, 42], delay: 0.3, dur: 4.0 }, // Warsaw    → Chicago
  { from: [3,    6], to: [-80, 26], delay: 0.6, dur: 4.2 }, // Lagos     → Miami
  { from: [31,  30], to: [-74, 41], delay: 0.9, dur: 4.5 }, // Cairo     → New York
  { from: [-46,-24], to: [-80, 26], delay: 0.4, dur: 3.8 }, // São Paulo → Miami
  { from: [-73, 20], to: [-74, 41], delay: 0.7, dur: 3.2 }, // Caribbean → New York
  { from: [73,  19], to: [-95, 30], delay: 1.0, dur: 4.8 }, // Mumbai    → Houston
  { from: [121, 14], to: [-118,34], delay: 1.6, dur: 5.5 }, // Manila    → Los Angeles
  { from: [121, 31], to: [-118,34], delay: 1.3, dur: 5.2 }, // Shanghai  → Los Angeles
];

// ── US destination cities ─────────────────────────────────────────────────────
const US_CITIES: { coordinates: [number,number]; label: string }[] = [
  { coordinates: [-74,  41], label: "New York"    },
  { coordinates: [-80,  26], label: "Miami"       },
  { coordinates: [-118, 34], label: "Los Angeles" },
  { coordinates: [-87,  42], label: "Chicago"     },
  { coordinates: [-95,  30], label: "Houston"     },
];

// ── Origin dots ───────────────────────────────────────────────────────────────
const ORIGIN_DOTS: { coordinates: [number,number]; delay: number }[] = [
  { coordinates: [0,    51], delay: 0.0 }, // London
  { coordinates: [21,   52], delay: 0.3 }, // Warsaw
  { coordinates: [3,     6], delay: 0.6 }, // Lagos
  { coordinates: [31,   30], delay: 0.9 }, // Cairo
  { coordinates: [-46, -24], delay: 0.4 }, // São Paulo
  { coordinates: [-73,  20], delay: 0.7 }, // Caribbean
  { coordinates: [73,   19], delay: 1.0 }, // Mumbai
  { coordinates: [121,  14], delay: 1.6 }, // Manila
  { coordinates: [121,  31], delay: 1.3 }, // Shanghai
  { coordinates: [53,   36], delay: 0.5 }, // Tehran
  { coordinates: [-17,  15], delay: 1.1 }, // Dakar
  { coordinates: [90,   24], delay: 0.8 }, // Dhaka
  { coordinates: [-67,  10], delay: 1.4 }, // Caracas
  { coordinates: [116,  40], delay: 0.2 }, // Beijing
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <ComposableMap
        projectionConfig={{ scale: 155, center: [10, 20] }}
        width={1440}
        height={580}
        style={{ width: "100%", height: "100%" }}
      >
        {/* ── Accurate world map ──────────────────────────────────────── */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(201,168,76,0.08)"
                stroke="rgba(201,168,76,0.22)"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover:   { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* ── Animated dotted travel arc routes ──────────────────────── */}
        {ARCS.map((arc, i) => (
          <Line
            key={i}
            from={arc.from}
            to={arc.to}
            stroke="#C9A84C"
            strokeWidth={1.5}
            fill="none"
            {...({
              strokeDasharray: "4 8",
              strokeLinecap: "round",
              style: {
                animation: [
                  `fadeInRoute 2s ease-out ${arc.delay}s both`,
                  `scrollDots ${arc.dur}s linear ${arc.delay}s infinite`,
                ].join(", "),
              },
            } as React.SVGProps<SVGPathElement>)}
          />
        ))}

        {/* ── Origin dots ────────────────────────────────────────────── */}
        {ORIGIN_DOTS.map((dot, i) => (
          <Marker key={i} coordinates={dot.coordinates}>
            <circle
              r={3}
              fill="#C9A84C"
              style={{
                animation: `pulseDot ${2 + (i % 4) * 0.3}s ease-in-out ${dot.delay}s infinite`,
              }}
            />
          </Marker>
        ))}

        {/* ── US city destination beacons ─────────────────────────────── */}
        {US_CITIES.map((city, i) => (
          <Marker key={city.label} coordinates={city.coordinates}>
            <circle
              r={20}
              fill="none"
              stroke="#C9A84C"
              strokeWidth={0.8}
              style={{ animation: `pulseDot 2.4s ease-in-out ${i * 0.18}s infinite` }}
            />
            <circle
              r={11}
              fill="none"
              stroke="#C9A84C"
              strokeWidth={1.2}
              style={{ animation: `pulseDot 2.4s ease-in-out ${0.6 + i * 0.18}s infinite` }}
            />
            <circle r={4} fill="#C9A84C" opacity={0.95} />
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
