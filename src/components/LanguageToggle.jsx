import { useLanguage } from "@/context/LanguageContext";

/**
 * Segmented ENG / हि language toggle button pair.
 * Reads and writes lang via LanguageContext — no props needed for state.
 *
 * @param {string} [wrapperClass]  CSS class for the container div   (default: "lang-toggle")
 * @param {string} [btnClass]      CSS class for each button         (default: "lang-toggle__btn")
 * @param {string} [activeClass]   CSS class added to the active btn (default: "lang-toggle__btn--active")
 * @param {string} [label]         aria-label for the wrapper div
 * @param {boolean} [persistSelection]  Save to localStorage on click (default true)
 */
export default function LanguageToggle({
  wrapperClass = "lang-toggle",
  btnClass     = "lang-toggle__btn",
  activeClass  = "lang-toggle__btn--active",
  label        = "Select language",
  persistSelection = true,
}) {
  const { lang, setLang, lockLoginLanguage } = useLanguage();

  const selectLang = (next) => {
    if (persistSelection) setLang(next);
    else lockLoginLanguage(next);
  };

  return (
    <div className={wrapperClass} aria-label={label} data-active-lang={lang}>
      <button
        type="button"
        className={`${btnClass}${lang === "en" ? ` ${activeClass}` : ""}`}
        onClick={() => selectLang("en")}
        aria-pressed={lang === "en"}
        title="English"
      >
        ENG
      </button>
      <button
        type="button"
        className={`${btnClass}${lang === "hi" ? ` ${activeClass}` : ""}`}
        onClick={() => selectLang("hi")}
        aria-pressed={lang === "hi"}
        title="हिंदी"
      >
        हिन्दी
      </button>
    </div>
  );
}
