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
  onRecordSelect,
  onStatusChange,
  theme,
  glassMode,
  onToggleTheme,
  onToggleGlass,
  mapReady,
  sfActiveTool,
  sfIsActive,
  sfProgress,
  sfRows,
  sfStatusMessage,
  onSfStart,
  onSfClear,
}) {
  const { t } = useLanguage();
  const [searchExpanded,   setSearchExpanded]   = useState(false);
  const [selectorExpanded, setSelectorExpanded] = useState(false);

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
      setSelectorExpanded(false);
    } else if (id === "personalizations") {
      setSelectorExpanded((prev) => !prev);
      setSearchExpanded(false);
    } else {
      setSearchExpanded(false);
      setSelectorExpanded(false);
      onSelect(id);
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
                        onPrint={() => window.print()}
                        onBoundaryDraw={onBoundaryDraw}
                        onSelectionStart={onSelectionStart}
                        onRecordSelect={onRecordSelect}
                        onStatusChange={onStatusChange}
                      />
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
