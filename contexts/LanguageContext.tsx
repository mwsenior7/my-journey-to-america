"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

// Must stay in sync with TARGET_LANGUAGES in /api/translate-story/route.ts.
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English",    nativeName: "English"    },
  { code: "es", name: "Spanish",    nativeName: "Español"    },
  { code: "fr", name: "French",     nativeName: "Français"   },
  { code: "pt", name: "Portuguese", nativeName: "Português"  },
  { code: "de", name: "German",     nativeName: "Deutsch"    },
  { code: "it", name: "Italian",    nativeName: "Italiano"   },
  { code: "zh", name: "Chinese",    nativeName: "中文"        },
  { code: "ja", name: "Japanese",   nativeName: "日本語"      },
  { code: "ko", name: "Korean",     nativeName: "한국어"      },
  { code: "ar", name: "Arabic",     nativeName: "العربية"    },
  { code: "hi", name: "Hindi",      nativeName: "हिन्दी"      },
  { code: "ru", name: "Russian",    nativeName: "Русский"    },
  { code: "uk", name: "Ukrainian",  nativeName: "Українська" },
  { code: "el", name: "Greek",      nativeName: "Ελληνικά"   },
];

type LanguageContextType = {
  selectedLang: string;
  setSelectedLang: (lang: string) => void;
  translate: (text: string, sourceLang?: string) => Promise<string>;
};

const LanguageContext = createContext<LanguageContextType>({
  selectedLang: "en",
  setSelectedLang: () => {},
  translate: async (text) => text,
});

const translationCache = new Map<string, string>();

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [selectedLang, setSelectedLangState] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem("mjta_lang");
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
      setSelectedLangState(stored);
    } else {
      const browserLang = navigator.language.split("-")[0];
      const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
      if (supported && supported.code !== "en") {
        setSelectedLangState(supported.code);
      }
    }
  }, []);

  const setSelectedLang = useCallback((lang: string) => {
    setSelectedLangState(lang);
    localStorage.setItem("mjta_lang", lang);
  }, []);

  const translate = useCallback(async (text: string, sourceLang = "en"): Promise<string> => {
    if (selectedLang === sourceLang || selectedLang === "en") return text;

    const key = `${sourceLang}:${selectedLang}:${text}`;
    if (translationCache.has(key)) return translationCache.get(key)!;

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: sourceLang, target: selectedLang }),
      });
      if (!res.ok) return text;
      const { translatedText } = await res.json();
      translationCache.set(key, translatedText);
      return translatedText;
    } catch {
      return text;
    }
  }, [selectedLang]);

  return (
    <LanguageContext.Provider value={{ selectedLang, setSelectedLang, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
