import { basemapPresets } from "@/config/arcgis";

export default function BasemapSwitcher({ activeBasemap, onChange }) {
  return (
    <div className="basemap-switcher">
      <div className="basemap-switcher__header">
        <strong>Basemap</strong>
        <small>Choose the map surface for the current land record view.</small>
      </div>

      <div className="basemap-switcher__options">
        {Object.values(basemapPresets).map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={`basemap-switcher__option ${
              activeBasemap === preset.id ? "basemap-switcher__option--active" : ""
            }`}
            onClick={() => onChange(preset.id)}
          >
            <span>{preset.label}</span>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
