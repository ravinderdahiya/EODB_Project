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

function LayerToggleRow({ title, description, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
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

      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">Murraba Grid</span>
        <LayerToggleRow
          title="Murraba Grid (Haryana)"
          description="Group + child layer (id 29 + 30)"
          checked={layerVisibility.murrabaGrid ?? false}
          onChange={() => onToggleLayer("murrabaGrid")}
        />
      </div>

      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">{t("layerPanel.cadastral")}</span>

        <LayerToggleRow
          title={t("layerPanel.cadastralLayerTitle")}
          description={t("layerPanel.cadastralLayerDesc")}
          checked={layerVisibility.cadastral}
          onChange={() => onToggleLayer("cadastral")}
        />

      </div>

      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">{t("layerPanel.boundaries")}</span>

        <LayerToggleRow
          title="Haryana State Boundary"
          description="State boundary layer (id 31)"
          checked={layerVisibility.stateBoundary ?? false}
          onChange={() => onToggleLayer("stateBoundary")}
        />

        {arcgisPortalConfig.boundarySublayers.map((layer) => (
          <LayerToggleRow
            key={layer.key}
            title={layer.title}
            description={layer.description}
            checked={layerVisibility[layer.key]}
            onChange={() => onToggleLayer(layer.key)}
          />
        ))}
      </div>

      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">Nearby Places</span>
        <LayerToggleRow
          title="Nearby Places (POI)"
          description="Group + child layer (id 23 + 24)"
          checked={layerVisibility.nearbyPlaces ?? false}
          onChange={() => onToggleLayer("nearbyPlaces")}
        />
      </div>

      <div className="layer-panel__section">
        <span className="layer-panel__section-label eyebrow">{t("layerPanel.overlays")}</span>

        {arcgisPortalConfig.operationalLayers.map((layer) => (
          <LayerToggleRow
            key={layer.key}
            title={layer.title}
            description={layer.description}
            checked={layerVisibility[layer.key] ?? false}
            onChange={() => onToggleLayer(layer.key)}
          />
        ))}
      </div>

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
