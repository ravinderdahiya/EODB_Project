/**
 * LayerPanel.jsx
 *
 * Layer visibility control panel.
 *
 * Migration changes:
 *   • Boundary sub-layers now driven by arcgisPortalConfig.boundarySublayers
 *     (District / Tehsil / Village — from HSAC MapServer sublayers 26/27/28)
 *   • Operational layer section added:
 *       – Government Assets (hsacggm.in)   ← migrated from old `karnal` layer
 *       – HR Road Infra (hsacggm.in)        ← migrated from old `RoadInfra` layer
 *       – NHAI Upcoming (onemapggm.gmda.gov.in) ← migrated from old `NHAI` layer
 *   • Service health dots kept and extended
 */

import { RefreshCcw } from "lucide-react";
import { arcgisPortalConfig } from "@/config/arcgis";

function HealthDot({ status }) {
  return (
    <span
      className={`health-dot health-dot--${status}`}
      aria-label={`Service status: ${status}`}
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

      {/* ── Cadastral ─────────────────────────────────────────────────────── */}
      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">Cadastral</span>

        <label className="toggle-row">
          <span className="toggle-row__copy">
            <strong>Cadastral parcels</strong>
            <small>HSAC MapServer — district sublayers 1-22 with Khasra detail popup</small>
          </span>
          <input
            type="checkbox"
            checked={layerVisibility.cadastral}
            onChange={() => onToggleLayer("cadastral")}
          />
        </label>
      </div>

      {/* ── Administrative Boundaries (HSAC layers 26/27/28) ─────────────── */}
      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">Boundaries</span>

        {arcgisPortalConfig.boundarySublayers.map((layer) => (
          <label key={layer.key} className="toggle-row">
            <span className="toggle-row__copy">
              <strong>{layer.title}</strong>
              <small>HSAC MapServer — sublayer {layer.id}</small>
            </span>
            <input
              type="checkbox"
              checked={layerVisibility[layer.key]}
              onChange={() => onToggleLayer(layer.key)}
            />
          </label>
        ))}
      </div>

      {/* ── Operational overlays (Assets / Roads / NHAI) ──────────────────── */}
      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">Overlays</span>

        {arcgisPortalConfig.operationalLayers.map((layer) => (
          <label key={layer.key} className="toggle-row">
            <span className="toggle-row__copy">
              <strong>{layer.title}</strong>
              <small>{layer.description}</small>
            </span>
            <input
              type="checkbox"
              checked={layerVisibility[layer.key] ?? false}
              onChange={() => onToggleLayer(layer.key)}
            />
          </label>
        ))}
      </div>

      {/* ── Service health ────────────────────────────────────────────────── */}
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
