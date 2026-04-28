import "./MapStage.css";
import { Printer, TableProperties, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeParcel } from "@/utils/parcelUtils";

function formatScale(scale) {
  if (!scale || scale <= 0) return null;
  return `1 : ${Math.round(scale).toLocaleString("en-IN")}`;
}

export default function MapStage({
  mapStatus,
  children,
  mapRef,
  parcel,
  tableOpen,
  onToggleTable,
  onCloseTable,
  selectionRows,
  selectionProgress,
  mapScale,
  onPrint,
}) {
  const { t } = useLanguage();
  const scaleLabel = formatScale(mapScale);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      document.body.classList.add("print-parcel-view");
      window.print();
      window.addEventListener(
        "afterprint",
        () => document.body.classList.remove("print-parcel-view"),
        { once: true },
      );
    }
  };

  const safeParcel = normalizeParcel(parcel);

  const isSelectionMode  = selectionRows !== null && selectionRows !== undefined;
  const hasSelectionRows = isSelectionMode && selectionRows.length > 0;
  const selectionRunning = selectionProgress?.running ?? false;

  const panelTitle = isSelectionMode
    ? hasSelectionRows
      ? t("mapStage.panelTitleSelectionCount", {
          count: selectionRows.length,
          s: selectionRows.length !== 1 ? "s" : "",
        })
      : t("mapStage.panelTitleSelection")
    : t("mapStage.panelTitleDetails");

  const panelSubtitle = isSelectionMode
    ? hasSelectionRows
      ? selectionRows[0]
          ? [selectionRows[0].districtName, selectionRows[0].tehsilName, selectionRows[0].villageName]
              .filter((v) => v && v !== "--")
              .join(" / ")
          : ""
      : ""
    : `${safeParcel.district} / ${safeParcel.tehsil} / ${safeParcel.village}`;

  const selHeaders = t("mapStage.tableSelHeaders");
  const regHeaders = t("mapStage.tableRegHeaders");

  return (
    <section className="map-stage">
      <div className={`map-stage__viewport ${tableOpen ? "map-stage__viewport--table-open" : ""}`}>
        <div className="map-stage__canvas" ref={mapRef} />
        {children}

        {scaleLabel && (
          <div className="map-scale-badge" aria-label={`Map scale ${scaleLabel}`}>
            {scaleLabel}
          </div>
        )}

        <button
          type="button"
          className="parcel-table-toggle"
          onClick={onToggleTable}
          aria-label={tableOpen ? t("mapStage.hideTable") : t("mapStage.showTable")}
          title={tableOpen ? t("mapStage.hideTable") : t("mapStage.showTable")}
        >
          <TableProperties size={20} />
        </button>

        {tableOpen ? (
          <section className="parcel-table-panel" aria-label={t("mapStage.selectionLabel")}>
            <div className="parcel-table-panel__header">
              <div>
                <span className="eyebrow">{panelTitle}</span>
                <h2>{panelSubtitle}</h2>
              </div>

              <div className="parcel-table-panel__actions">
                {!isSelectionMode && (
                  <span className="parcel-table-panel__status">{safeParcel.verificationStatus}</span>
                )}
                {selectionRunning && (
                  <span className="parcel-table-panel__status sf-fetching-badge">
                    {t("mapStage.fetchingOwners")}
                  </span>
                )}
                <button
                  type="button"
                  className="parcel-table-panel__print"
                  onClick={handlePrint}
                  aria-label={t("mapStage.printDetails")}
                  title={t("mapStage.printDetails")}
                >
                  <Printer size={16} />
                  <span>{t("mapStage.print")}</span>
                </button>
                <button
                  type="button"
                  className="parcel-table-panel__close"
                  onClick={onCloseTable}
                  aria-label={t("mapStage.closeTable")}
                  title={t("mapStage.closeTable")}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="parcel-table-panel__scroll">
              {isSelectionMode ? (
                hasSelectionRows ? (
                  <table className="parcel-details-table parcel-details-table--selection">
                    <thead>
                      <tr>
                        {Array.isArray(selHeaders)
                          ? selHeaders.map((h) => <th key={h}>{h}</th>)
                          : null}
                      </tr>
                    </thead>
                    <tbody>
                      {selectionRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="parcel-details-table__serial">{idx + 1}</td>
                          <td>{row.murrabbaNo}</td>
                          <td>{row.khasraNo}</td>
                          <td>{row.area}</td>
                          <td className="parcel-details-table__owner">{row.ownerName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="parcel-table-empty">
                    {selectionRunning
                      ? t("mapStage.processingSelection")
                      : t("mapStage.noData")}
                  </div>
                )
              ) : (
                <table className="parcel-details-table">
                  <thead>
                    <tr>
                      {Array.isArray(regHeaders)
                        ? regHeaders.map((h) => <th key={h}>{h}</th>)
                        : null}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{safeParcel.murabbaNo}</td>
                      <td>{safeParcel.khasraNo}</td>
                      <td className="parcel-details-table__owner">{safeParcel.ownerName}</td>
                      <td>{safeParcel.khewatNo}</td>
                      <td>{safeParcel.khatoniNo}</td>
                      <td>{safeParcel.jamabandiYear}</td>
                      <td>{safeParcel.area}</td>
                      <td>{safeParcel.recordType}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : null}
      </div>
      <div className="map-disclaimer" aria-label="Disclaimer">
        <span className="map-disclaimer__track">
          {t("mapStage.disclaimer")}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{t("mapStage.disclaimer")}
        </span>
      </div>
    </section>
  );
}
