import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js';
import { useLanguage } from '@/context/LanguageContext';
import './ZoomWheelSlider.css';

// ── Constants ─────────────────────────────────────────────────────────────────
// Keep lower bound wide enough so right-side drag can reach ~1:70,00,000 scale.
const MIN_ZOOM = 6;
const MAX_ZOOM = 19;
const TICKS_PER_ZOOM = 10;  // sub-tick marks per zoom level
const TICK_SPACING   = 9;   // px width of each tick cell (must match CSS .zws__tick width)
const PADDING        = 32;  // phantom ticks on each side so the track never runs empty
const MID_TICK_INDEX = Math.floor(TICKS_PER_ZOOM / 2); // half-step mark within each zoom unit
const REAL_TICKS     = (MAX_ZOOM - MIN_ZOOM) * TICKS_PER_ZOOM + 1; // 131
const ALL_TICKS      = PADDING * 2 + REAL_TICKS;                    // 195
const STATE_BUTTON_TARGET_SCALE = 7354296; // > 1:50,00,000 and within state-boundary visible range

const LAYERS = [
  { key: 'state',     min: 7,  max: 8.9   },
  { key: 'district',  min: 9,  max: 10.9  },
  { key: 'tehsil',    min: 11, max: 12.9 },
  { key: 'village',   min: 13, max: 16.9 },
  { key: 'cadastral', min: 17, max: 19 },
];

const formatMapScale = (scale) => {
  if (!Number.isFinite(scale) || scale <= 0) return '—';
  return `1:${Math.round(scale).toLocaleString()}`;
};

function getActiveKey(zoom) {
  return (LAYERS.find(l => zoom >= l.min && zoom <= l.max) ?? LAYERS[0]).key;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Component ─────────────────────────────────────────────────────────────────
export default function ZoomWheelSlider({
  viewRef,
  layerVisibility,
  mapScale,
  onAfterZoom,
}) {
  const { t } = useLanguage();
  const [zoom,     setZoom]     = useState(MIN_ZOOM);
  const [dragging, setDragging] = useState(false);

  const layerLabel = useCallback(
    (key) => {
      const label = t(`zoomBar.layers.${key}.label`);
      return label !== `zoomBar.layers.${key}.label` ? label : key;
    },
    [t],
  );

  const layerTitle = useCallback(
    (key) => {
      const title = t(`zoomBar.layers.${key}.title`);
      return title !== `zoomBar.layers.${key}.title` ? title : layerLabel(key);
    },
    [t, layerLabel],
  );

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
      onAfterZoom?.();
    } catch { /* navigation cancelled or view disposed */ }
  }, [viewRef, commitZoom, onAfterZoom]);

  const goToScale = useCallback(async (scale) => {
    const view = viewRef.current;
    if (!view) return;
    try {
      await view.goTo({ scale }, { duration: 360, easing: 'ease-in-out' });
      onAfterZoom?.();
    } catch { /* navigation cancelled or view disposed */ }
  }, [viewRef, onAfterZoom]);

  // UI rule: zoom slider must never auto-enable/disable map layers.
  // Operational Layer card checkboxes are the single source of truth for layer visibility.

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
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  }, [commitZoom, goToZoom, viewRef]);

  // ── Track-position math ───────────────────────────────────────────────────
  // The tick at index (PADDING + fractionalZoomTick) sits at 50% of the tick-zone.
  // translateX = -(totalTickIndex * TICK_SPACING) moves the track left so that
  // the current-zoom tick lands exactly at the 50% pivot (defined by left: 50% in CSS).
  const fractionalTick = (zoom - MIN_ZOOM) * TICKS_PER_ZOOM;
  const trackTranslate  = -((PADDING + fractionalTick) * TICK_SPACING);

  const zoomActiveKey = getActiveKey(zoom);
  const layerEnabled = {
    state: Boolean(layerVisibility?.stateBoundary),
    district: Boolean(layerVisibility?.boundariesGroup && layerVisibility?.district),
    tehsil: Boolean(layerVisibility?.boundariesGroup && layerVisibility?.tehsil),
    village: Boolean(layerVisibility?.boundariesGroup && layerVisibility?.village),
    cadastral: Boolean(layerVisibility?.cadastral),
  };
  const isStateScaleEligible = Number.isFinite(mapScale) && mapScale > 5000000;
  const isMurrabaZoomLabelEligible =
    Boolean(layerVisibility?.murrabaGrid) &&
    Boolean(layerVisibility?.murabba) &&
    Boolean(layerVisibility?.cadastral);

  const activeLayerLabel = layerLabel(zoomActiveKey);

  const tickZoneTitle = useMemo(
    () => t('zoomBar.hoverInfo', {
      level: zoom.toFixed(1),
      scale: formatMapScale(mapScale),
      layer: activeLayerLabel,
    }),
    [t, zoom, mapScale, activeLayerLabel],
  );

  return (
    <div
      className="zws"
      role="region"
      aria-label={t('zoomBar.region')}
      title={tickZoneTitle}
    >

      {/* ── Centre: pointer + tick wheel + layer labels ─────────────── */}
      <div className="zws__mid">

        {/* Yellow ▼ pointer marks the current zoom position */}
        <div className="zws__pointer" aria-hidden="true" />

        {/* Scrolling tick ruler */}
        <div
          className="zws__tick-zone"
          title={`${t('zoomBar.dragHint')} · ${tickZoneTitle}`}
          aria-label={tickZoneTitle}
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
              const isMid = ri >= 0 && ri < REAL_TICKS && ri % TICKS_PER_ZOOM === MID_TICK_INDEX;
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
                className={`zws__label${
                  layer.key === 'state'
                    ? (layerEnabled.state && isStateScaleEligible ? ' is-active' : '')
                    : layer.key === 'cadastral'
                      ? (zoomActiveKey === layer.key && isMurrabaZoomLabelEligible ? ' is-active' : '')
                    : (zoomActiveKey === layer.key && layerEnabled[layer.key] ? ' is-active' : '')
                }`}
                aria-label={layerTitle(layer.key)}
                title={layerTitle(layer.key)}
                aria-pressed={
                  layer.key === 'state'
                    ? (layerEnabled.state && isStateScaleEligible)
                    : layer.key === 'cadastral'
                      ? (zoomActiveKey === layer.key && isMurrabaZoomLabelEligible)
                    : (zoomActiveKey === layer.key && layerEnabled[layer.key])
                }
                onClick={() => {
                  if (layer.key === 'state') {
                    goToScale(STATE_BUTTON_TARGET_SCALE);
                    return;
                  }
                  goToZoom(layer.min);
                }}
              >
                {layerLabel(layer.key)}
              </button>
            </span>
          ))}
        </div>

      </div>

    </div>
  );
}
