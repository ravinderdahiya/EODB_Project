import "./KanalMarlaLegendPopup.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { getMapServiceLegend } from "@/services/mapserverProxyService";

const INITIAL_RIGHT_MARGIN = 16;
const INITIAL_TOP_MARGIN = 16;
const EDGE_PADDING = 8;

// Legend labels are "Kanal-Marla" (e.g. "0-1", "1-0"). The service returns them
// in string order ("0-10" before "0-2"), so sort numerically by kanal then marla.
const parseKanalMarla = (label) => {
  const [kanal, marla] = String(label ?? "")
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  return {
    kanal: Number.isFinite(kanal) ? kanal : 0,
    marla: Number.isFinite(marla) ? marla : 0,
  };
};

const sortLegendEntries = (legend) =>
  [...legend].sort((a, b) => {
    const left = parseKanalMarla(a?.label);
    const right = parseKanalMarla(b?.label);
    return left.kanal - right.kanal || left.marla - right.marla;
  });

export default function KanalMarlaLegendPopup({ open, onClose }) {
  const popupRef = useRef(null);
  const dragStateRef = useRef(null);
  const fetchedRef = useRef(false);
  const [position, setPosition] = useState(null);
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  // Fetch the legend once, the first time the popup opens. Depend only on `open`
  // so updating `status` does not re-trigger (and cancel) this effect.
  useEffect(() => {
    if (!open || fetchedRef.current) return undefined;
    fetchedRef.current = true;

    let cancelled = false;
    setStatus("loading");
    getMapServiceLegend("kanalMarla")
      .then((data) => {
        if (cancelled) return;
        const legend = data?.layers?.flatMap((layer) => layer?.legend ?? []) ?? [];
        setEntries(sortLegendEntries(legend));
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        // Allow a retry the next time the popup is opened.
        fetchedRef.current = false;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Position the popup on the right side of the map the first time it opens.
  useLayoutEffect(() => {
    if (!open || position || !popupRef.current) return;
    const parent = popupRef.current.offsetParent ?? popupRef.current.parentElement;
    const parentWidth = parent?.clientWidth ?? window.innerWidth;
    const popupWidth = popupRef.current.offsetWidth || 260;
    setPosition({
      left: Math.max(EDGE_PADDING, parentWidth - popupWidth - INITIAL_RIGHT_MARGIN),
      top: INITIAL_TOP_MARGIN,
    });
  }, [open, position]);

  // Reset position when closed so the next open returns to the right side.
  useEffect(() => {
    if (!open) setPosition(null);
  }, [open]);

  const handlePointerMove = useCallback((event) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const popupEl = popupRef.current;
    const parent = popupEl?.offsetParent ?? popupEl?.parentElement;
    const parentRect = parent?.getBoundingClientRect();
    const popupW = popupEl?.offsetWidth ?? 260;
    const popupH = popupEl?.offsetHeight ?? 200;

    // Cursor position translated into parent-relative coordinates, minus the
    // grab offset within the popup.
    let nextLeft = event.clientX - (parentRect?.left ?? 0) - drag.offsetX;
    let nextTop = event.clientY - (parentRect?.top ?? 0) - drag.offsetY;

    if (parentRect) {
      const maxLeft = parentRect.width - popupW - EDGE_PADDING;
      const maxTop = parentRect.height - popupH - EDGE_PADDING;
      nextLeft = Math.min(Math.max(EDGE_PADDING, nextLeft), Math.max(EDGE_PADDING, maxLeft));
      nextTop = Math.min(Math.max(EDGE_PADDING, nextTop), Math.max(EDGE_PADDING, maxTop));
    }

    setPosition({ left: nextLeft, top: nextTop });
  }, []);

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [handlePointerMove]);

  const startDragging = useCallback(
    (event) => {
      const popupEl = popupRef.current;
      if (!popupEl) return;
      const popupRect = popupEl.getBoundingClientRect();
      // Grab offset = where inside the popup the user pressed.
      dragStateRef.current = {
        offsetX: event.clientX - popupRect.left,
        offsetY: event.clientY - popupRect.top,
      };
      event.preventDefault();
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopDragging);
    },
    [handlePointerMove, stopDragging],
  );

  useEffect(() => () => stopDragging(), [stopDragging]);

  if (!open) return null;

  return (
    <div
      ref={popupRef}
      className="kanal-legend"
      style={position ? { left: `${position.left}px`, top: `${position.top}px`, right: "auto" } : undefined}
      role="dialog"
      aria-label="Kanal Marla symbology"
    >
      <div className="kanal-legend__header" onPointerDown={startDragging}>
        <span className="kanal-legend__drag" aria-hidden="true">
          <GripVertical size={14} />
        </span>
        <div className="kanal-legend__titles">
          <strong>Kanal Marla</strong>
          <small>Symbology (Kanal-Marla)</small>
        </div>
        <button
          type="button"
          className="kanal-legend__close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          aria-label="Close legend"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="kanal-legend__body">
        {status === "loading" && <p className="kanal-legend__hint">Loading symbology…</p>}
        {status === "error" && (
          <p className="kanal-legend__hint kanal-legend__hint--error">
            Could not load symbology. Please try again.
          </p>
        )}
        {status === "ready" && entries.length === 0 && (
          <p className="kanal-legend__hint">No symbology available.</p>
        )}
        {status === "ready" && entries.length > 0 && (
          <ul className="kanal-legend__list">
            {entries.map((entry, idx) => (
              <li className="kanal-legend__item" key={`${entry.label}-${idx}`}>
                <img
                  className="kanal-legend__swatch"
                  src={`data:${entry.contentType || "image/png"};base64,${entry.imageData}`}
                  alt=""
                  width={18}
                  height={18}
                />
                <span className="kanal-legend__label">{entry.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
