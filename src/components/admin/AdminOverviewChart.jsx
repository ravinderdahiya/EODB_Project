import { useId, useMemo } from "react";

const VIEWBOX_WIDTH = 680;
const VIEWBOX_HEIGHT = 250;
const CHART_PADDING = 28;

function createLinePath(points) {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function createAreaPath(points, baseline) {
  if (!points.length) {
    return "";
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const middlePath = points.map((point) => `L ${point.x} ${point.y}`).join(" ");

  return `M ${firstPoint.x} ${baseline} ${middlePath} L ${lastPoint.x} ${baseline} Z`;
}

export default function AdminOverviewChart({ series }) {
  const gradientId = useId().replace(/:/g, "");

  const { points, gridLines, total } = useMemo(() => {
    const values = series.map((entry) => entry.value);
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);

    const xStep =
      series.length > 1
        ? (VIEWBOX_WIDTH - CHART_PADDING * 2) / (series.length - 1)
        : VIEWBOX_WIDTH - CHART_PADDING * 2;

    const nextPoints = series.map((entry, index) => {
      const x = CHART_PADDING + index * xStep;
      const y =
        CHART_PADDING +
        ((max - entry.value) / range) * (VIEWBOX_HEIGHT - CHART_PADDING * 2);

      return { ...entry, x, y };
    });

    const gridCount = 4;
    const lines = Array.from({ length: gridCount + 1 }, (_, index) => {
      const ratio = index / gridCount;
      const y = CHART_PADDING + ratio * (VIEWBOX_HEIGHT - CHART_PADDING * 2);
      const value = Math.round(max - ratio * (max - min));

      return { y, value };
    });

    return {
      points: nextPoints,
      gridLines: lines,
      total: totalValue,
    };
  }, [series]);

  const baseline = VIEWBOX_HEIGHT - CHART_PADDING;
  const linePath = createLinePath(points);
  const areaPath = createAreaPath(points, baseline);

  return (
    <article className="admin-card admin-chart-card">
      <header className="admin-card__header">
        <div>
          <span className="eyebrow">Overview</span>
          <h3>Monthly Bookings</h3>
        </div>
        <span className="admin-card__header-value">{total.toLocaleString("en-IN")}</span>
      </header>

      <div className="admin-overview-chart">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label="Monthly bookings trend line chart"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(47, 141, 93, 0.38)" />
              <stop offset="100%" stopColor="rgba(47, 141, 93, 0.03)" />
            </linearGradient>
          </defs>

          {gridLines.map((line) => (
            <g key={line.value}>
              <line
                x1={CHART_PADDING}
                y1={line.y}
                x2={VIEWBOX_WIDTH - CHART_PADDING}
                y2={line.y}
                className="admin-overview-chart__grid-line"
              />
              <text
                x={CHART_PADDING - 8}
                y={line.y}
                className="admin-overview-chart__grid-label"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {line.value}
              </text>
            </g>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} className="admin-overview-chart__line" />

          {points.map((point) => (
            <circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r="4.2"
              className="admin-overview-chart__point"
            />
          ))}
        </svg>

        <div className="admin-overview-chart__labels" aria-hidden="true">
          {series.map((entry) => (
            <span key={entry.label}>{entry.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
