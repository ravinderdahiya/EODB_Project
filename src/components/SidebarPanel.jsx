import { Database, Network, Server, X } from 'lucide-react'

function SidebarPanel({ counts, error, isOpen, onClose, selectedFeature }) {
  return (
    <aside className={`sidebar-panel panel-card ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-header">
        <div>
          <p className="panel-title">GIS Workspace</p>
          <p className="panel-subtitle">Prepared for GeoServer, ArcGIS, and PostGIS integration</p>
        </div>
        <button onClick={onClose} type="button">
          <X size={16} />
        </button>
      </div>

      <div className="sidebar-section">
        <h3>Layer Summary</h3>
        <div className="sidebar-grid">
          <article>
            <span>{counts.state}</span>
            <small>State</small>
          </article>
          <article>
            <span>{counts.districts}</span>
            <small>Districts</small>
          </article>
          <article>
            <span>{counts.tehsils}</span>
            <small>Tehsils</small>
          </article>
          <article>
            <span>{counts.villages}</span>
            <small>Villages</small>
          </article>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Service Connectors</h3>
        <ul className="service-list">
          <li>
            <Server size={16} />
            <span>WMS / WMTS / GeoServer-ready layer config model</span>
          </li>
          <li>
            <Database size={16} />
            <span>Static GeoJSON can be swapped with PostGIS-backed APIs</span>
          </li>
          <li>
            <Network size={16} />
            <span>ArcGIS REST and enterprise metadata panel prepared</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <h3>Selection Details</h3>
        {selectedFeature ? (
          <dl className="feature-details">
            {Object.entries(selectedFeature).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="empty-state">Click any map feature to inspect its metadata here.</p>
        )}
      </div>

      {error ? <p className="sidebar-error">{error}</p> : null}
    </aside>
  )
}

export default SidebarPanel
