import {
  Crosshair,
  Layers3,
  LocateFixed,
  Minus,
  Plus,
  RefreshCcw,
  Ruler,
  Search,
} from "lucide-react";

const tools = [
  { id: "search", icon: Search, label: "Focus search" },
  { id: "zoom-in", icon: Plus, label: "Zoom in" },
  { id: "zoom-out", icon: Minus, label: "Zoom out" },
  { id: "layers", icon: Layers3, label: "Toggle layers" },
  { id: "reset", icon: RefreshCcw, label: "Reset extent" },
  { id: "locate", icon: LocateFixed, label: "Locate me" },
  { id: "measurement", icon: Ruler, label: "Measurement tools" },
  { id: "target", icon: Crosshair, label: "Selection mode" },
];

export default function MapToolbar({
  activeLayerPanel,
  activeMeasurement,
  onAction,
}) {
  return (
    <div className="map-toolbar" role="toolbar" aria-label="Map controls">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive =
          (tool.id === "layers" && activeLayerPanel) ||
          (tool.id === "measurement" && activeMeasurement);

        return (
          <button
            type="button"
            key={tool.id}
            className={`map-toolbar__button ${isActive ? "map-toolbar__button--active" : ""}`}
            onClick={() => onAction(tool.id)}
            aria-label={tool.label}
            title={tool.label}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
