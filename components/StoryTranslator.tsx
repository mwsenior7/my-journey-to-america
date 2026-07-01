"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import type { StoryTranslation } from "@/lib/supabase";

type Props = {
  originalText: string;
  originalLang?: string;
  translations: Pick<StoryTranslation, "language_code" | "story_text">[];
  showControls?: boolean;
};

export default function StoryTranslator({
  originalText,
  originalLang = "en",
  translations,
  showControls = false,
}: Props) {
  const { selectedLang } = useLanguage();
  const [activeLang, setActiveLang] = useState<string>(() => {
    if (translations.some((t) => t.language_code === selectedLang)) return selectedLang;
    return originalLang;
  });
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  useEffect(() => {
    if (translations.some((t) => t.language_code === selectedLang)) {
      setActiveLang(selectedLang);
    }
  }, [selectedLang, translations]);

  const storedTranslation = useMemo(
    () => translations.find((t) => t.language_code === activeLang)?.story_text ?? null,
    [activeLang, translations]
  );

  useEffect(() => {
    if (activeLang === originalLang) {
      setTranslationError(null);
      setTranslatedText(null);
      return;
    }

    if (storedTranslation) {
      setTranslationError(null);
      setTranslatedText(storedTranslation);
      return;
    }

    const controller = new AbortController();
    const fetchTranslation = async () => {
      setIsTranslating(true);
      setTranslationError(null);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: originalText, source: originalLang, target: activeLang }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok || !data.translated) {
          throw new Error(data.error ?? "Translation failed");
        }
        setTranslatedText(data.translated);
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        setTranslationError(err instanceof Error ? err.message : "Translation error");
      } finally {
        setIsTranslating(false);
      }
    };

    fetchTranslation();
    return () => controller.abort();
  }, [activeLang, originalText, originalLang, storedTranslation]);

  const displayText =
    activeLang === originalLang
      ? originalText
      : translatedText ?? storedTranslation ?? originalText;

  const originalLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === originalLang);

  const tabs = [
    { code: originalLang, label: originalLangInfo?.nativeName ?? originalLang.toUpperCase(), isOriginal: true },
    ...SUPPORTED_LANGUAGES.filter(
      (l) => l.code !== originalLang && translations.some((t) => t.language_code === l.code)
    ).map((l) => ({ code: l.code, label: l.nativeName, isOriginal: false })),
  ];

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
    } catch {
      setTranslationError("Unable to copy. Please try again.");
    }
  };

  // All languages available for on-demand translation, excluding the original
  const translationTargetOptions = SUPPORTED_LANGUAGES;

  return (
    <div>
      {showControls && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-navy/70">Translate story</label>
            <select
              value={activeLang}
              onChange={(e) => setActiveLang(e.target.value || originalLang)}
              className="rounded-lg border border-navy/20 bg-white px-4 py-2 text-sm text-navy shadow-sm focus:border-gold/50 focus:outline-none"
            >
              {translationTargetOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            {activeLang !== originalLang && (
              <button
                type="button"
                onClick={() => setActiveLang(originalLang)}
                className="rounded-lg border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy/40 transition-colors"
              >
                View Original
              </button>
            )}
            <button
              type="button"
              onClick={copyText}
              className="rounded-lg border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy/40 transition-colors"
            >
              Copy Text
            </button>
          </div>
          <p className="text-xs text-navy/50">
            Translate the story text into a common language.
          </p>
        </div>
      )}

      {tabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-navy/40 font-medium mr-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Read in:
          </span>
          {tabs.map((tab) => (
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
      )}

      {translationError && (
        <p className="text-sm text-red-500 mb-4">{translationError}</p>
      )}

      {isTranslating ? (
        <div className="rounded-2xl border border-navy/10 bg-navy/[0.04] p-6 text-sm text-navy/70">
          Translating story text…
        </div>
      ) : (
        <div
          className="prose prose-navy max-w-none text-navy/80 leading-[1.9] text-[1.0625rem]"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {displayText}
        </div>
      )}
    </div>
  );
}
