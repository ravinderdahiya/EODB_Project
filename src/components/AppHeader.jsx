import "./AppHeader.css";
import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  Menu,
  MoonStar,
  Search,
  SunMedium,
} from "lucide-react";
import { MEDIA_MOBILE, MEDIA_TABLET } from "@/constants/layoutBreakpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import LanguageToggle from "./LanguageToggle";

export default function AppHeader({
  searchPlaceholder,
  theme,
  onSidebarToggle,
  onToggleTheme,
  onLogout,
  searchValue = "",
  onSearchValueChange = () => {},
  onSearchSubmit = () => {},
  searchSuggestions = [],
  forceSearchSuggestionsOpen = false,
  onSuggestionSelect = () => {},
  searchInputId = "portal-search",
  isAdmin = false,
  showSearch = true,
}) {
  const { t, lang } = useLanguage();
  const headerRef = useRef(null);
  const searchBlurTimerRef = useRef(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isTablet = useMediaQuery(MEDIA_TABLET);
  const isMobile = useMediaQuery(MEDIA_MOBILE);

  const title    = t("header.title");
  const subtitle = isAdmin ? t("header.adminSubtitle") : t("header.subtitle");

  /* Publish --header-height for sidebar/overlay; never use it as header min-height (avoids stretch loop). */
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;

    let frameId = 0;
    let settleTimer = 0;

    const syncHeaderHeight = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty("--header-height", `${height}px`);
      }
    };

    const scheduleSync = () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (settleTimer) window.clearTimeout(settleTimer);

      // Drop stale inline height so CSS grid can reflow before re-measure.
      document.documentElement.style.removeProperty("--header-height");

      frameId = requestAnimationFrame(() => {
        requestAnimationFrame(syncHeaderHeight);
      });

      settleTimer = window.setTimeout(syncHeaderHeight, 320);
    };

    scheduleSync();

    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(node);

    const tabletMq = window.matchMedia(MEDIA_TABLET);
    const mobileMq = window.matchMedia(MEDIA_MOBILE);
    const onBreakpointChange = () => scheduleSync();

    tabletMq.addEventListener("change", onBreakpointChange);
    mobileMq.addEventListener("change", onBreakpointChange);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (settleTimer) window.clearTimeout(settleTimer);
      if (searchBlurTimerRef.current) window.clearTimeout(searchBlurTimerRef.current);
      observer.disconnect();
      tabletMq.removeEventListener("change", onBreakpointChange);
      mobileMq.removeEventListener("change", onBreakpointChange);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
    };
  }, [showSearch, isAdmin, lang, title, subtitle, isTablet, isMobile]);

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

  const searchSuggestionHint = t("header.searchSuggestionsHint");

  return (
    <header
      ref={headerRef}
      className={`app-header ${showSearch ? "" : "app-header--no-search"} ${
        isTablet ? "app-header--layout-tablet" : "app-header--layout-desktop"
      }`}
    >
      <div className="app-header__brand-cluster">
        <button
          type="button"
          className="icon-button icon-button--ghost app-header__menu-button"
          onClick={onSidebarToggle}
          aria-label={t("header.toggleNav")}
        >
          <Menu size={20} />
        </button>

        <div className="app-header__brand">
          <div className="lp-logo-flip" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
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
            onFocus={() => {
              if (searchBlurTimerRef.current) {
                window.clearTimeout(searchBlurTimerRef.current);
                searchBlurTimerRef.current = 0;
              }
              setIsSearchFocused(true);
            }}
            onBlur={() => {
              searchBlurTimerRef.current = window.setTimeout(() => {
                setIsSearchFocused(false);
                searchBlurTimerRef.current = 0;
              }, 150);
            }}
            placeholder={searchPlaceholder}
          />
          <button type="submit" className="search-shell__submit">
            {t("header.searchSubmit")}
          </button>

          {(isSearchFocused || forceSearchSuggestionsOpen) && searchSuggestions.length > 0 ? (
            <div className="search-shell__suggestions" role="listbox">
              <p className="search-shell__suggestions-hint">{searchSuggestionHint}</p>
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
          title={theme === "dark" ? t("header.switchToLight") : t("header.switchToDark")}
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
