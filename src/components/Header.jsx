import { Download, LogOut, Menu, Satellite, Map } from 'lucide-react'
import { BASEMAPS } from '../config/layers'

function Header({ activeBaseMap, onBaseMapChange, onMenuToggle }) {
  return (
    <header className="site-header panel-card">
      <div className="site-header-main">
        <div className="site-brand">
          <div className="brand-logos">
            <img alt="Haryana Government" src="/branding/logo-hry.png" />
            <img alt="HARSAC" src="/branding/harsac.png" />
          </div>
          <div className="brand-copy">
            <p className="brand-kicker">Haryana GIS</p>
            <h1>Digital Land Records Portal</h1>
            <p className="brand-meta">Map-first land records workspace for boundary, cadastral, and overlay review.</p>
          </div>
        </div>

        <div className="header-context">
          <span className="header-chip">State GIS Portal</span>
          <span className="header-chip header-chip-muted">Map Mode</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="basemap-switch">
          {Object.values(BASEMAPS).map((baseMap) => (
            <button
              key={baseMap.id}
              className={baseMap.id === activeBaseMap ? 'is-active' : ''}
              onClick={() => onBaseMapChange(baseMap.id)}
              type="button"
            >
              {baseMap.id === 'satellite' ? <Satellite size={14} /> : <Map size={14} />}
              <span>{baseMap.label}</span>
            </button>
          ))}
        </div>

        <a className="header-ghost-button" href="/data/manifest.json" download>
          <Download size={16} />
          <span>Downloads</span>
        </a>
        <button className="header-ghost-button" type="button">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
        <button className="header-solid-button" onClick={onMenuToggle} type="button">
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </div>
    </header>
  )
}

export default Header
