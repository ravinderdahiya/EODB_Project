export default function StatsStrip({ items }) {
  return (
    <div className="stats-strip">
      {items.map((item) => (
        <article
          key={item.id}
          className={`stats-card stats-card--${item.accent}`}
        >
          <div className="stats-card__value">{item.title}</div>
          <div className="stats-card__title">{item.value}</div>
          <p>{item.note}</p>
        </article>
      ))}
    </div>
  );
}
