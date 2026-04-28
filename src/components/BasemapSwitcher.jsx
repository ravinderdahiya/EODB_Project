import "./BasemapSwitcher.css";
import { basemapPresets } from "@/config/arcgis";
import { useLanguage } from "@/context/LanguageContext";

export default function BasemapSwitcher({ activeBasemap, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="basemap-switcher">
      <div className="basemap-switcher__header">
        <strong>{t("basemap.title")}</strong>
        <small>{t("basemap.subtitle")}</small>
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
            {preset.thumbnail && (
              <img
                className="basemap-switcher__thumb"
                src={preset.thumbnail}
                alt={preset.label}
                loading="lazy"
              />
            )}
            <div className="basemap-switcher__option-text">
              <span>{preset.label}</span>
              <small>{preset.description}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
