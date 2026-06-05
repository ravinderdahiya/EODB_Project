import LanguageToggle from "@/components/LanguageToggle";
import "./LoginHeader.css";

export default function LoginHeader({ t, showAdminPanel, onAdminClick }) {
  return (
    <header className="lp-navbar">
      <div className="lp-nav-left">
        <div className="lp-logo-flip" aria-hidden="true">
          <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
          <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
        </div>
        <div className="lp-logo-text-group">
          <div className="lp-main-title">44212-GeoStack EODB</div>
          <div className="lp-tagline">Ease of Doing Business</div>
          <div className="lp-sub-title">Haryana</div>
        </div>
      </div>

      <div className="lp-nav-right">
        {/* Language toggle buttons */}
        <LanguageToggle
          wrapperClass="lp-lang-toggle"
          btnClass="lp-lang-btn"
          activeClass="lp-lang-btn--active"
          persistSelection={false}
          compact={false}
        />
        <button
          type="button"
          className="lp-chat-btn"
          onClick={onAdminClick}
          aria-expanded={showAdminPanel}
          aria-controls="lp-login-card-mode"
        >
          {t("login.tabAdmin")}
        </button>
      </div>
    </header>
  );
}
