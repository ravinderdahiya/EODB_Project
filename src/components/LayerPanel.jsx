import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { LAYER_CONFIG } from '../config/layers'

function LayerPanel({ counts, isOpen, layerVisibility, mapZoom, onHeaderToggle, onToggle }) {
  return (
    <section className="layer-panel panel-card">
      <button className="panel-toggle" onClick={onHeaderToggle} type="button">
        <div>
          <p className="panel-title">Operational Layers</p>
          <p className="panel-subtitle">Toggle visibility and monitor zoom thresholds</p>
        </div>
        {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>

      {isOpen ? (
        <div className="layer-list">
          {LAYER_CONFIG.map((layer) => {
            const zoomLocked = mapZoom < layer.minZoom

            return (
              <button
                key={layer.id}
                className={`layer-row ${zoomLocked ? 'is-locked' : ''}`}
                onClick={() => onToggle(layer.id)}
                type="button"
              >
                <span className="layer-swatch" style={{ background: layer.style.color }} />
                <span className="layer-copy">
                  <strong>{layer.shortLabel}</strong>
                  <small>
                    {counts[layer.id]} features
                    {layer.demo ? ' • demo data' : ' • live-ready'}
                  </small>
                </span>
                <span className="layer-meta">
                  <small>{zoomLocked ? `Visible from z${layer.minZoom}` : `z${layer.minZoom}+`}</small>
                  {layerVisibility[layer.id] ? <Eye size={16} /> : <EyeOff size={16} />}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

export default LayerPanel
