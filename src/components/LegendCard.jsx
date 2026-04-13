import { RefreshCcw } from "lucide-react";

export default function LegendCard({ items, onRefresh }) {
  return (
    <div className="legend-card">
      <div className="legend-card__header">
        <div>
          <span className="eyebrow">Legend</span>
          <h3>Land Use Categories</h3>
        </div>

        <button type="button" className="icon-button icon-button--soft" onClick={onRefresh}>
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="legend-card__grid">
        {items.map((item) => (
          <div key={item.id} className="legend-card__item">
            <span className="legend-card__swatch" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="legend-card__footer">
        <button type="button" onClick={onRefresh}>
          Refresh
        </button>
        <span>Updated: 11 Apr, 2026</span>
      </div>
    </div>
  );
}
