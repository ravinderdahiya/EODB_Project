import "./LayerPanel.css";
import { useState } from "react";
import { ChevronDown, RefreshCcw } from "lucide-react";
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

function LayerCollapsibleGroup({ title, description, expanded, onToggle, children }) {
  return (
    <div className={`layer-panel__group${expanded ? " layer-panel__group--open" : ""}`}>
      <button
        type="button"
        className="toggle-row toggle-row--group"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="toggle-row__copy">
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
        <ChevronDown size={16} className="toggle-row__chevron" aria-hidden="true" />
      </button>
      <div className="layer-panel__group-body">{children}</div>
    </div>
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
  const [murabbaLayersExpanded, setMurabbaLayersExpanded] = useState(false);
  const [boundariesExpanded, setBoundariesExpanded] = useState(false);
  const [otherLayersExpanded, setOtherLayersExpanded] = useState(false);

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

      <div className="layer-panel__scroll">
      <div className="layer-panel__section">
        <LayerCollapsibleGroup
          title={t("layerPanel.murabbaLayersTitle")}
          description={t("layerPanel.murabbaLayersDesc")}
          expanded={murabbaLayersExpanded}
          onToggle={() => setMurabbaLayersExpanded((open) => !open)}
        >
          <LayerToggleRow
            title="Murraba Grid (Haryana)"
            description="Group + child layer (id 29 + 30)"
            checked={layerVisibility.murrabaGrid ?? false}
            onChange={() => onToggleLayer("murrabaGrid")}
          />

          <LayerToggleRow
            title={t("layerPanel.cadastralLayerTitle")}
            description={t("layerPanel.cadastralLayerDesc")}
            checked={layerVisibility.cadastral}
            onChange={() => onToggleLayer("cadastral")}
          />
        </LayerCollapsibleGroup>
      </div>

      <div className="layer-panel__section">
        <LayerCollapsibleGroup
          title={t("layerPanel.boundariesLayerTitle")}
          description={t("layerPanel.boundariesLayerDesc")}
          expanded={boundariesExpanded}
          onToggle={() => setBoundariesExpanded((open) => !open)}
        >
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
        </LayerCollapsibleGroup>
      </div>

      {/* <div className="layer-panel__section">
       
        <LayerToggleRow
          title="Nearby Places (POI)"
          description="Group + child layer (id 23 + 24)"
          checked={layerVisibility.nearbyPlaces ?? false}
          onChange={() => onToggleLayer("nearbyPlaces")}
        />
      </div> */}

      <div className="layer-panel__section">
        <LayerCollapsibleGroup
          title={t("layerPanel.otherLayersTitle")}
          description={t("layerPanel.otherLayersDesc")}
          expanded={otherLayersExpanded}
          onToggle={() => setOtherLayersExpanded((open) => !open)}
        >
          {arcgisPortalConfig.operationalLayers.map((layer) => (
            <LayerToggleRow
              key={layer.key}
              title={layer.title}
              description={layer.description}
              checked={layerVisibility[layer.key] ?? false}
              onChange={() => onToggleLayer(layer.key)}
            />
          ))}
        </LayerCollapsibleGroup>
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
      </div>
    </aside>
  );
}
