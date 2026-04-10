function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-card panel-card">
        <div className="loading-pulse" />
        <div>
          <p className="panel-title">Loading Haryana GIS layers</p>
          <p className="panel-subtitle">Preparing state, district, tehsil, and village boundaries</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
