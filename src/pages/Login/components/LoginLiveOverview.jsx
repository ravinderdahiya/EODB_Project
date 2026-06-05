import { TrendingUp } from "lucide-react";
import "./LoginLiveOverview.css";

export default function LoginLiveOverview({ t, insightsLoading, cards }) {
  return (
    <section
      className="lp-live-overview"
      aria-label={t("login.liveSystemOverview")}
      aria-busy={insightsLoading}
    >
      <header className="lp-live-overview__header">
        <TrendingUp size={14} strokeWidth={2.25} aria-hidden="true" />
        <h4>{t("login.liveSystemOverview")}</h4>
      </header>

      <div className="lp-live-overview__grid">
        {cards.map((card) => (
          <article className="lp-live-overview__card" key={card.id}>
            <div className="lp-live-overview__icon" aria-hidden="true">
              {card.icon}
            </div>
            <div className="lp-live-overview__meta">
              <h3>{insightsLoading ? "—" : card.value}</h3>
              <p>{card.label}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
