import { useCallback, useEffect, useRef, useState } from 'react';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js';
import './ZoomWheelSlider.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_ZOOM = 7;
const MAX_ZOOM = 19;
const TICKS_PER_ZOOM = 8;   // sub-tick marks per zoom level
const TICK_SPACING   = 9;   // px width of each tick cell (must match CSS .zws__tick width)
const PADDING        = 32;  // phantom ticks on each side so the track never runs empty
const REAL_TICKS     = (MAX_ZOOM - MIN_ZOOM) * TICKS_PER_ZOOM + 1; // 97
const ALL_TICKS      = PADDING * 2 + REAL_TICKS;                    // 161

const LAYERS = [
  { key: 'district',  label: 'District',  min: 7,  max: 9  },
  { key: 'tehsil',    label: 'Tehsil',    min: 10, max: 12 },
  { key: 'village',   label: 'Village',   min: 13, max: 15 },
  { key: 'cadastral', label: 'Cadastral', min: 16, max: 19 },
];

function getActiveKey(zoom) {
  return (LAYERS.find(l => zoom >= l.min && zoom <= l.max) ?? LAYERS[0]).key;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Component ─────────────────────────────────────────────────────────────────
export default function ZoomWheelSlider({ viewRef, layersRef }) {
  const [zoom,     setZoom]     = useState(MIN_ZOOM);
  const [dragging, setDragging] = useState(false);

  // Refs avoid stale-closure issues inside event listeners
  const zoomRef        = useRef(MIN_ZOOM);
  const draggingRef    = useRef(false);
  const dragOriginX    = useRef(0);
  const dragOriginZoom = useRef(MIN_ZOOM);
  const watchHandleRef = useRef(null);

  /** Write zoom to both ref and state (for real-time UI update during drag). */
  const commitZoom = useCallback((raw) => {
    const z = clamp(raw, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = z;
    setZoom(z);
  }, []);

  /** Clamp, commit, then animate the ArcGIS map to the target zoom (fractional values allowed). */
  const goToZoom = useCallback(async (rawZoom) => {
    const z = clamp(rawZoom, MIN_ZOOM, MAX_ZOOM);
    commitZoom(z);
    const view = viewRef.current;
    if (!view) return;
    try {
      await view.goTo({ zoom: z }, { duration: 360, easing: 'ease-in-out' });
    } catch { /* navigation cancelled or view disposed */ }
  }, [viewRef, commitZoom]);

  /**
   * Auto-toggle boundary sublayers by zoom range.
   * - District sublayer shown at zoom 7–9
   * - Tehsil sublayer shown at zoom 10–12
   * - Village sublayer shown at zoom 13–15
   * - Cadastral visibility is already handled by useArcGISMap's zoomWatchHandle
   * Silently skips if layersRef is not provided or layer plan is missing.
   */
  const syncLayers = useCallback((z) => {
    const ls = layersRef?.current;
    if (!ls?.layerPlan || !ls?.hsacBoundariesLayer) return;
    const { layerPlan, hsacBoundariesLayer } = ls;
    const show = {
      district: z <= 9,
      tehsil:   z >= 10 && z <= 12,
      village:  z >= 13 && z <= 15,
    };
    [
      [layerPlan.districtLayerId, show.district],
      [layerPlan.tehsilLayerId,   show.tehsil  ],
      [layerPlan.villageLayerId,  show.village ],
    ].forEach(([id, visible]) => {
      if (id == null) return;
      const sub = hsacBoundariesLayer.findSublayerById?.(id);
      if (sub) sub.visible = visible;
    });
  }, [layersRef]);

  // ── Attach ArcGIS zoom watcher (retries until MapView is ready) ────────────
  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const tryAttach = () => {
      if (cancelled) return;
      const view = viewRef.current;
      if (!view) {
        retryTimer = setTimeout(tryAttach, 300);
        return;
      }
      // Sync to current map zoom immediately
      if (view.zoom != null) commitZoom(view.zoom);

      // Watch future zoom changes (fired by mouse wheel, other controls, etc.)
      watchHandleRef.current = reactiveUtils.watch(
        () => viewRef.current?.zoom,
        (z) => { if (!draggingRef.current && z != null) commitZoom(z); },
      );
    };

    tryAttach();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      watchHandleRef.current?.remove?.();
    };
  }, [viewRef, commitZoom]);

  // ── Drag / touch interaction ───────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    // Ignore right/middle mouse buttons
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();

    draggingRef.current = true;
    setDragging(true);
    dragOriginX.current    = e.touches ? e.touches[0].clientX : e.clientX;
    dragOriginZoom.current = zoomRef.current;

    let rafId = null;

    const onMove = (ev) => {
      const x  = ev.touches ? ev.touches[0].clientX : ev.clientX;
      // Drag left → positive delta → zoom increases (zooms in)
      const dz      = (dragOriginX.current - x) / TICK_SPACING / TICKS_PER_ZOOM;
      const newZoom = dragOriginZoom.current + dz;
      commitZoom(newZoom);

      // Apply zoom to the map on every animation frame so each tick step is visible
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const view = viewRef.current;
        if (!view) return;
        const z = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
        view.goTo({ zoom: z }, { animate: false }).catch(() => {});
      });
    };

    const onUp = async () => {
      if (rafId) cancelAnimationFrame(rafId);
      draggingRef.current = false;
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);

      // Apply final fractional zoom with smooth finish animation
      const finalZoom = zoomRef.current;
      await goToZoom(finalZoom);
      syncLayers(finalZoom);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  }, [commitZoom, goToZoom, syncLayers, viewRef]);

  // ── Track-position math ───────────────────────────────────────────────────
  // The tick at index (PADDING + fractionalZoomTick) sits at 50% of the tick-zone.
  // translateX = -(totalTickIndex * TICK_SPACING) moves the track left so that
  // the current-zoom tick lands exactly at the 50% pivot (defined by left: 50% in CSS).
  const fractionalTick = (zoom - MIN_ZOOM) * TICKS_PER_ZOOM;
  const trackTranslate  = -((PADDING + fractionalTick) * TICK_SPACING);

  const activeKey = getActiveKey(zoom);

  return (
    <div className="zws" role="region" aria-label="Map zoom level">

      {/* ── Centre: pointer + tick wheel + layer labels ─────────────── */}
      <div className="zws__mid">

        {/* Yellow ▼ pointer marks the current zoom position */}
        <div className="zws__pointer" aria-hidden="true" />

        {/* Scrolling tick ruler */}
        <div
          className="zws__tick-zone"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        >
          <div
            className={`zws__track${dragging ? ' is-dragging' : ''}`}
            style={{ transform: `translateX(${trackTranslate}px)` }}
            aria-hidden="true"
          >
            {Array.from({ length: ALL_TICKS }, (_, i) => {
              const ri    = i - PADDING; // position in real zoom scale (negative = padding)
              const isMaj = ri >= 0 && ri < REAL_TICKS && ri % TICKS_PER_ZOOM === 0;
              const isMid = ri >= 0 && ri < REAL_TICKS && ri % TICKS_PER_ZOOM === 4;
              const isRe  = ri >= 0 && ri < REAL_TICKS;
              return (
                <div
                  key={i}
                  className={`zws__tick${
                    isMaj ? ' major' :
                    isMid ? ' mid'   :
                    isRe  ? ' minor' :
                            ' pad'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Layer name labels with dividers */}
        <div className="zws__labels" role="list">
          {LAYERS.map((layer, idx) => (
            <span key={layer.key} className="zws__label-cell" role="listitem">
              {idx > 0 && <span className="zws__sep" aria-hidden="true" />}
              <button
                type="button"
                className={`zws__label${activeKey === layer.key ? ' is-active' : ''}`}
                aria-pressed={activeKey === layer.key}
                onClick={() => {
                  goToZoom(layer.min);
                  syncLayers(layer.min);
                }}
              >
                {layer.label}
              </button>
            </span>
          ))}
        </div>

      </div>

    </div>
  );
}
