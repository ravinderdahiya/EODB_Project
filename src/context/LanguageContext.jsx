import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "@/i18n/en";
import hi from "@/i18n/hi";

const STORAGE_KEY = "eodb-lang";
const DICTS = { en, hi };

function getStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "hi") return stored;
  } catch {
    // localStorage unavailable
  }
  return "en";
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getStoredLang);

  const setLang = useCallback((next) => {
    if (next !== "en" && next !== "hi") return;
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  // Apply data-lang attribute for CSS font targeting and no-flicker on hydration
  useEffect(() => {
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang]);

  const t = useCallback(
    (key, params = {}) => {
      const dict = DICTS[lang] ?? DICTS.en;
      const val = key.split(".").reduce((obj, k) => obj?.[k], dict);
      // Return arrays as-is (used for table headers)
      if (Array.isArray(val)) return val;
      if (typeof val !== "string") return key;
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, v),
        val,
      );
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
