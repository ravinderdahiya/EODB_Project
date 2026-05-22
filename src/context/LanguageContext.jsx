import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "@/i18n/en";
import hi from "@/i18n/hi";

const STORAGE_KEY = "eodb-lang";
const DICTS = { en, hi };
const SUPPORTED_LANGS = new Set(["en", "hi"]);

function getStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGS.has(stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return null;
}

function getInitialLanguageState() {
  const storedLang = getStoredLang();
  return {
    lang: storedLang ?? "en",
    hasPersistedLanguage: Boolean(storedLang),
  };
}

const LanguageContext = createContext(null);

export function createTranslator(lang) {
  const dict = DICTS[lang] ?? DICTS.en;
  return (key, params = {}) => {
    const val = key.split(".").reduce((obj, k) => obj?.[k], dict);
    if (Array.isArray(val)) return val;
    if (typeof val !== "string") return key;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replaceAll(`{${k}}`, v),
      val,
    );
  };
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => getInitialLanguageState().lang);
  const [hasPersistedLanguage, setHasPersistedLanguage] = useState(
    () => getInitialLanguageState().hasPersistedLanguage,
  );

  const persistLang = useCallback((next) => {
    setHasPersistedLanguage(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setLang = useCallback((next, options = {}) => {
    if (!SUPPORTED_LANGS.has(next)) return;
    const { persist = true } = options;
    setLangState((prev) => (prev === next ? prev : next));
    if (persist) persistLang(next);
  }, [persistLang]);

  const setPreviewLang = useCallback((next) => {
    setLang(next, { persist: false });
  }, [setLang]);

  /** Login page mount / refresh — restart auto hi/en preview. */
  const resetLoginPreview = useCallback(() => {
    setHasPersistedLanguage(false);
    setLangState("en");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  /** User picked ENG/हिन्दी on login — stop preview until page refresh. */
  const lockLoginLanguage = useCallback((next) => {
    if (!SUPPORTED_LANGS.has(next)) return;
    setLangState(next);
    setHasPersistedLanguage(true);
  }, []);

  /** After successful login — keep current language for the app session. */
  const commitLanguage = useCallback(() => {
    setLangState((current) => {
      persistLang(current);
      return current;
    });
  }, [persistLang]);

  const ensureLanguage = useCallback((fallback = "en") => {
    const next = SUPPORTED_LANGS.has(fallback) ? fallback : "en";
    if (hasPersistedLanguage) return;
    setLangState((prev) => (prev === next ? prev : next));
    persistLang(next);
  }, [hasPersistedLanguage, persistLang]);

  // Apply data-lang attribute for CSS font targeting and no-flicker on hydration
  useEffect(() => {
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang]);

  const t = useCallback((key, params = {}) => createTranslator(lang)(key, params), [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        setPreviewLang,
        resetLoginPreview,
        lockLoginLanguage,
        commitLanguage,
        hasPersistedLanguage,
        ensureLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
