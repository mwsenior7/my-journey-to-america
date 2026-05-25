"use client";

import { useState, useEffect } from "react";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import type { StoryTranslation } from "@/lib/supabase";

type Props = {
  originalText: string;
  originalLang?: string;
  translations: Pick<StoryTranslation, "language_code" | "story_text">[];
};

export default function StoryTranslator({
  originalText,
  originalLang = "en",
  translations,
}: Props) {
  const { selectedLang } = useLanguage();

  // Initialise to the global language if a translation exists, else original.
  const [activeLang, setActiveLang] = useState<string>(() => {
    if (translations.some(t => t.language_code === selectedLang)) return selectedLang;
    return originalLang;
  });

  // When the global language toggle changes, switch to that language if available.
  useEffect(() => {
    if (translations.some(t => t.language_code === selectedLang)) {
      setActiveLang(selectedLang);
    }
  }, [selectedLang, translations]);

  const displayText =
    activeLang === originalLang
      ? originalText
      : (translations.find(t => t.language_code === activeLang)?.story_text ?? originalText);

  const originalLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === originalLang);

  // Build the tab list: original first, then all stored translations in order.
  const tabs = [
    { code: originalLang, label: originalLangInfo?.nativeName ?? originalLang.toUpperCase(), isOriginal: true },
    ...SUPPORTED_LANGUAGES.filter(l =>
      l.code !== originalLang && translations.some(t => t.language_code === l.code)
    ).map(l => ({ code: l.code, label: l.nativeName, isOriginal: false })),
  ];

  if (tabs.length <= 1) {
    // No translations stored yet — just render the text.
    return (
      <div
        className="prose prose-navy max-w-none text-navy/80 leading-[1.9] text-[1.0625rem]"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {originalText}
      </div>
    );
  }

  return (
    <div>
      {/* Language tab strip */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-navy/40 font-medium mr-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          Read in:
        </span>
        {tabs.map(tab => (
          <button
            key={tab.code}
            onClick={() => setActiveLang(tab.code)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
              activeLang === tab.code
                ? "bg-navy text-cream border-navy"
                : "bg-white text-navy/60 border-navy/20 hover:border-navy/40 hover:text-navy"
            }`}
          >
            {tab.label}
            {tab.isOriginal && (
              <span className="ml-1 opacity-60 font-normal">· original</span>
            )}
          </button>
        ))}
      </div>

      {/* Story text */}
      <div
        className="prose prose-navy max-w-none text-navy/80 leading-[1.9] text-[1.0625rem]"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {displayText}
      </div>
    </div>
  );
}
