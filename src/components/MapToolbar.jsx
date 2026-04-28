import "./MapToolbar.css";
import {
  Layers3,
  LocateFixed,
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
  locate:      LocateFixed,
  measurement: Ruler,
  "zoom-in":   Plus,
  "zoom-out":  Minus,
};

function ToolButton({ toolId, isActive, onAction }) {
  const { t } = useLanguage();
  const Icon  = TOOL_ICONS[toolId];
  const label = t(`mapToolbar.${toolId}`);

  return (
    <button
      type="button"
      className={`map-toolbar__button ${isActive ? "map-toolbar__button--active" : ""}`}
      onClick={() => onAction(toolId)}
      aria-label={label}
      title={label}
    >
      <Icon size={18} />
    </button>
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

      <div className="map-toolbar" role="toolbar" aria-label={t("mapToolbar.mapControls")}>
        {RIGHT_TOOL_IDS.map((id) => (
          <ToolButton key={id} toolId={id} isActive={isActive(id)} onAction={onAction} />
        ))}
      </div>
    </>
  );
}
