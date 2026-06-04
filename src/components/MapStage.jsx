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

function formatCoord(value, positive, negative) {
  if (value == null || !Number.isFinite(value)) return null;
  const dir = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(5)}° ${dir}`;
}

// Toggle arrow button height (keep in sync with .parcel-table-toggle in MapStage.css).
const TOGGLE_HEIGHT = 32;

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
  pointerCoords,
  onPrint,
  onWhatsAppShare,
}) {
  const { t } = useLanguage();
  const scaleLabel = formatScale(mapScale);

  const latLabel = formatCoord(pointerCoords?.latitude, "N", "S");
  const lngLabel = formatCoord(pointerCoords?.longitude, "E", "W");
  const coordsLabel = latLabel && lngLabel ? `${latLabel}, ${lngLabel}` : null;

  const [tableHeight, setTableHeight] = useState(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const panelRef = useRef(null);
  const viewportRef = useRef(null);

  // Measure the real rendered height of the table panel so the toggle arrow
  // always sits exactly on top of it (the CSS height is clamped, so a fixed
  // percentage offset would not line up at every viewport size).
  useEffect(() => {
    if (!tableOpen) {
      setPanelHeight(0);
      return undefined;
    }
    const el = panelRef.current;
    if (!el) return undefined;
    const update = () => setPanelHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [tableOpen, tableHeight]);

  const toggleBottom = tableOpen && panelHeight
    ? `calc(${panelHeight}px + 0.35rem)`
    : undefined;

  const coordsBottom = tableOpen && panelHeight
    ? `calc(${panelHeight}px + 0.35rem + ${TOGGLE_HEIGHT}px + 0.45rem)`
    : `calc(1.5rem + ${TOGGLE_HEIGHT}px + 0.45rem)`;

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
        // Expand table area in cloned DOM so full multi-selection rows are captured.
        onclone: (clonedDoc) => {
          const clonedPanel = clonedDoc.querySelector(".parcel-table-panel");
          const clonedScroll = clonedDoc.querySelector(".parcel-table-panel__scroll");
          if (clonedPanel) {
            clonedPanel.style.height = "auto";
            clonedPanel.style.maxHeight = "none";
            clonedPanel.style.minHeight = "0";
            clonedPanel.style.overflow = "visible";
          }
          if (clonedScroll) {
            clonedScroll.style.overflow = "visible";
            clonedScroll.style.maxHeight = "none";
            clonedScroll.style.height = "auto";
          }
        },
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

      // Add disclaimer footer at the bottom of the shared image.
      {
        const footerPadX = 16;
        const footerPadY = 12;
        const lineHeight = 18;
        const footerText = PRINT_DISCLAIMER;
        const srcW = finalCanvas.width;
        const srcH = finalCanvas.height;

        const footerCanvas = document.createElement("canvas");
        const footerCtx = footerCanvas.getContext("2d");
        footerCtx.font = '14px "Segoe UI", Arial, sans-serif';

        const maxTextWidth = srcW - footerPadX * 2;
        const words = footerText.split(/\s+/);
        const lines = [];
        let line = "";
        words.forEach((word) => {
          const candidate = line ? `${line} ${word}` : word;
          if (footerCtx.measureText(candidate).width <= maxTextWidth) {
            line = candidate;
          } else {
            if (line) lines.push(line);
            line = word;
          }
        });
        if (line) lines.push(line);

        const footerHeight = footerPadY * 2 + lines.length * lineHeight;
        footerCanvas.width = srcW;
        footerCanvas.height = srcH + footerHeight;

        const outCtx = footerCanvas.getContext("2d");
        outCtx.fillStyle = "#ffffff";
        outCtx.fillRect(0, 0, footerCanvas.width, footerCanvas.height);
        outCtx.drawImage(finalCanvas, 0, 0);
        outCtx.fillStyle = "#111111";
        outCtx.font = '14px "Segoe UI", Arial, sans-serif';
        outCtx.textBaseline = "top";
        lines.forEach((text, idx) => {
          outCtx.fillText(text, footerPadX, srcH + footerPadY + idx * lineHeight);
        });

        finalCanvas = footerCanvas;
      }

      const filename = `EODB_Share_${new Date().toISOString().slice(0, 10)}.png`;
      finalCanvas.toBlob(async (blob) => {
        if (!blob) {
          console.warn("Share image generation failed");
          return;
        }
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.share) {
          try {
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title: "EODB Land Record" });
              return;
            }
            await navigator.share({
              title: "EODB Land Record",
              text: `Land Record: ${panelSubtitle}`,
            });
            return;
          } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("File share failed, retrying with text share:", err.message);
            try {
              await navigator.share({
                title: "EODB Land Record",
                text: `Land Record: ${panelSubtitle}`,
              });
              return;
            } catch (retryErr) {
              if (retryErr.name === "AbortError") return;
              console.warn("Text share retry failed:", retryErr.message);
              window.alert("Share option could not be opened. Please try again.");
              return;
            }
          }
        }
        // Browser doesn't support Web Share API: local download fallback only in this case.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
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

        {coordsLabel && (
          <div
            className="map-cursor-coords"
            style={{ bottom: coordsBottom }}
            aria-label={`Cursor coordinates ${coordsLabel}`}
          >
            {coordsLabel}
          </div>
        )}

        <button
          type="button"
          className="parcel-table-toggle"
          style={toggleBottom ? { bottom: toggleBottom } : undefined}
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.59 13.51l6.83 3.98" />
                    <path d="M15.41 6.51L8.59 10.49" />
                  </svg>
                  <span>{t("mapStage.share")}</span>
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
