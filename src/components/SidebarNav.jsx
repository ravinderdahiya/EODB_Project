import "./SidebarNav.css";
import { Fragment, useState } from "react";
import { BoxSelect, Hexagon, Spline, Trash2 } from "lucide-react";
import SearchPanel from "./SearchPanel";
import { useLanguage } from "@/context/LanguageContext";

const SF_TOOL_IDS = ["rectangle", "polygon", "polyline"];
const SF_TOOL_ICONS = { rectangle: BoxSelect, polygon: Hexagon, polyline: Spline };

export default function SidebarNav({
  activeId,
  items,
  isOpen,
  onSelect,
  onBoundaryDraw,
  onSelectionStart,
  onFindLatLong,
  onRecordSelect,
  onStatusChange,
  mapReady,
  layersPanelActive,
  measurementActive,
  sfActiveTool,
  sfIsActive,
  sfProgress,
  sfStatusMessage,
  onSfStart,
  onSfClear,
}) {
  const { t } = useLanguage();
  const [searchExpanded,   setSearchExpanded]   = useState(false);
  const [latLongExpanded,  setLatLongExpanded]  = useState(false);
  const [selectorExpanded, setSelectorExpanded] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latLongLoading, setLatLongLoading] = useState(false);
  const [latLongError, setLatLongError] = useState("");

  const mapUsable = mapReady !== false;
  const parseCoordinate = (value) => Number(String(value ?? "").trim().replace(",", "."));

  const handleNavClick = (id) => {
    const item = items.find((i) => i.id === id);

    if (item?.pdfUrl) {
      window.open(item.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (id === "search") {
      setSearchExpanded((prev) => {
        const next = !prev;
        if (next) {
          onSelectionStart?.();
        }
        return next;
      });
      setLatLongExpanded(false);
      setLatLongError("");
      setSelectorExpanded(false);
    } else if (id === "find-latlong") {
      setLatLongExpanded((prev) => !prev);
      setSearchExpanded(false);
      setSelectorExpanded(false);
      setLatLongError("");
    } else if (id === "personalizations") {
      setSelectorExpanded((prev) => !prev);
      setSearchExpanded(false);
      setLatLongExpanded(false);
      setLatLongError("");
    } else {
      setSearchExpanded(false);
      setLatLongExpanded(false);
      setLatLongError("");
      setSelectorExpanded(false);
      onSelect(id);
    }
  };

  const handleLatLongSubmit = async (event) => {
    event.preventDefault();
    const lat = parseCoordinate(latitude);
    const lon = parseCoordinate(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setLatLongError("Please enter numeric latitude and longitude.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setLatLongError("Latitude must be between -90 and 90.");
      return;
    }

    if (lon < -180 || lon > 180) {
      setLatLongError("Longitude must be between -180 and 180.");
      return;
    }

    if (!onFindLatLong) {
      setLatLongError("Find Lat/Long is not available right now.");
      return;
    }

    setLatLongLoading(true);
    setLatLongError("");
    try {
      const result = await onFindLatLong({ latitude: lat, longitude: lon });
      if (!result?.ok) {
        setLatLongError(result?.message || "Unable to find this point.");
        return;
      }
      onStatusChange?.(result.message || "Point located successfully.");
    } catch (error) {
      setLatLongError(error?.message || "Unable to find this point.");
    } finally {
      setLatLongLoading(false);
    }
  };

  const progressPct =
    sfProgress?.total > 0
      ? Math.round((sfProgress.current / sfProgress.total) * 100)
      : 0;

  const showProgress = sfProgress?.running || (sfProgress?.total > 0 && !sfProgress?.running);

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__surface">
        <div className="sidebar__body">
          <nav className="sidebar__nav" aria-label="Main navigation">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === "search"           ? searchExpanded  :
                item.id === "find-latlong"     ? latLongExpanded :
                item.id === "layers"           ? Boolean(layersPanelActive) :
                item.id === "measurement"      ? Boolean(measurementActive) :
                item.id === "personalizations" ? selectorExpanded :
                item.id === activeId;

              // Use translation if available, fall back to item.label
              const navEntry = t(`nav.${item.id}.label`);
              const label = navEntry !== `nav.${item.id}.label` ? navEntry : item.label;

              return (
                <Fragment key={item.id}>
                  <button
                    type="button"
                    className={`sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <span className="sidebar__nav-icon"><Icon size={18} /></span>
                    <span className="sidebar__nav-title">{label}</span>
                  </button>

                  {item.id === "search" && (
                    <div className={`sidebar__search-drawer ${searchExpanded ? "sidebar__search-drawer--open" : ""}`}>
                      <SearchPanel
                        onBoundaryDraw={onBoundaryDraw}
                        onSelectionStart={onSelectionStart}
                        onRecordSelect={onRecordSelect}
                        onStatusChange={onStatusChange}
                      />
                    </div>
                  )}

                  {item.id === "find-latlong" && (
                    <div className={`sidebar__latlong-drawer ${latLongExpanded ? "sidebar__latlong-drawer--open" : ""}`}>
                      <div className="sidebar-latlong">
                        <form className="sidebar-latlong__form" onSubmit={handleLatLongSubmit}>
                          <label className="sidebar-latlong__field">
                            <span>Latitude</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g. 29.0588"
                              value={latitude}
                              onChange={(e) => setLatitude(e.target.value)}
                            />
                          </label>
                          <label className="sidebar-latlong__field">
                            <span>Longitude</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g. 76.0856"
                              value={longitude}
                              onChange={(e) => setLongitude(e.target.value)}
                            />
                          </label>
                          {latLongError ? (
                            <p className="sidebar-latlong__error" role="alert">{latLongError}</p>
                          ) : null}
                          <button
                            type="submit"
                            className="sidebar-latlong__button"
                            disabled={latLongLoading || !mapUsable}
                          >
                            {latLongLoading ? "Finding..." : "Find Point"}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {item.id === "personalizations" && (
                    <div className={`sidebar__selector-drawer ${selectorExpanded ? "sidebar__selector-drawer--open" : ""}`}>
                      <div className="sidebar-selector">

                        {/* ── Select Features ─────────────────────────────── */}
                        <div className="sf-section">
                          <div className="sf-section__head">
                            <span className="sidebar-selector__label sf-section__title">
                              {t("sf.title")}
                            </span>
                            <button
                              type="button"
                              className="sf-clear-btn"
                              onClick={onSfClear}
                              disabled={!sfIsActive}
                              title={t("sf.clearLabel")}
                              aria-label={t("sf.clearLabel")}
                            >
                              <Trash2 size={13} />
                              <span>{t("sf.clear")}</span>
                            </button>
                          </div>

                          <p className="sf-hint">
                            {t("sf.hint", { max: 20 })}
                          </p>

                          <div className="sf-tools">
                            {SF_TOOL_IDS.map((id) => {
                              const ToolIcon = SF_TOOL_ICONS[id];
                              const toolLabel = t(`sf.tools.${id}`);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={`sf-tool ${sfActiveTool === id ? "sf-tool--active" : ""}`}
                                  onClick={() => onSfStart(id)}
                                  disabled={!mapReady || sfProgress?.running}
                                  title={t("sf.selectByLabel", { label: toolLabel })}
                                >
                                  <ToolIcon size={20} />
                                  <span>{toolLabel}</span>
                                </button>
                              );
                            })}
                          </div>

                          {showProgress && (
                            <div className="sf-progress" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                              <div className="sf-progress__track">
                                <div
                                  className={`sf-progress__fill ${sfProgress?.running ? "sf-progress__fill--animated" : ""}`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="sf-progress__label">
                                {sfProgress?.running
                                  ? t("sf.progressRunning", { current: sfProgress.current, total: sfProgress.total })
                                  : t("sf.progressDone", { total: sfProgress.total })}
                              </span>
                            </div>
                          )}

                          {sfStatusMessage && (
                            <p className="sf-status">{sfStatusMessage}</p>
                          )}
                        </div>

                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
