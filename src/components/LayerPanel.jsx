import { RefreshCcw } from "lucide-react";
import { arcgisPortalConfig } from "@/config/arcgis";

function HealthDot({ status }) {
  return (
    <span
      className={`health-dot health-dot--${status}`}
      aria-label={`Service status ${status}`}
    />
  );
}

export default function LayerPanel({
  isOpen,
  layerVisibility,
  onToggleLayer,
  onRefresh,
  serviceHealth,
}) {
  return (
    <aside className={`layer-panel ${isOpen ? "layer-panel--open" : ""}`}>
      <div className="layer-panel__header">
        <div>
          <span className="eyebrow">Operational layers</span>
          <h3>Map Layers</h3>
        </div>

        <button type="button" className="icon-button icon-button--soft" onClick={onRefresh}>
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="layer-panel__section">
        <label className="toggle-row">
          <span className="toggle-row__copy">
            <strong>Cadastral parcels</strong>
            <small>Focused parcel highlight on top of the ESRI basemap</small>
          </span>
          <input
            type="checkbox"
            checked={layerVisibility.cadastral}
            onChange={() => onToggleLayer("cadastral")}
          />
        </label>

        {arcgisPortalConfig.boundarySublayers.map((layer) => (
          <label key={layer.key} className="toggle-row">
            <span className="toggle-row__copy">
              <strong>{layer.title}</strong>
              <small>Highlighted Haryana boundary context in the map view</small>
            </span>
            <input
              type="checkbox"
              checked={layerVisibility[layer.key]}
              onChange={() => onToggleLayer(layer.key)}
            />
          </label>
        ))}

        <label className="toggle-row">
          <span className="toggle-row__copy">
            <strong>Government assets</strong>
            <small>Disabled in ESRI-only map mode</small>
          </span>
          <input
            type="checkbox"
            checked={layerVisibility.assets}
            onChange={() => onToggleLayer("assets")}
          />
        </label>
      </div>

      <div className="layer-panel__footer">
        <div className="layer-panel__health">
          <span>
            <HealthDot status={serviceHealth.cadastral} /> Cadastral
          </span>
          <span>
            <HealthDot status={serviceHealth.boundaries} /> Boundaries
          </span>
          <span>
            <HealthDot status={serviceHealth.assets} /> Assets
          </span>
        </div>
      </div>
    </aside>
  );
}