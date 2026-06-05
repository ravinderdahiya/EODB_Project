import LoginForm from "./LoginForm";
import "./LoginCard.css";

export default function LoginCard({ t, showAdminPanel, ...formProps }) {
  return (
    <aside className="lp-card">
      <div className="lp-card-main">
        <div className="lp-logo-flip lp-lock-circle" aria-hidden="true">
          <img src={import.meta.env.BASE_URL + "branding/Emblem_of_Haryana.svg"} alt="Haryana Logo" />
          <img src={import.meta.env.BASE_URL + "branding/harsac.png"}   alt="HARSAC Logo" />
        </div>

        <h2 className="lp-card-title">{t("login.cardTitle")}</h2>
        <p className="lp-subtext">{t("login.cardSubtitle")}</p>

        {/* Public login marker (admin login moved to header) */}
        <div id="lp-login-card-mode" className="lp-tabs lp-tabs--single" role="tablist">
          <button type="button" role="tab" aria-selected={true} className="lp-tab lp-tab--active">
            {showAdminPanel ? t("login.tabAdmin") : t("login.tabOtp")}
          </button>
        </div>

        <LoginForm t={t} showAdminPanel={showAdminPanel} {...formProps} />
      </div>

      <p className="lp-terms">
        {t("login.termsText")}{" "}
        <span role="button" tabIndex={0}>{t("login.termsTos")}</span>{" "}
        {t("login.termsAnd")}{" "}
        <span role="button" tabIndex={0}>{t("login.termsPrivacy")}</span>.
      </p>
    </aside>
  );
}
