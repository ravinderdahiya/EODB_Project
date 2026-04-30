import "./MeasurementPanel.css";
import { Ruler, Square, Trash2, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Floating measurement panel that appears when the Measurement Tools button
 * is active. Provides distance (polyline) and area (polygon) drawing actions
 * and displays the computed geodesic result.
 *
 * Props
 *   isOpen           – whether the panel is visible
 *   activeMode       – null | "distance" | "area"  (which sketch is running)
 *   isDrawing        – true while the user is actively drawing on the map
 *   result           – null | { type:"distance", meters, km }
 *                          | { type:"area", sqMeters, hectares, acres }
 *   onMeasureDistance – start a distance sketch
 *   onMeasureArea     – start an area sketch
 *   onClear           – cancel sketch and wipe graphics
 *   onClose           – close the panel entirely
 */
export default function MeasurementPanel({
  isOpen,
  activeMode,
  isDrawing,
  result,
  onMeasureDistance,
  onMeasureArea,
  onClear,
  onClose,
}) {
  const { t } = useLanguage();
  const hasActivity = result !== null || activeMode !== null;

  return (
    <div
      className={`measurement-panel ${isOpen ? "measurement-panel--open" : ""}`}
      aria-label={t("measurement.title")}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="measurement-panel__header">
        <div>
          <span className="eyebrow">{t("measurement.eyebrow")}</span>
          <h3>{t("measurement.title")}</h3>
        </div>
        <button
          type="button"
          className="measurement-panel__close-btn"
          onClick={onClose}
          aria-label={t("measurement.close")}
          title={t("measurement.close")}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Action buttons ───────────────────────────────────── */}
      <div className="measurement-panel__actions">
        <button
          type="button"
          className={`measurement-panel__action-btn ${activeMode === "distance" ? "measurement-panel__action-btn--active" : ""}`}
          onClick={onMeasureDistance}
          disabled={isDrawing && activeMode !== "distance"}
          title={t("measurement.distanceTitle")}
        >
          <Ruler size={15} />
          <span>{t("measurement.distance")}</span>
        </button>

        <button
          type="button"
          className={`measurement-panel__action-btn ${activeMode === "area" ? "measurement-panel__action-btn--active" : ""}`}
          onClick={onMeasureArea}
          disabled={isDrawing && activeMode !== "area"}
          title={t("measurement.areaTitle")}
        >
          <Square size={15} />
          <span>{t("measurement.area")}</span>
        </button>

        <button
          type="button"
          className="measurement-panel__action-btn measurement-panel__action-btn--ghost"
          onClick={onClear}
          disabled={!hasActivity}
          title={t("measurement.clear")}
        >
          <Trash2 size={15} />
          <span>{t("measurement.clear")}</span>
        </button>
      </div>

      {/* ── Drawing hint ─────────────────────────────────────── */}
      {isDrawing && (
        <p className="measurement-panel__hint">
          {activeMode === "distance"
            ? t("measurement.hintDistance")
            : t("measurement.hintArea")}
        </p>
      )}

      {/* ── Result ───────────────────────────────────────────── */}
      {result && (
        <div className="measurement-panel__result">
          <span className="measurement-panel__result-label">
            {result.type === "distance"
              ? t("measurement.resultDistance")
              : t("measurement.resultArea")}
          </span>

          <div className="measurement-panel__result-rows">
            {result.type === "distance" ? (
              <>
                <div className="measurement-panel__result-row">
                  <span>{t("measurement.meters")}</span>
                  <strong>
                    {result.meters.toLocaleString("en-IN", { maximumFractionDigits: 2 })} m
                  </strong>
                </div>
                <div className="measurement-panel__result-row">
                  <span>{t("measurement.feet")}</span>
                  <strong>
                    {result.feet.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ft
                  </strong>
                </div>
                <div className="measurement-panel__result-row">
                  <span>{t("measurement.karam")}</span>
                  <strong>
                    {result.karam.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kr
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div className="measurement-panel__result-row">
                  <span>{t("measurement.sqMeters")}</span>
                  <strong>
                    {result.sqMeters.toLocaleString("en-IN", { maximumFractionDigits: 2 })} m²
                  </strong>
                </div>
                <div className="measurement-panel__result-row">
                  <span>{t("measurement.hectares")}</span>
                  <strong>
                    {result.hectares.toLocaleString("en-IN", { maximumFractionDigits: 4 })} ha
                  </strong>
                </div>
                <div className="measurement-panel__result-row">
                  <span>{t("measurement.acres")}</span>
                  <strong>
                    {result.acres.toLocaleString("en-IN", { maximumFractionDigits: 4 })} ac
                  </strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
