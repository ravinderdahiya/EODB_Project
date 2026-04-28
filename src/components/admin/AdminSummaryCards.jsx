export default function AdminSummaryCards({ cards }) {
  return (
    <section className="admin-summary-grid" aria-label="Summary metrics">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article key={card.id} className="admin-card admin-summary-card">
            <span className={`admin-summary-card__icon admin-summary-card__icon--${card.tone || "green"}`}>
              <Icon size={16} />
            </span>
            <div className="admin-summary-card__copy">
              <strong>{card.value}</strong>
              <small>{card.label}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}
