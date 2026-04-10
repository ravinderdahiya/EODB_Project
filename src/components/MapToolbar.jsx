import { Crosshair, Home, Layers3, Minus, Plus, ScrollText } from 'lucide-react'

function MapToolbar({ onAction, onToggleLayers, onToggleLegend }) {
  return (
    <div className="toolbar panel-card">
      <button onClick={() => onAction('zoomIn')} title="Zoom in" type="button">
        <Plus size={18} />
      </button>
      <button onClick={() => onAction('zoomOut')} title="Zoom out" type="button">
        <Minus size={18} />
      </button>
      <button onClick={() => onAction('home')} title="Fit Haryana extent" type="button">
        <Home size={18} />
      </button>
      <button onClick={onToggleLayers} title="Toggle layers panel" type="button">
        <Layers3 size={18} />
      </button>
      <button onClick={() => onAction('locate')} title="Locate my device" type="button">
        <Crosshair size={18} />
      </button>
      <button onClick={onToggleLegend} title="Toggle legend" type="button">
        <ScrollText size={18} />
      </button>
    </div>
  )
}

export default MapToolbar
