import "./LayerPanel.css";
import { RefreshCcw } from "lucide-react";
import { arcgisPortalConfig } from "@/config/arcgis";
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();

  return (
    <aside className={`layer-panel ${isOpen ? "layer-panel--open" : ""}`}>
      <div className="layer-panel__header">
        <div>
          <span className="eyebrow">{t("layerPanel.eyebrow")}</span>
          <h3>{t("layerPanel.title")}</h3>
        </div>

        <button
          type="button"
          className="icon-button icon-button--soft"
          onClick={onRefresh}
          aria-label={t("layerPanel.eyebrow")}
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      {/* ── Cadastral ────────────────────────���────────────────────────────── */}
      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">{t("layerPanel.cadastral")}</span>

        <label className="toggle-row">
          <span className="toggle-row__copy">
            <strong>{t("layerPanel.cadastralLayerTitle")}</strong>
            <small>{t("layerPanel.cadastralLayerDesc")}</small>
          </span>
          <input
            type="checkbox"
            checked={layerVisibility.cadastral}
            onChange={() => onToggleLayer("cadastral")}
          />
        </label>
      </div>

      {/* ── Administrative Boundaries ─────────────────────────────────────── */}
      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">{t("layerPanel.boundaries")}</span>

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

      {/* ── Operational overlays ──────────────────────────────────────────── */}
      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">{t("layerPanel.overlays")}</span>

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
            <HealthDot status={serviceHealth.cadastral} /> {t("layerPanel.healthCadastral")}
          </span>
          <span>
            <HealthDot status={serviceHealth.boundaries} /> {t("layerPanel.healthBoundaries")}
          </span>
          <span>
            <HealthDot status={serviceHealth.assets} /> {t("layerPanel.healthAssets")}
          </span>
        </div>
      </div>
    </aside>
  );
}
