export default function AdminRecentActivity({ items }) {
  return (
    <aside className="admin-card admin-activity-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">Timeline</span>
          <h3>Recent Activity</h3>
        </div>
      </header>

      <ul className="admin-activity-list" aria-label="Recent admin activity">
        {items.map((item) => (
          <li key={item.id} className="admin-activity-item">
            <span className={`admin-activity-item__dot admin-activity-item__dot--${item.tone || "neutral"}`} />
            <div className="admin-activity-item__copy">
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
