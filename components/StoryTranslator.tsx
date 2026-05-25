"use client";

import { useState, useEffect } from "react";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";

export default function StoryTranslator({
  text,
  sourceLang = "en",
}: {
  text: string;
  sourceLang?: string;
}) {
  const { selectedLang, translate } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [loading, setLoading] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);

  const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang);
  const needsTranslation = selectedLang !== "en" && selectedLang !== sourceLang;

  useEffect(() => {
    setTranslatedText(text);
    setIsTranslated(false);
  }, [text]);

  async function handleTranslate() {
    setLoading(true);
    const result = await translate(text, sourceLang);
    setTranslatedText(result);
    setIsTranslated(result !== text);
    setLoading(false);
  }

  function handleShowOriginal() {
    setTranslatedText(text);
    setIsTranslated(false);
  }

  return (
    <div>
      {needsTranslation && (
        <div className="flex items-center gap-3 mb-4">
          {!isTranslated ? (
            <button
              onClick={handleTranslate}
              disabled={loading}
              className="flex items-center gap-2 text-xs font-semibold text-navy/60 hover:text-navy border border-navy/20 hover:border-navy/40 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border border-navy/40 border-t-navy rounded-full animate-spin" />
                  Translating…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Translate to {targetLang?.nativeName}
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy/40">
                Translated to {targetLang?.nativeName}
              </span>
              <button
                onClick={handleShowOriginal}
                className="text-xs text-navy/50 hover:text-navy underline underline-offset-2 transition-colors"
              >
                Show original
              </button>
            </div>
          )}
        </div>
      )}
      <div
        className="prose prose-navy max-w-none text-navy/80 leading-[1.9] text-[1.0625rem]"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {translatedText}
      </div>
    </div>
  );
}
