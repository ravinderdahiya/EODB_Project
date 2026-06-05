import "./LoginHero.css";

export default function LoginHero({ t }) {
  return (
    <section className="lp-left">
      <div className="lp-badge">{t("login.badge")}</div>

      <h1 className="lp-headline">
        <span className="lp-green">{t("login.headline1")}</span><br />
        {t("login.headline2")}<br />
        {t("login.headline3")}
      </h1>

      <p className="lp-desc">{t("login.desc")}</p>

      <div className="lp-stats">
        <div className="lp-stat-card"><h3>23</h3><p>{t("login.statsDistricts")}</p></div>
        <div className="lp-stat-card"><h3>143</h3><p>{t("login.statsTehsils")}</p></div>
        <div className="lp-stat-card"><h3>7,103</h3><p>{t("login.statsVillages")}</p></div>
        <div className="lp-stat-card"><h3>1.7Cr+</h3><p>{t("login.statsParcels")}</p></div>
      </div>
    </section>
  );
}
