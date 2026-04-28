export default function AdminCategoryChart({ categories }) {
  const highestValue = Math.max(...categories.map((category) => category.events), 1);

  return (
    <article className="admin-card admin-chart-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">Distribution</span>
          <h3>Events By Category</h3>
        </div>
      </header>

      <ul className="admin-category-chart" aria-label="Events by category">
        {categories.map((category) => {
          const percentage = (category.events / highestValue) * 100;

          return (
            <li key={category.id} className="admin-category-chart__item">
              <div className="admin-category-chart__meta">
                <strong>{category.label}</strong>
                <span>{category.events} events</span>
              </div>

              <div className="admin-category-chart__track" aria-hidden="true">
                <span
                  className="admin-category-chart__fill"
                  style={{
                    width: `${Math.max(percentage, 8)}%`,
                    background: category.fill,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
