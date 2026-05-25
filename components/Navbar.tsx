"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";

const links = [
  { label: "Home", href: "/" },
  { label: "Browse Stories", href: "/browse" },
  { label: "Share Your Story", href: "/share" },
  { label: "Community Hubs", href: "/hubs" },
  { label: "About", href: "/about" },
];

function LanguageToggle() {
  const { selectedLang, setSelectedLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Select language"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors"
        style={{ borderColor: "#C9A84C55", color: "#FAF7F2", backgroundColor: "transparent" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#C9A84C22")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        {current.code.toUpperCase()}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-xl border overflow-hidden z-50"
          style={{ backgroundColor: "#1B2A4A", borderColor: "#C9A84C33" }}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setSelectedLang(lang.code); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors"
              style={{
                color: lang.code === selectedLang ? "#C9A84C" : "#FAF7F2",
                backgroundColor: lang.code === selectedLang ? "#C9A84C11" : "transparent",
              }}
              onMouseEnter={e => { if (lang.code !== selectedLang) e.currentTarget.style.backgroundColor = "#FFFFFF11"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = lang.code === selectedLang ? "#C9A84C11" : "transparent"; }}
            >
              <span>{lang.nativeName}</span>
              {lang.code === selectedLang && (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={{ backgroundColor: "#1B2A4A" }} className="shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          style={{ color: "#C9A84C" }}
          className="text-2xl font-extrabold tracking-wide flex items-center gap-2"
        >
          <svg width="22" height="22" viewBox="0 0 44 44" fill="none" aria-hidden="true">
            <path d="M22 2L25.5 18.5L42 22L25.5 25.5L22 42L18.5 25.5L2 22L18.5 18.5Z" fill="#C9A84C" />
            <circle cx="22" cy="22" r="4" fill="#1B2A4A" />
          </svg>
          My Journey to America
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <ul className="flex gap-6 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  style={{ color: "#FAF7F2" }}
                  className="hover:opacity-75 transition-opacity duration-200"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageToggle />
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-0.5" style={{ backgroundColor: "#FAF7F2" }} />
          <span className="block w-6 h-0.5" style={{ backgroundColor: "#FAF7F2" }} />
          <span className="block w-6 h-0.5" style={{ backgroundColor: "#FAF7F2" }} />
        </button>
      </div>

      {open && (
        <div
          className="md:hidden px-4 pb-4 flex flex-col gap-3 border-t"
          style={{ backgroundColor: "#1B2A4A", borderColor: "#C9A84C44" }}
        >
          <ul className="flex flex-col gap-3 text-sm font-medium mt-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  style={{ color: "#FAF7F2" }}
                  className="block py-1 hover:opacity-75 transition-opacity duration-200"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <LanguageToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
