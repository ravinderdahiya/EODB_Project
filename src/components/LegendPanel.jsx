function LegendPanel({ isOpen }) {
  if (!isOpen) {
    return null
  }

  const items = [
    ['#d8ec83', 'Haryana state extent'],
    ['#7cc9f8', 'District limits'],
    ['#f5c96d', 'Tehsil demo overlay'],
    ['#ff9971', 'Village demo overlay'],
  ]

  return (
    <section className="legend-panel panel-card">
      <p className="panel-title">Legend</p>
      <div className="legend-list">
        {items.map(([color, label]) => (
          <div key={label} className="legend-row">
            <span style={{ background: color }} />
            <small>{label}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

export default LegendPanel
