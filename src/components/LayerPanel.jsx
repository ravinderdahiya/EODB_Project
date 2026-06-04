import "./LayerPanel.css";
import { useState } from "react";
import { ChevronDown, RefreshCcw } from "lucide-react";
import { arcgisPortalConfig } from "@/config/arcgis";
import { getLayerPanelSymbol } from "@/config/layerPanelSymbology";
import { useLanguage } from "@/context/LanguageContext";

function HealthDot({ status }) {
  return (
    <span
      className={`health-dot health-dot--${status}`}
      aria-label={`Service status: ${status}`}
    />
  );
}

function LayerSymbolSwatch({ symbolKey }) {
  const symbol = getLayerPanelSymbol(symbolKey);
  if (!symbol) return null;

  const style = {
    "--layer-symbol-fill": symbol.fill ?? "transparent",
    "--layer-symbol-stroke": symbol.stroke ?? "currentColor",
    "--layer-symbol-stroke-width": `${symbol.strokeWidth ?? 2}px`,
    ...(symbol.dash ? { "--layer-symbol-dash": symbol.dash } : {}),
  };

  return (
    <span
      className={`layer-symbol layer-symbol--${symbol.type}${symbol.dash ? " layer-symbol--dashed" : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}

function LayerToggleRow({ title, description, checked, onChange, symbolKey }) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__leading">
        <LayerSymbolSwatch symbolKey={symbolKey} />
        <span className="toggle-row__copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
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
        className={`toggle-row toggle-row--group${expanded ? " toggle-row--group--active" : ""}`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="toggle-row__copy">
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
        <ChevronDown size={16} className="toggle-row__chevron" aria-hidden="true" />
      </button>
      <div className="layer-panel__group-body">
        <div className="layer-panel__group-inner">{children}</div>
      </div>
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
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const toggleGroup = (groupId) => {
    setExpandedGroupId((current) => (current === groupId ? null : groupId));
  };

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
          expanded={expandedGroupId === "murabba"}
          onToggle={() => toggleGroup("murabba")}
        >
          <LayerToggleRow
            title={t("layerPanel.murrabaGridTitle")}
            description={t("layerPanel.murrabaGridDesc")}
            checked={layerVisibility.murrabaGrid ?? false}
            onChange={() => onToggleLayer("murrabaGrid")}
            symbolKey="murrabaGrid"
          />

          <LayerToggleRow
            title={t("layerPanel.cadastralLayerTitle")}
            description={t("layerPanel.cadastralLayerDesc")}
            checked={layerVisibility.cadastral}
            onChange={() => onToggleLayer("cadastral")}
            symbolKey="cadastral"
          />
        </LayerCollapsibleGroup>
      </div>

      <div className="layer-panel__section">
        <LayerCollapsibleGroup
          title={t("layerPanel.boundariesLayerTitle")}
          description={t("layerPanel.boundariesLayerDesc")}
          expanded={expandedGroupId === "boundaries"}
          onToggle={() => toggleGroup("boundaries")}
        >
          <LayerToggleRow
            title={t("layerPanel.boundaryLayers.state.title")}
            description={t("layerPanel.boundaryLayers.state.description")}
            checked={layerVisibility.stateBoundary ?? false}
            onChange={() => onToggleLayer("stateBoundary")}
            symbolKey="stateBoundary"
          />

          {arcgisPortalConfig.boundarySublayers.map((layer) => (
            <LayerToggleRow
              key={layer.key}
              title={t(`layerPanel.boundaryLayers.${layer.key}.title`)}
              description={t(`layerPanel.boundaryLayers.${layer.key}.description`)}
              checked={layerVisibility[layer.key]}
              onChange={() => onToggleLayer(layer.key)}
              symbolKey={layer.key}
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
          expanded={expandedGroupId === "other"}
          onToggle={() => toggleGroup("other")}
        >
          {arcgisPortalConfig.operationalLayers
            .filter((layer) => layer.key !== "assets") // temporarily hidden
            .map((layer) => (
            <LayerToggleRow
              key={layer.key}
              title={layer.title}
              description={layer.description}
              checked={layerVisibility[layer.key] ?? false}
              onChange={() => onToggleLayer(layer.key)}
              symbolKey={layer.key}
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
