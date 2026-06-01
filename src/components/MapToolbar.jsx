import "./MapToolbar.css";
import {
  Layers3,
  MapPin,
  Map,
  Minus,
  Plus,
  RefreshCcw,
  Ruler,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const LEFT_TOOL_IDS  = ["basemap", "layers", "reset", "locate", "measurement"];
const RIGHT_TOOL_IDS = ["zoom-in", "zoom-out"];

const TOOL_ICONS = {
  basemap:     Map,
  layers:      Layers3,
  reset:       RefreshCcw,
  locate:      MapPin,
  measurement: Ruler,
  "zoom-in":   Plus,
  "zoom-out":  Minus,
};

const CAPTIONED_TOOL_IDS = new Set(["basemap", "layers", "reset", "locate", "measurement"]);

function ToolButton({ toolId, isActive, onAction }) {
  const { t } = useLanguage();
  const Icon    = TOOL_ICONS[toolId];
  const caption = CAPTIONED_TOOL_IDS.has(toolId) ? t(`mapToolbarCaption.${toolId}`) : null;
  const label   = t(`mapToolbar.${toolId}`);

  const button = (
    <button
      type="button"
      className={`map-toolbar__button ${isActive ? "map-toolbar__button--active" : ""}`}
      onClick={() => onAction(toolId)}
      aria-label={label}
      title={label}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="map-toolbar__tool">
      {button}
      {caption && <span className="map-toolbar__tool-caption">{caption}</span>}
    </div>
  );
}

export default function MapToolbar({
  activeLayerPanel,
  activeMeasurement,
  activeBasemapPanel,
  onAction,
}) {
  const { t } = useLanguage();

  const isActive = (id) =>
    (id === "layers"      && activeLayerPanel) ||
    (id === "basemap"     && activeBasemapPanel) ||
    (id === "measurement" && activeMeasurement);

  return (
    <>
      <div className="map-toolbar map-toolbar--left" role="toolbar" aria-label={t("mapToolbar.layerControls")}>
        {LEFT_TOOL_IDS.map((id) => (
          <ToolButton key={id} toolId={id} isActive={isActive(id)} onAction={onAction} />
        ))}
      </div>

      <div className="map-toolbar map-toolbar--zoom" role="toolbar" aria-label={t("mapToolbar.mapControls")}>
        {RIGHT_TOOL_IDS.map((id) => (
          <ToolButton key={id} toolId={id} isActive={isActive(id)} onAction={onAction} />
        ))}
      </div>
    </>
  );
}
