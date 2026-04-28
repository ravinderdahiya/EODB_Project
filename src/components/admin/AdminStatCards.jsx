export default function AdminStatCards({ cards }) {
  return (
    <section className="admin-stats-grid" aria-label="Top statistics">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article key={card.id} className="admin-card admin-stat-card">
            <div className="admin-stat-card__top">
              <span className="admin-stat-card__label">{card.label}</span>
              <span className={`admin-stat-card__icon admin-stat-card__icon--${card.tone || "green"}`}>
                <Icon size={18} />
              </span>
            </div>

            <strong className="admin-stat-card__value">{card.value}</strong>

            <div className="admin-stat-card__meta">
              <span className={`admin-stat-card__delta admin-stat-card__delta--${card.trend || "neutral"}`}>
                {card.delta}
              </span>
              <small>{card.detail}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}
