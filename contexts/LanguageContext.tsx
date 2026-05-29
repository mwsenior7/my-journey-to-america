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
};

const LanguageContext = createContext<LanguageContextType>({
  selectedLang: "en",
  setSelectedLang: () => {},
});

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

  return (
    <LanguageContext.Provider value={{ selectedLang, setSelectedLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
