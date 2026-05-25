import { useCallback, useEffect, useRef, useState } from "react";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import "./NorthCompassControl.css";

/**
 * Normalize any degree value into [0, 360).
 */
function normalizeDegrees(value) {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * Pointer angle from compass center, clockwise from screen-north (0° = up).
 * Matches ArcGIS MapView.rotation (clockwise degrees).
 */
function angleFromPointer(clientX, clientY, centerX, centerY) {
  const radians = Math.atan2(clientX - centerX, -(clientY - centerY));
  return normalizeDegrees((radians * 180) / Math.PI);
}

/** GPS-style north pointer used for the collapsed toggle (points to geographic north). */
function NorthPointerIcon() {
  return (
    <svg
      className="ncc__pointer-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.25 20.1 18.9 12 14.35 3.9 18.9 12 2.25Z" />
    </svg>
  );
}

export default function NorthCompassControl({ viewRef, mapReady }) {
  const [expanded, setExpanded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dialRef = useRef(null);
  const draggingRef = useRef(false);
  const watchHandleRef = useRef(null);

  const applyMapRotation = useCallback((degrees, { animate = false } = {}) => {
    const view = viewRef.current;
    if (!view) return;

    const target = normalizeDegrees(degrees);
    setRotation(target);

    if (animate) {
      void view.goTo({ rotation: target }, { duration: 280, easing: "ease-out" }).catch(() => {});
      return;
    }

    // Direct assignment keeps drag responsive without queuing goTo animations.
    view.rotation = target;
  }, [viewRef]);

  const resetToNorth = useCallback(() => {
    applyMapRotation(0, { animate: true });
  }, [applyMapRotation]);

  // Sync compass UI when the map rotates (wheel, API, other controls).
  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const attachWatcher = () => {
      if (cancelled) return;
      const view = viewRef.current;
      if (!view) {
        retryTimer = window.setTimeout(attachWatcher, 300);
        return;
      }

      if (view.rotation != null) {
        setRotation(normalizeDegrees(view.rotation));
      }

      watchHandleRef.current = reactiveUtils.watch(
        () => viewRef.current?.rotation,
        (nextRotation) => {
          if (draggingRef.current || nextRotation == null) return;
          setRotation(normalizeDegrees(nextRotation));
        },
      );
    };

    if (mapReady) {
      attachWatcher();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      watchHandleRef.current?.remove?.();
    };
  }, [viewRef, mapReady]);

  const updateRotationFromPointer = useCallback((event) => {
    const dial = dialRef.current;
    if (!dial) return;

    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const nextAngle = angleFromPointer(event.clientX, event.clientY, centerX, centerY);
    applyMapRotation(nextAngle);
  }, [applyMapRotation]);

  const stopDragging = useCallback((event) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onRingPointerDown = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateRotationFromPointer(event);
  }, [updateRotationFromPointer]);

  const onRingPointerMove = useCallback((event) => {
    if (!draggingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    updateRotationFromPointer(event);
  }, [updateRotationFromPointer]);

  const onRingPointerUp = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    stopDragging(event);
  }, [stopDragging]);

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  const displayRotation = Math.round(rotation);

  return (
    <div
      className={`ncc${expanded ? " ncc--expanded" : ""}${isDragging ? " ncc--dragging" : ""}`}
      aria-label="Map north and rotation control"
    >
      <button
        type="button"
        className="ncc__toggle"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls="ncc-compass-panel"
        aria-label={expanded ? "Collapse compass" : "Open compass rotation"}
        title={expanded ? "Collapse compass" : "Open compass rotation"}
      >
        {/* Arrow rotates with map so it always points toward geographic north. */}
        <span
          className="ncc__toggle-arrow"
          style={{ transform: `rotate(${-rotation}deg)` }}
          aria-hidden="true"
        >
          <NorthPointerIcon />
        </span>
      </button>

      {expanded ? (
        <div id="ncc-compass-panel" className="ncc__panel" role="group" aria-label="Compass rotation">
          <button
            type="button"
            className="ncc__close"
            onClick={() => setExpanded(false)}
            aria-label="Collapse compass"
            title="Close compass"
          >
            ×
          </button>

          <div ref={dialRef} className="ncc__dial">
            {/* Rose rotates opposite to map rotation so N always marks geographic north. */}
            <div
              className="ncc__rose"
              style={{ transform: `rotate(${-rotation}deg)` }}
              aria-hidden="true"
            >
              <span className="ncc__cardinal ncc__cardinal--n">N</span>
              <span className="ncc__cardinal ncc__cardinal--e">E</span>
              <span className="ncc__cardinal ncc__cardinal--s">S</span>
              <span className="ncc__cardinal ncc__cardinal--w">W</span>
              <span className="ncc__north-arrow" />
              <span className="ncc__tick-ring" />
            </div>

            {/* Drag ring: pointer angle is written directly to view.rotation. */}
            <button
              type="button"
              className="ncc__ring"
              aria-label="Drag to rotate map"
              onPointerDown={onRingPointerDown}
              onPointerMove={onRingPointerMove}
              onPointerUp={onRingPointerUp}
              onPointerCancel={onRingPointerUp}
              onLostPointerCapture={onRingPointerUp}
            />

            <button
              type="button"
              className="ncc__center"
              onClick={resetToNorth}
              onDoubleClick={(event) => {
                event.preventDefault();
                resetToNorth();
              }}
              aria-label="Reset map to north-up"
              title="Reset to north (0°)"
            >
              <span className="ncc__center-arrow" />
            </button>
          </div>

          <p className="ncc__hint">
            {displayRotation}° · drag ring to rotate · click center to reset
          </p>
        </div>
      ) : null}
    </div>
  );
}
