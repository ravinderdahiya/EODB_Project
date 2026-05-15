import "./MapStage.css";
import { ChevronDown, ChevronUp, Printer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeParcel } from "@/utils/parcelUtils";
import { triggerPrint, PRINT_DISCLAIMER } from "@/utils/printUtils";
function formatScale(scale) {
  if (!scale || scale <= 0) return null;
  return `1 : ${Math.round(scale).toLocaleString("en-IN")}`;
}

export default function MapStage({
  mapStatus,
  mapReady,
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
  onWhatsAppShare,
}) {
  const { t } = useLanguage();
  const scaleLabel = formatScale(mapScale);

  const [tableHeight, setTableHeight] = useState(null);
  const panelRef = useRef(null);
  const viewportRef = useRef(null);

  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayExiting, setOverlayExiting] = useState(false);

  useEffect(() => {
    if (mapReady && overlayVisible) {
      setOverlayExiting(true);
      const timer = setTimeout(() => setOverlayVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [mapReady, overlayVisible]);

  const startDrag = (e) => {
    e.preventDefault();
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const startH = panelRef.current?.offsetHeight ?? 280;
    const maxH = (viewportRef.current?.offsetHeight ?? window.innerHeight) * 0.75;

    const onMove = (moveEvt) => {
      moveEvt.preventDefault();
      const y = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const next = Math.min(Math.max(startH + (startY - y), 140), maxH);
      setTableHeight(next);
    };

    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      document.body.classList.add("print-parcel-view");
      triggerPrint();
      window.addEventListener(
        "afterprint",
        () => document.body.classList.remove("print-parcel-view"),
        { once: true },
      );
    }
  };

  const handleWhatsAppShare = async () => {
    if (!panelRef.current) return;
    try {
      // Get map screenshot from App (zooms to parcel, waits for tiles, takes screenshot, restores)
      let mapDataUrl = null;
      if (onWhatsAppShare) {
        mapDataUrl = await onWhatsAppShare();
      }

      // Capture the panel (header + table)
      const { default: html2canvas } = await import("html2canvas");
      const panelCanvas = await html2canvas(panelRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Composite: map on top, panel below (matches print layout)
      let finalCanvas = panelCanvas;
      if (mapDataUrl) {
        const mapImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = mapDataUrl;
        });
        const W = panelCanvas.width;
        const mapH = Math.round((mapImg.naturalHeight / mapImg.naturalWidth) * W);
        finalCanvas = document.createElement("canvas");
        finalCanvas.width = W;
        finalCanvas.height = mapH + panelCanvas.height;
        const ctx = finalCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, finalCanvas.height);
        ctx.drawImage(mapImg, 0, 0, W, mapH);
        ctx.drawImage(panelCanvas, 0, mapH);
      }

      const filename = `EODB_Share_${new Date().toISOString().slice(0, 10)}.png`;
      finalCanvas.toBlob(async (blob) => {
        if (!blob) {
          console.warn("WhatsApp share: image generation failed");
          return;
        }
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "EODB Land Record" });
            return;
          } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("Web Share API failed, using fallback:", err.message);
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        const text = encodeURIComponent(`Land Record: ${panelSubtitle}\n${PRINT_DISCLAIMER}`);
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      }, "image/png");
    } catch (err) {
      console.warn("WhatsApp share failed:", err.message);
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
      <div
        ref={viewportRef}
        className={`map-stage__viewport ${tableOpen ? "map-stage__viewport--table-open" : ""}`}
        style={tableOpen && tableHeight ? { "--table-h": `${tableHeight}px` } : undefined}
      >
        <div className="map-stage__canvas" ref={mapRef} />
        {children}

        {overlayVisible && (
          <div
            className={`map-loading-overlay${overlayExiting ? " map-loading-overlay--exiting" : ""}`}
            role="status"
            aria-live="polite"
            aria-label="Map loading"
          >
            <div className="map-loading-overlay__card">
              <div className="map-loading-overlay__spinner" aria-hidden="true">
                <div className="map-loading-overlay__spinner-ring" />
              </div>
              <p className="map-loading-overlay__title">Loading Map</p>
              <p className="map-loading-overlay__status">{mapStatus}</p>
            </div>
          </div>
        )}

        {scaleLabel && (
          <div className="map-scale-badge" aria-label={`Map scale ${scaleLabel}`}>
            {scaleLabel}
          </div>
        )}

        <button
          type="button"
          className="parcel-table-toggle"
          style={tableOpen && tableHeight ? { bottom: `calc(${tableHeight}px + 1rem)` } : undefined}
          onClick={onToggleTable}
          aria-label={tableOpen ? t("mapStage.hideTable") : t("mapStage.showTable")}
          title={tableOpen ? t("mapStage.hideTable") : t("mapStage.showTable")}
        >
          {tableOpen ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
        </button>

        {tableOpen ? (
          <section
            ref={panelRef}
            className="parcel-table-panel"
            aria-label={t("mapStage.selectionLabel")}
            style={tableHeight ? { height: `${tableHeight}px`, maxHeight: `${tableHeight}px` } : undefined}
          >
            <div
              className="parcel-table-panel__resize-handle"
              onMouseDown={startDrag}
              onTouchStart={startDrag}
              aria-hidden="true"
            />
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
                  className="parcel-table-panel__whatsapp"
                  onClick={handleWhatsAppShare}
                  aria-label={t("mapStage.whatsappShare")}
                  title={t("mapStage.whatsappShare")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>WhatsApp</span>
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
      <div className="map-print-disclaimer" aria-label="Print Disclaimer">
        {PRINT_DISCLAIMER}
      </div>
    </section>
  );
}
