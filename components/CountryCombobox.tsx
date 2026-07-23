"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { COUNTRIES } from "@/lib/countries";
import { INPUT } from "@/lib/form-styles";

export function CountryCombobox({
  id,
  value,
  onChange,
  hasError,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery((q) => (q === value ? q : value));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  function selectCountry(country: string) {
    onChange(country);
    setQuery(country);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlightedIndex]) {
        e.preventDefault();
        selectCountry(filtered[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          setHighlightedIndex(0);
          if (next.trim() === "") onChange("");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={`${INPUT}${hasError ? " border-red-400 focus:ring-red-400" : ""}`}
      />
      {open && filtered.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-navy/15 rounded-lg shadow-lg py-1"
        >
          {filtered.map((c, i) => (
            <li
              key={c}
              role="option"
              aria-selected={c === value}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCountry(c);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`px-4 py-2 text-sm cursor-pointer ${
                i === highlightedIndex ? "bg-gold/15 text-navy" : "text-navy/80"
              }`}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() !== "" && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-navy/15 rounded-lg shadow-lg py-2 px-4 text-sm text-navy/40">
          No matches
        </div>
      )}
    </div>
  );
}
