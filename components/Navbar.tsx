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
    <nav className="bg-navy text-cream shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gold tracking-wide">
          My Journey to America
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-6 text-sm font-medium">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="hover:text-gold transition-colors duration-200"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-0.5 bg-cream" />
          <span className="block w-6 h-0.5 bg-cream" />
          <span className="block w-6 h-0.5 bg-cream" />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <ul className="md:hidden bg-navy border-t border-gold/30 px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block py-1 hover:text-gold transition-colors duration-200"
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
