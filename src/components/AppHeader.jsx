import "./AppHeader.css";
import {
  LogOut,
  Menu,
  MoonStar,
  Search,
  SunMedium,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "./LanguageToggle";

export default function AppHeader({
  searchPlaceholder,
  sidebarOpen,
  theme,
  onSidebarToggle,
  onToggleTheme,
  onLogout,
  searchValue = "",
  onSearchValueChange = () => {},
  onSearchSubmit = () => {},
  searchSuggestions = [],
  onSuggestionSelect = () => {},
  searchInputId = "portal-search",
  isAdmin = false,
  showSearch = true,
}) {
  const { t } = useLanguage();

  const title    = t("header.title");
  const subtitle = isAdmin ? t("header.adminSubtitle") : t("header.subtitle");

  const getSuggestionTitle = (suggestion) => {
    if (suggestion?.title) return suggestion.title;
    if (suggestion?.khasraNo) return `Khasra ${suggestion.khasraNo}`;
    return suggestion?.id ? `Record ${suggestion.id}` : "Suggestion";
  };

  const getSuggestionCopy = (suggestion) => {
    if (suggestion?.description) return suggestion.description;
    const location = [suggestion?.village, suggestion?.tehsil].filter(Boolean).join(", ");
    const fallbackParts = [suggestion?.ownerName, location].filter(Boolean);
    return fallbackParts.join(" • ");
  };

  return (
    <header className={`app-header ${showSearch ? "" : "app-header--no-search"}`}>
      <div className="app-header__brand-cluster">
        <button
          type="button"
          className={`icon-button icon-button--ghost app-header__menu-button ${
            sidebarOpen ? "app-header__menu-button--active" : ""
          }`}
          onClick={onSidebarToggle}
          aria-label={t("header.toggleNav")}
        >
          <Menu size={20} />
        </button>

        <div className="app-header__brand">
          <div className="lp-logo-flip" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/logo-hry.png"} alt="Haryana Logo" />
            <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
          </div>

          <div className="app-header__titles">
            <h1>{title}</h1>
            <p className="app-header__subtitle">{subtitle}</p>
          </div>
        </div>
      </div>

      {showSearch ? (
        <form className="search-shell" onSubmit={onSearchSubmit}>
          <label className="sr-only" htmlFor={searchInputId}>
            {t("header.searchLabel")}
          </label>
          <Search className="search-shell__icon" size={20} />
          <input
            id={searchInputId}
            type="search"
            autoComplete="off"
            className="search-shell__input"
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <button type="submit" className="search-shell__submit">
            {t("header.searchSubmit")}
          </button>

          {searchSuggestions.length > 0 ? (
            <div className="search-shell__suggestions" role="listbox">
              {searchSuggestions.map((suggestion, index) => {
                const suggestionTitle = getSuggestionTitle(suggestion);
                const suggestionCopy  = getSuggestionCopy(suggestion);

                return (
                  <button
                    type="button"
                    key={suggestion.id ?? `${suggestionTitle}-${index}`}
                    className="search-shell__suggestion"
                    onMouseDown={() => onSuggestionSelect(suggestion)}
                  >
                    <span className="search-shell__suggestion-title">{suggestionTitle}</span>
                    {suggestionCopy ? (
                      <span className="search-shell__suggestion-copy">{suggestionCopy}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="app-header__actions">
        <button
          type="button"
          className="header-action-button header-action-button--theme"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? t("header.switchToLight") : t("header.switchToDark")}
        >
          {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
        </button>

        <LanguageToggle label={t("header.selectLanguage")} />

        <button
          type="button"
          className="header-action-button header-action-button--logout"
          onClick={onLogout}
          aria-label={t("header.logout")}
        >
          <LogOut size={16} />
          <span>{t("header.logout")}</span>
        </button>
      </div>
    </header>
  );
}
