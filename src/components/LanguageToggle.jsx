import { useLanguage } from "@/context/LanguageContext";

/**
 * Segmented EN / हि language toggle button pair.
 * Reads and writes lang via LanguageContext — no props needed for state.
 *
 * @param {string} [wrapperClass]  CSS class for the container div   (default: "lang-toggle")
 * @param {string} [btnClass]      CSS class for each button         (default: "lang-toggle__btn")
 * @param {string} [activeClass]   CSS class added to the active btn (default: "lang-toggle__btn--active")
 * @param {string} [label]         aria-label for the wrapper div
 */
export default function LanguageToggle({
  wrapperClass = "lang-toggle",
  btnClass     = "lang-toggle__btn",
  activeClass  = "lang-toggle__btn--active",
  label        = "Select language",
}) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={wrapperClass} aria-label={label}>
      <button
        type="button"
        className={`${btnClass}${lang === "en" ? ` ${activeClass}` : ""}`}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        title="English"
      >
        EN
      </button>
      <button
        type="button"
        className={`${btnClass}${lang === "hi" ? ` ${activeClass}` : ""}`}
        onClick={() => setLang("hi")}
        aria-pressed={lang === "hi"}
        title="हिंदी"
      >
        हि
      </button>
    </div>
  );
}
