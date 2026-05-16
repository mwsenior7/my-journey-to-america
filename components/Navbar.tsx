"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { label: "Home", href: "/" },
  { label: "Browse Stories", href: "/browse" },
  { label: "Share Your Story", href: "/share" },
  { label: "Community Hubs", href: "/hubs" },
  { label: "About", href: "/about" },
];

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

        <ul className="hidden md:flex gap-6 text-sm font-medium">
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
        <ul
          className="md:hidden px-4 pb-4 flex flex-col gap-3 text-sm font-medium border-t"
          style={{ backgroundColor: "#1B2A4A", borderColor: "#C9A84C44" }}
        >
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
      )}
    </nav>
  );
}
