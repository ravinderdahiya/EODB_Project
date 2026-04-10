function StatusBar({ coordinates, mapZoom, selectedFeature }) {
  return (
    <section className="status-bar panel-card">
      <div className="status-pill">
        <small>Cursor</small>
        <strong>
          {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
        </strong>
      </div>
      <div className="status-pill">
        <small>Zoom</small>
        <strong>{mapZoom}</strong>
      </div>
      <div className="status-pill">
        <small>Selection</small>
        <strong>{selectedFeature?.name ?? selectedFeature?.feature?.properties?.district ?? 'None'}</strong>
      </div>
      <div className="status-pill">
        <small>Profile</small>
        <strong>Haryana Land Records</strong>
      </div>
    </section>
  )
}

export default StatusBar
