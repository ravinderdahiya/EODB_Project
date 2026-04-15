import {
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  MoonStar,
  Search,
  Sparkles,
  SunMedium,
} from "lucide-react";

export default function AppHeader({
  glassMode,
  language,
  languages,
  searchPlaceholder,
  sidebarOpen,
  theme,
  onToggleGlass,
  onLanguageChange,
  onSidebarToggle,
  onToggleTheme,
  onLogout,
  searchValue,
  onSearchValueChange,
  onSearchSubmit,
  searchSuggestions,
  onSuggestionSelect,
}) {
  return (
    <header className="app-header">
      <div className="app-header__brand-cluster">
        <button
          type="button"
          className={`icon-button icon-button--ghost app-header__menu-button ${
            sidebarOpen ? "app-header__menu-button--active" : ""
          }`}
          onClick={onSidebarToggle}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="app-header__brand">
          <div className="app-header__logos" aria-hidden="true">
            <img
              src="/branding/logo-hry.png"
              alt="Government of Haryana"
              className="app-header__logo app-header__logo--state"
            />
            <img
              src="/branding/harsac.png"
              alt="HARSAC"
              className="app-header__logo app-header__logo--harsac"
            />
          </div>

          <div className="app-header__titles">
            <h1>Digital Land Record, Haryana</h1>
            <p className="app-header__subtitle">
              Ease of Doing Business, Haryana
            </p>
          </div>
        </div>
      </div>

      <form className="search-shell" onSubmit={onSearchSubmit}>
        <label className="sr-only" htmlFor="portal-search">
          Search land records or places
        </label>
        <Search className="search-shell__icon" size={20} />
        <input
          id="portal-search"
          type="search"
          autoComplete="off"
          className="search-shell__input"
          value={searchValue}
          onChange={(event) => onSearchValueChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <button type="submit" className="search-shell__submit">
          Search
        </button>

        {searchSuggestions.length > 0 ? (
          <div className="search-shell__suggestions" role="listbox">
            {searchSuggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.id}
                className="search-shell__suggestion"
                onMouseDown={() => onSuggestionSelect(suggestion)}
              >
                <span className="search-shell__suggestion-title">
                  Khasra {suggestion.khasraNo}
                </span>
                <span className="search-shell__suggestion-copy">
                  {suggestion.ownerName} • {suggestion.village}, {suggestion.tehsil}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </form>

      <div className="app-header__actions">
        <button
          type="button"
          className={`header-action-button header-action-button--glass ${
            glassMode ? "header-action-button--active" : ""
          }`}
          onClick={onToggleGlass}
          aria-label={`${glassMode ? "Disable" : "Enable"} glass mode`}
        >
          <Sparkles size={16} />
        </button>

        <button
          type="button"
          className="header-action-button header-action-button--theme"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
        </button>

        <div className="select-shell">
          <Globe size={16} />
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            aria-label="Select language"
          >
            {languages.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>

        <button
          type="button"
          className="header-action-button header-action-button--logout"
          onClick={onLogout}
          aria-label="Logout"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
