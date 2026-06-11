/**
 * Core ArcGIS hook for the Haryana land-record portal.
 * Keeps the map wired to the migrated HSAC service stack from the legacy app.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "./useLatestRef";
import esriConfig from "@arcgis/core/config.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import Point from "@arcgis/core/geometry/Point.js";
import Graphic from "@arcgis/core/Graphic.js";
import ArcGISMap from "@arcgis/core/Map.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import * as locator from "@arcgis/core/rest/locator.js";
import * as restQuery from "@arcgis/core/rest/query.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import * as urlUtils from "@arcgis/core/core/urlUtils.js";
import Query from "@arcgis/core/rest/support/Query.js";
import {
  arcgisPortalConfig,
  DISTRICT_SUBLAYERS,
  HSAC_LAYER,
} from "@/config/arcgis";
import { HSAC_PROXY_URL, HSAC_PROXY_URL_PREFIXES } from "@/config/proxyConfig";
import { getHsacLayerPlan, getHsacLayerPlanSync } from "@/services/hsacLayerResolver";
import { getBoundaryGeometry } from "@/services/mapQueryService";
import { createParcelRecordFromMapFeature } from "@/services/parcelRecordService";
import { PARCEL_FILL_SYMBOL, BOUNDARY_FILL_SYMBOL } from "@/config/mapSymbols";
import { getRuntimeConfigValue } from "@/config/runtimeConfig";
import {
  CADASTRAL_POPUP_TEMPLATE,
  CLICK_ZOOM,
  closeLandRecordMiniPopup,
  createInstantParcelPreview,
  createLandRecordPopupContent,
  createLatLongGraphic,
  createLocationGraphic,
  createParcelGraphic,
  createPopupLoadingPreview,
  hydrateLandRecordPopupDetails,
  identifyCadastralParcelAtPoint,
  applyBoundarySublayerVisibility,
  applyCadastralSublayerVisibility,
  resolveActiveCadastralLayerIds,
  attachOptionalMapOverlay,
  loadLayerWithRetry,
  normalizeParcelGeometry,
  queryCadastralParcelAtClick,
  clearBasemapCache,
  preloadBasemapPresets,
  resolveBasemap,
  showLandRecordMiniPopup,
  syncLandRecordMiniPopup,
} from "./useArcGISMapUtils";

// React StrictMode mounts → unmounts → remounts in dev. Defer MapView teardown so the
// immediate remount can cancel it; preload basemaps so destroy does not abort #load().
let mapMountGeneration = 0;
let pendingMapTeardownTimer = null;
let lastMapView = null;

function claimMapMountSession() {
  if (pendingMapTeardownTimer !== null) {
    window.clearTimeout(pendingMapTeardownTimer);
    pendingMapTeardownTimer = null;
    if (lastMapView && !lastMapView.destroyed) {
      lastMapView.destroy();
      lastMapView = null;
    }
  }
  mapMountGeneration += 1;
  return mapMountGeneration;
}

function scheduleMapTeardown(generation, teardown) {
  if (pendingMapTeardownTimer !== null) {
    window.clearTimeout(pendingMapTeardownTimer);
  }
  pendingMapTeardownTimer = window.setTimeout(() => {
    pendingMapTeardownTimer = null;
    if (generation !== mapMountGeneration) return;
    teardown();
  }, 0);
}
import {
  geolocationMessageFromError,
  isSecureGeolocationContext,
  LOCATE_ME_ZOOM,
  USER_GEOLOCATION_OPTIONS,
  USER_LOCATION_GRAPHIC_TITLE,
} from "./userLocationGeo";

const ARCGIS_API_KEY = getRuntimeConfigValue(
  "VITE_ARCGIS_API_KEY",
  import.meta.env.VITE_ARCGIS_API_KEY,
);

const INITIAL_EXTENT_ZOOM_OUT_FACTOR = 1.142;
// Positive value pans the initial camera slightly north so the state appears lower on screen.
const INITIAL_EXTENT_VERTICAL_SHIFT_RATIO = 0.021;
// Positive value pans the initial camera slightly west so the state appears right on screen.
const INITIAL_EXTENT_HORIZONTAL_SHIFT_RATIO = 0.035;
const STATE_BOUNDARY_MIN_VISIBLE_SCALE = 7354296;
// Layer 31 service metadata limit: maxScale = 5000001.
// Below this scale (more zoomed-in), the server does not render this sublayer.
const STATE_BOUNDARY_MAX_VISIBLE_SCALE = 5000001;
const isScaleInRange = (scale, minScale, maxScale) =>
  Number.isFinite(scale) && scale <= minScale && scale >= maxScale;

const getEffectiveLayerVisibility = (layerVisibility = {}) => {
  const boundariesGroup = Boolean(layerVisibility.boundariesGroup);
  const cadastral = Boolean(layerVisibility.cadastral);
  const nearbyPlaces = Boolean(layerVisibility.nearbyPlaces);
  const poi = Boolean(layerVisibility.poi);
  const murrabaGrid = Boolean(layerVisibility.murrabaGrid);
  const murabba = Boolean(layerVisibility.murabba);

  return {
    cadastral,
    kanalMarla: Boolean(layerVisibility.kanalMarla),
    nearbyPlacesPoi: nearbyPlaces && poi,
    district: boundariesGroup && Boolean(layerVisibility.district),
    tehsil: boundariesGroup && Boolean(layerVisibility.tehsil),
    village: boundariesGroup && Boolean(layerVisibility.village),
    murraba: murrabaGrid && murabba,
    stateBoundary: Boolean(layerVisibility.stateBoundary),
    assets: Boolean(layerVisibility.assets),
    nhai: Boolean(layerVisibility.nhai),
    roads: Boolean(layerVisibility.roads),
  };
};

const BOUNDARY_SELECTION_PADDING = {
  left: 36,
  right: 36,
  top: 36,
  bottom: 36,
};
const DRAWING_BLOCK_STALE_MS = 45000;
const CADASTRAL_EXTENT_SYNC_DEBOUNCE_MS = 450;
/** ~800 m in WGS84 — skip cadastral re-identify when the view center barely moved. */
const CADASTRAL_SYNC_CENTER_EPSILON = 0.008;

const findSublayerById = (layer, id) =>
  layer?.findSublayerById?.(id) ?? layer?.findSublayerById?.(String(id));

const shiftExtentVertically = (extent, shiftRatio = 0) => {
  if (!extent || !Number.isFinite(shiftRatio) || shiftRatio === 0) return extent;
  const height = extent.ymax - extent.ymin;
  if (!Number.isFinite(height) || height <= 0) return extent;

  const yOffset = height * shiftRatio;
  return new Extent({
    xmin: extent.xmin,
    ymin: extent.ymin + yOffset,
    xmax: extent.xmax,
    ymax: extent.ymax + yOffset,
    spatialReference: extent.spatialReference,
  });
};

const shiftExtentHorizontally = (extent, shiftRatio = 0) => {
  if (!extent || !Number.isFinite(shiftRatio) || shiftRatio === 0) return extent;
  const width = extent.xmax - extent.xmin;
  if (!Number.isFinite(width) || width <= 0) return extent;

  const xOffset = width * shiftRatio;
  return new Extent({
    xmin: extent.xmin - xOffset,
    ymin: extent.ymin,
    xmax: extent.xmax - xOffset,
    ymax: extent.ymax,
    spatialReference: extent.spatialReference,
  });
};

const syncStateBoundaryAndNearbyPlacesVisibility = ({
  layers,
  effective,
  currentScale,
}) => {
  const shouldShowStateBoundary =
    effective.stateBoundary &&
    isScaleInRange(
      currentScale,
      STATE_BOUNDARY_MIN_VISIBLE_SCALE,
      STATE_BOUNDARY_MAX_VISIBLE_SCALE,
    );

  const isUnifiedHsac =
    Boolean(layers.hsacMainLayer) &&
    layers.hsacStateBoundaryLayer === layers.hsacMainLayer;

  if (layers.hsacStateBoundaryLayer) {
    // Unified HSAC layer keeps parent visible; only sublayer visibility toggles export.
    if (!isUnifiedHsac) {
      layers.hsacStateBoundaryLayer.visible = shouldShowStateBoundary;
    }
    const stateSublayer = findSublayerById(layers.hsacStateBoundaryLayer, HSAC_LAYER.STATE_BOUNDARY);
    if (stateSublayer) {
      stateSublayer.visible = shouldShowStateBoundary;
    } else if (import.meta.env.DEV) {
      console.warn("[useArcGISMap] Missing state boundary sublayer (id 31).");
    }
  }

  if (layers.nearbyPlacesLayer) {
    if (!isUnifiedHsac) {
      layers.nearbyPlacesLayer.visible = effective.nearbyPlacesPoi;
    }
    const poiSublayer = findSublayerById(layers.nearbyPlacesLayer, HSAC_LAYER.POI);
    if (poiSublayer) {
      poiSublayer.visible = effective.nearbyPlacesPoi;
    } else if (import.meta.env.DEV) {
      console.warn("[useArcGISMap] Missing POI sublayer (id 24) in Nearby Places layer.");
    }
  }
};

/** Refresh visible MapImageLayers — deduped; extent changes already re-export tiles. */
export const refreshVisibleHsacMapImageLayers = (layers, { only = null } = {}) => {
  if (!layers) return;
  const targets = only ?? [
    layers.hsacMainLayer,
    layers.kanalMarlaLayer,
    layers.governmentAssetsLayer,
    layers.nhaiLayer,
    layers.roadsLayer,
  ];
  const list = Array.isArray(only) ? only : targets;
  [...new Set(list.filter((layer) => layer?.visible))].forEach((layer) => {
    layer.refresh?.();
  });
};

export function useArcGISMap({
  activeBasemap,
  layerVisibility,
  selectedParcel,
  onParcelSelect,
  onPreviewFullDetails,
}) {
  const containerRef         = useRef(null);
  const viewRef              = useRef(null);
  const defaultExtentRef     = useRef(null);
  const layersRef            = useRef({});
  const popupStateRef        = useRef({ host: null, popupElement: null, anchorPoint: null, frameId: 0 });
  const onParcelSelectRef       = useLatestRef(onParcelSelect);
  const selectedParcelRef       = useLatestRef(selectedParcel);
  const onPreviewFullDetailsRef = useLatestRef(onPreviewFullDetails);
  const layerVisibilityRef       = useLatestRef(layerVisibility);
  const activeCadastralIdsRef    = useRef(null);
  const cadastralSyncAnchorRef   = useRef(null);
  const userLocationRef          = useRef(null);
  const userLocationWatchIdRef   = useRef(null);
  const userLocationErrorRef     = useRef(null);

  const syncUserLocationDot = useCallback((coords) => {
    userLocationRef.current = {
      longitude: coords.longitude,
      latitude: coords.latitude,
      accuracy: coords.accuracy ?? null,
    };
    userLocationErrorRef.current = null;

    const layer = layersRef.current.userLocationLayer;
    if (!layer) return;

    const point = new Point({
      longitude: coords.longitude,
      latitude: coords.latitude,
    });
    layer.removeAll();
    layer.add(createLocationGraphic(point, USER_LOCATION_GRAPHIC_TITLE));
  }, []);

  const stopUserLocationWatch = useCallback(() => {
    if (userLocationWatchIdRef.current == null) return;
    navigator.geolocation.clearWatch(userLocationWatchIdRef.current);
    userLocationWatchIdRef.current = null;
  }, []);

  const startUserLocationWatch = useCallback(() => {
    if (!navigator.geolocation || !isSecureGeolocationContext()) return;
    if (userLocationWatchIdRef.current != null) return;

    const onPosition = (position) => {
      syncUserLocationDot(position.coords);
    };

    const onError = (err) => {
      userLocationErrorRef.current = geolocationMessageFromError(err);
    };

    navigator.geolocation.getCurrentPosition(onPosition, onError, USER_GEOLOCATION_OPTIONS);

    userLocationWatchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      USER_GEOLOCATION_OPTIONS,
    );
  }, [syncUserLocationDot]);

  const [mapReady,     setMapReady]     = useState(false);
  const [mapStatus,    setMapStatus]    = useState("Initialising Haryana land-record map…");
  const [mapScale,     setMapScale]     = useState(null);
  const [pointerCoords, setPointerCoords] = useState(null);
  const [serviceHealth, setServiceHealth] = useState({
    cadastral:  "loading",
    boundaries: "loading",
    assets:     "loading",
  });
  // ── Map initialisation (runs once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const mountGeneration = claimMapMountSession();

    if (ARCGIS_API_KEY) {
      esriConfig.apiKey = ARCGIS_API_KEY;
    }
    if (HSAC_PROXY_URL) {
      HSAC_PROXY_URL_PREFIXES.forEach((urlPrefix) => {
        const existingRule = urlUtils.getProxyRule(urlPrefix);
        if (existingRule?.urlPrefix === urlPrefix) return;

        urlUtils.addProxyRule({
          urlPrefix,
          proxyUrl: HSAC_PROXY_URL,
        });
      });
    }

    // Trackpad pinch dispatches wheel events with ctrlKey=true (Chrome/Edge/Firefox)
    // or gesture* events (Safari). The browser turns these into full-page zoom unless
    // we prevent the default over the map. The map's own zoom handlers still run.
    const mapContainerEl = containerRef.current;
    const blockPageWheelZoom = (event) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const blockPageGestureZoom = (event) => {
      event.preventDefault();
    };
    mapContainerEl.addEventListener("wheel", blockPageWheelZoom, { passive: false });
    mapContainerEl.addEventListener("gesturestart", blockPageGestureZoom, { passive: false });
    mapContainerEl.addEventListener("gesturechange", blockPageGestureZoom, { passive: false });
    mapContainerEl.addEventListener("gestureend", blockPageGestureZoom, { passive: false });

    const defaultExtent = new Extent(arcgisPortalConfig.defaultExtent);
    const initialExtent = shiftExtentHorizontally(
      shiftExtentVertically(
        defaultExtent.clone().expand(INITIAL_EXTENT_ZOOM_OUT_FACTOR),
        INITIAL_EXTENT_VERTICAL_SHIFT_RATIO,
      ),
      INITIAL_EXTENT_HORIZONTAL_SHIFT_RATIO,
    );
    defaultExtentRef.current = initialExtent.clone();

    const updateHealth = (key, value) =>
      setServiceHealth((cur) => ({ ...cur, [key]: value }));
    let popupExtentHandle;
    let popupResizeHandle;
    let clickHandle;
    let zoomWatchHandle;
    let pointerMoveHandle;
    let pointerLeaveHandle;
    let cadastralExtentSyncTimer = null;
    let cadastralExtentSyncInFlight = false;
    let view;
    let isDisposed = false;

    const initialiseMap = async () => {
      await preloadBasemapPresets([activeBasemap]);
      const layerPlan = getHsacLayerPlanSync();
      void getHsacLayerPlan();
      if (isDisposed || !containerRef.current) {
        return;
      }

      const effective = getEffectiveLayerVisibility(layerVisibility);
      const boundaryCandidates = [
        { id: layerPlan.murabbaLayerId, title: "Murabba", visible: false },
        { id: layerPlan.villageLayerId, title: "Village", visible: false },
        { id: layerPlan.tehsilLayerId, title: "Tehsil", visible: false },
        { id: layerPlan.districtLayerId, title: "District", visible: false },
      ];

      // In fallback mode multiple logical boundaries can point to the same layer ID.
      // Merge those entries so visibility is OR'ed instead of keeping the first one.
      const boundaryById = new Map();
      boundaryCandidates.forEach((candidate) => {
        const existing = boundaryById.get(candidate.id);
        if (!existing) {
          boundaryById.set(candidate.id, { ...candidate });
          return;
        }

        boundaryById.set(candidate.id, {
          ...existing,
          visible: existing.visible || candidate.visible,
          title: candidate.visible ? candidate.title : existing.title,
        });
      });

      const boundarySublayers = Array.from(boundaryById.values());

      const cadastralSublayers = layerPlan.cadastralLayerIds.map((id) => {
        const district = DISTRICT_SUBLAYERS.find((entry) => entry.id === id);
        return {
          id,
          title: district?.name || `Layer ${id}`,
          // District sublayers are enabled by extent sync — not all 23 at once on first export.
          visible: false,
          minScale: 0,
          maxScale: 0,
          popupTemplate: CADASTRAL_POPUP_TEMPLATE,
        };
      });

      const hsacMainLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.hsacMain,
        title: "HSAC EODB",
        visible: true,
        sublayers: [
          ...boundarySublayers,
          ...cadastralSublayers,
          {
            id: HSAC_LAYER.STATE_BOUNDARY,
            title: "Haryana State Boundary",
            visible: false,
            minScale: 0,
            maxScale: 0,
            renderer: {
              type: "simple",
              symbol: {
                type: "simple-fill",
                color: [130, 130, 130, 0],
                outline: {
                  type: "simple-line",
                  color: [255, 255, 0, 1],
                  width: 3,
                },
              },
            },
          },
          {
            id: HSAC_LAYER.POI,
            title: "POI",
            visible: false,
          },
        ],
      });

      // Single MapImageLayer for hsacMain — one metadata load / export pipeline (was 4 layers).
      const hsacBoundariesLayer = hsacMainLayer;
      const hsacCadastralLayer = hsacMainLayer;
      const hsacStateBoundaryLayer = hsacMainLayer;
      const nearbyPlacesLayer = hsacMainLayer;

      const kanalMarlaLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.kanalMarla,
        title: "Kanal Marla",
        visible: effective.kanalMarla,
      });

      const governmentAssetsLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.governmentAssets,
        title: "Government Assets",
        visible: effective.assets,
      });

      const nhaiLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.nhaiRoads,
        title: "NHAI (Upcoming)",
        visible: effective.nhai,
      });

      const roadsLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.haryanaRoads,
        title: "HR Road Infra",
        visible: effective.roads,
      });

      const boundaryLayer = new GraphicsLayer({ title: "Boundary selection", listMode: "hide" });
      const highlightLayer = new GraphicsLayer({
        title: "Selected land information",
        listMode: "hide",
        visible: false,
      });
      const locationLayer   = new GraphicsLayer({ title: "Location search",    listMode: "hide" });
      const userLocationLayer = new GraphicsLayer({ title: "Your location", listMode: "hide" });
      const selectionLayer  = new GraphicsLayer({ title: "Feature selection",  listMode: "hide" });

      const map = new ArcGISMap({
        basemap: resolveBasemap(activeBasemap),
      });

      map.addMany([
        hsacMainLayer,
        locationLayer,
        boundaryLayer,
        selectionLayer,
        highlightLayer,
        userLocationLayer,
      ]);

      view = new MapView({
        container: containerRef.current,
        map,
        extent: initialExtent.clone(),
        constraints: { minZoom: 6, snapToZoom: false, rotationEnabled: true },
        navigation: { mouseWheelZoomEnabled: false, browserTouchPanEnabled: true },
        popup: {
          dockEnabled: false,
          collapseEnabled: false,
          actions: [],
          visibleElements: {
            actionBar: false,
            closeButton: false,
            collapseButton: false,
            featureNavigation: false,
            featureListLayerTitle: false,
            featureMenuHeading: false,
            heading: false,
          },
          viewModel: {
            includeDefaultActions: false,
          },
        },
        ui: {
          components: [],
        },
        attributionEnabled: false,
      });
      view.popupEnabled = false;
      lastMapView = view;

      const popupHost = document.createElement("div");
      popupHost.className = "map-click-popup-host";
      containerRef.current.append(popupHost);
      popupStateRef.current.host = popupHost;

      view.when(() => {
        if (isDisposed) return;

        viewRef.current = view;
        layersRef.current = {
          map,
          layerPlan,
          hsacMainLayer,
          hsacBoundariesLayer,
          hsacStateBoundaryLayer,
          hsacCadastralLayer,
          kanalMarlaLayer,
          nearbyPlacesLayer,
          governmentAssetsLayer,
          nhaiLayer,
          roadsLayer,
          boundaryLayer,
          selectionLayer,
          highlightLayer,
          locationLayer,
          userLocationLayer,
        };

        setMapStatus("Haryana map ready. Verifying layer connectivity…");

        const markMapReady = () => {
          if (!isDisposed) setMapReady(true);
        };
        try {
          const baseLayer = map.basemap?.baseLayers?.getItemAt(0);
          if (baseLayer && typeof view.whenLayerView === "function") {
            view.whenLayerView(baseLayer).then(markMapReady).catch(markMapReady);
          } else {
            markMapReady();
          }
        } catch {
          markMapReady();
        }

        startUserLocationWatch();

        const syncLayerVisibilityForScale = () => {
          const layers = layersRef.current;
          if (!layers?.map || !view) return;
          const effective = getEffectiveLayerVisibility(layerVisibilityRef.current);
          syncStateBoundaryAndNearbyPlacesVisibility({
            layers,
            effective,
            currentScale: view.scale,
          });
        };

        const syncCadastralDistrictsForView = async () => {
          if (isDisposed || cadastralExtentSyncInFlight) return;
          const layers = layersRef.current;
          if (!layers?.map || !view) return;

          const effective = getEffectiveLayerVisibility(layerVisibilityRef.current);
          const zoom = view.zoom ?? 0;
          if (!effective.cadastral || zoom <= CLICK_ZOOM.VILLAGE_MAX) return;

          const center = view.center;
          const anchor = cadastralSyncAnchorRef.current;
          if (
            activeCadastralIdsRef.current?.length &&
            anchor &&
            anchor.zoom === zoom &&
            center &&
            Math.abs(anchor.x - center.x) < CADASTRAL_SYNC_CENTER_EPSILON &&
            Math.abs(anchor.y - center.y) < CADASTRAL_SYNC_CENTER_EPSILON
          ) {
            return;
          }

          cadastralExtentSyncInFlight = true;
          try {
            let activeIds = await resolveActiveCadastralLayerIds(view, layers.layerPlan);
            if (isDisposed) return;

            if (center) {
              cadastralSyncAnchorRef.current = { x: center.x, y: center.y, zoom };
            }

            if (!activeIds?.length) {
              const plan = layers.layerPlan;
              const toggledOn = (plan?.cadastralLayerIds ?? []).filter(
                (id) => layerVisibilityRef.current[`cadastral_${id}`] ?? true,
              );
              activeIds = toggledOn.length ? [toggledOn[0]] : plan?.cadastralLayerIds?.slice(0, 1) ?? null;
            }

            activeCadastralIdsRef.current = activeIds;

            const changed = applyCadastralSublayerVisibility({
              layers,
              layerVisibility: layerVisibilityRef.current,
              cadastralEnabled: effective.cadastral,
              activeCadastralIds: activeIds,
            });

            if (changed) {
              refreshVisibleHsacMapImageLayers(layers, {
                only: [layers.hsacMainLayer],
              });
            }
          } finally {
            cadastralExtentSyncInFlight = false;
          }
        };

        const scheduleCadastralExtentSync = () => {
          clearTimeout(cadastralExtentSyncTimer);
          cadastralExtentSyncTimer = setTimeout(() => {
            if (!isDisposed) void syncCadastralDistrictsForView();
          }, CADASTRAL_EXTENT_SYNC_DEBOUNCE_MS);
        };
        layersRef.current.scheduleCadastralExtentSync = scheduleCadastralExtentSync;

        // Slower, smoother mouse-wheel zoom at the cursor (small fractional steps + animation).
        const MOUSE_WHEEL_ZOOM_STEP = 0.10;
        const MOUSE_WHEEL_ZOOM_DURATION_MS = 0;
        let wheelTargetZoom = null;
        let wheelAnchorMap = null;
        let wheelAnimating = false;
        const runWheelZoom = () => {
          if (wheelTargetZoom == null) {
            wheelAnimating = false;
            return;
          }
          wheelAnimating = true;
          const nextZoom = wheelTargetZoom;
          const center = view.center;
          let target = { zoom: nextZoom };
          if (wheelAnchorMap && center) {
            const factor = 2 ** (view.zoom - nextZoom);
            target = {
              zoom: nextZoom,
              center: new Point({
                x: wheelAnchorMap.x + (center.x - wheelAnchorMap.x) * factor,
                y: wheelAnchorMap.y + (center.y - wheelAnchorMap.y) * factor,
                spatialReference: center.spatialReference,
              }),
            };
          }
          view
            .goTo(target, {
              animate: true,
              duration: MOUSE_WHEEL_ZOOM_DURATION_MS,
              easing: "ease-out",
            })
            .catch(() => {})
            .finally(() => {
              if (wheelTargetZoom === nextZoom) wheelTargetZoom = null;
              syncLayerVisibilityForScale();
              scheduleCadastralExtentSync();
              runWheelZoom();
            });
        };
        view.on("mouse-wheel", (event) => {
          event.stopPropagation();
          if (isDisposed) return;
          const direction = event.deltaY > 0 ? -1 : 1;
          wheelAnchorMap = view.toMap({ x: event.x, y: event.y });
          const base = wheelTargetZoom ?? view.zoom;
          wheelTargetZoom = base + direction * MOUSE_WHEEL_ZOOM_STEP;
          if (!wheelAnimating) runWheelZoom();
        });

        // Live cursor latitude / longitude — throttled to one update per animation frame.
        let pointerFrame = null;
        let pendingScreenPoint = null;
        const flushPointerCoords = () => {
          pointerFrame = null;
          if (isDisposed || !pendingScreenPoint) return;
          const mapPoint = view.toMap(pendingScreenPoint);
          if (mapPoint && Number.isFinite(mapPoint.latitude) && Number.isFinite(mapPoint.longitude)) {
            setPointerCoords({ latitude: mapPoint.latitude, longitude: mapPoint.longitude });
          }
        };
        pointerMoveHandle = view.on("pointer-move", (event) => {
          if (isDisposed) return;
          pendingScreenPoint = { x: event.x, y: event.y };
          if (pointerFrame == null) {
            pointerFrame = requestAnimationFrame(flushPointerCoords);
          }
        });
        pointerLeaveHandle = view.on("pointer-leave", () => {
          if (pointerFrame != null) {
            cancelAnimationFrame(pointerFrame);
            pointerFrame = null;
          }
          pendingScreenPoint = null;
          if (!isDisposed) setPointerCoords(null);
        });

        // Live scale ratio — MapImageLayer re-exports on extent change; no manual refresh here.
        reactiveUtils.watch(
          () => view.scale,
          (newScale) => {
            if (!isDisposed) setMapScale(newScale);
            syncLayerVisibilityForScale();
          },
          { initial: true },
        );

        reactiveUtils.watch(
          () => view.stationary,
          (stationary) => {
            if (isDisposed || !stationary) return;
            syncLayerVisibilityForScale();
            scheduleCadastralExtentSync();
          },
        );

        const syncBoundaryLayersForZoom = (zoom) => {
          applyBoundarySublayerVisibility({
            layers: layersRef.current,
            layerVisibility: layerVisibilityRef.current,
            zoom,
          });
        };

        // Zoom-based cadastral visibility — hide cadastral when zoomed out past village level.
        zoomWatchHandle = reactiveUtils.watch(
          () => view.zoom,
          (zoom) => {
            if (isDisposed) return;
            const lyr = layersRef.current;
            syncBoundaryLayersForZoom(zoom);

            const effectiveState = getEffectiveLayerVisibility(layerVisibilityRef.current);
            const shouldShow = effectiveState.cadastral && zoom > CLICK_ZOOM.VILLAGE_MAX;
            if (lyr.highlightLayer) lyr.highlightLayer.visible = shouldShow;

            if (!shouldShow) {
              activeCadastralIdsRef.current = null;
              cadastralSyncAnchorRef.current = null;
              applyCadastralSublayerVisibility({
                layers: lyr,
                layerVisibility: layerVisibilityRef.current,
                cadastralEnabled: false,
                activeCadastralIds: null,
              });
            } else {
              scheduleCadastralExtentSync();
            }
          },
          { initial: true },
        );

        const LAYER_HEALTH_CHECK_DELAY_MS = 3000;
        setTimeout(() => {
          if (isDisposed) return;
          void (async () => {
          const hsacMainLoad = await loadLayerWithRetry(hsacMainLayer, {
            label: "HSAC main layer",
          });

          if (isDisposed) return;

          updateHealth("boundaries", hsacMainLoad.ok ? "connected" : "degraded");
          updateHealth("cadastral", hsacMainLoad.ok ? "connected" : "degraded");

          const effectiveOverlays = getEffectiveLayerVisibility(layerVisibilityRef.current);
          const optionalTasks = [];
          if (effectiveOverlays.assets) {
            optionalTasks.push(
              attachOptionalMapOverlay(map, governmentAssetsLayer, { label: "Government Assets layer" }),
            );
          }
          if (effectiveOverlays.kanalMarla) {
            optionalTasks.push(
              attachOptionalMapOverlay(map, kanalMarlaLayer, { label: "Kanal Marla layer" }),
            );
          }
          if (effectiveOverlays.nhai) {
            optionalTasks.push(
              attachOptionalMapOverlay(map, nhaiLayer, { label: "NHAI layer" }),
            );
          }
          if (effectiveOverlays.roads) {
            optionalTasks.push(
              attachOptionalMapOverlay(map, roadsLayer, { label: "Haryana Roads layer" }),
            );
          }

          const optionalResults = optionalTasks.length
            ? await Promise.all(optionalTasks)
            : [];

          if (isDisposed) return;

          const assetsHealthy = !effectiveOverlays.assets || optionalResults.some((result) => result?.ok);
          updateHealth("assets", assetsHealthy ? "connected" : "degraded");

          const coreLayerHealthy = hsacMainLoad.ok;
          if (!coreLayerHealthy) {
            setMapStatus(
              "HSAC map loaded with limited connectivity. Core services will auto-recover when available.",
            );
            return;
          }

          const optionalFailed = optionalResults.some((result) => result && !result.skipped && !result.ok);
          if (optionalFailed) {
            setMapStatus(
              layerPlan.usesFallback
                ? "HSAC map loaded with dynamic layer fallback. Some optional overlays are unavailable."
                : "HSAC Haryana map is live. Some optional overlays are unavailable.",
            );
            return;
          }

          setMapStatus(
            layerPlan.usesFallback
              ? "HSAC map loaded with dynamic layer fallback."
              : "HSAC Haryana map is live with district / tehsil / village boundaries.",
          );
          })();
        }, LAYER_HEALTH_CHECK_DELAY_MS);
      }).catch(() => {
        if (isDisposed) return;
        setMapReady(false);
        setMapStatus("ArcGIS map initialization failed. Please refresh and try again.");
      });

      popupExtentHandle = reactiveUtils.watch(() => view.extent, () => {
        syncLandRecordMiniPopup({ popupStateRef, view });
      });
      popupResizeHandle = view.on("resize", () => {
        syncLandRecordMiniPopup({ popupStateRef, view });
      });

      let boundaryQueryCounter = 0;
      let cadastralPopupRequestCounter = 0;

      const getBoundarySelectionCandidates = (currentLayers, zoom) => {
        const effective = getEffectiveLayerVisibility(layerVisibilityRef.current);
        const layerPlan = currentLayers?.layerPlan;

        const allCandidates = [
          { key: "village", id: layerPlan?.villageLayerId, enabled: effective.village },
          { key: "tehsil", id: layerPlan?.tehsilLayerId, enabled: effective.tehsil },
          { key: "district", id: layerPlan?.districtLayerId, enabled: effective.district },
        ].filter(({ id, enabled }) => id != null && enabled);

        let preferredKey = null;
        if (zoom <= CLICK_ZOOM.DISTRICT_MAX) preferredKey = "district";
        else if (zoom <= CLICK_ZOOM.TEHSIL_MAX) preferredKey = "tehsil";
        else if (zoom <= CLICK_ZOOM.VILLAGE_MAX) preferredKey = "village";

        // In cadastral zoom zone, boundary click-selection must stay disabled.
        if (!preferredKey) return [];

        const preferred = allCandidates.filter((entry) => entry.key === preferredKey);
        const fallback = allCandidates.filter((entry) => entry.key !== preferredKey);
        return [...preferred, ...fallback];
      };

      const getBoundaryHitResult = ({ hitTestResponse, boundaryLayerIds }) =>
        hitTestResponse?.results?.find((result) => {
          const sourceLayerId = Number(result?.graphic?.sourceLayer?.id);
          if (sourceLayerId == null || !boundaryLayerIds.has(sourceLayerId)) return false;
          return result?.graphic?.geometry != null;
        });

      const queryBoundaryFeatureAtPoint = async ({
        mapPoint,
        orderedLayerIds,
        spatialReference,
      }) => {
        for (const layerId of orderedLayerIds) {
          const result = await restQuery
            .executeQueryJSON(
              `${arcgisPortalConfig.serviceUrls.hsacMain}/${layerId}`,
              new Query({
                geometry: mapPoint,
                spatialRelationship: "intersects",
                returnGeometry: true,
                outFields: ["*"],
                distance: 8,
                units: "meters",
                outSpatialReference: spatialReference,
                num: 1,
              }),
            )
            .catch(() => null);

          const feature = result?.features?.[0];
          if (feature?.geometry) {
            return feature;
          }
        }

        return null;
      };

      clickHandle = view.on("click", async (event) => {
        const currentLayers = layersRef.current;
        const now = Date.now();
        const selectionFlagStale =
          Boolean(currentLayers?.__selectionDrawing) &&
          Number.isFinite(currentLayers?.__selectionDrawingSince) &&
          now - currentLayers.__selectionDrawingSince > DRAWING_BLOCK_STALE_MS;
        const measurementFlagStale =
          Boolean(currentLayers?.__measurementDrawing) &&
          Number.isFinite(currentLayers?.__measurementDrawingSince) &&
          now - currentLayers.__measurementDrawingSince > DRAWING_BLOCK_STALE_MS;

        if (selectionFlagStale) {
          currentLayers.__selectionDrawing = false;
          currentLayers.__selectionDrawingSince = null;
        }
        if (measurementFlagStale) {
          currentLayers.__measurementDrawing = false;
          currentLayers.__measurementDrawingSince = null;
        }

        if (currentLayers?.__selectionDrawing || currentLayers?.__measurementDrawing) {
          return;
        }

        // Clear the previous boundary highlight and any open popup on every click
        currentLayers.selectionLayer?.removeAll();
        closeLandRecordMiniPopup(popupStateRef);
        view.closePopup();

        const zoom = Math.round(view.zoom);
        const selectableBoundaries = getBoundarySelectionCandidates(currentLayers, zoom);
        if (
          zoom <= CLICK_ZOOM.VILLAGE_MAX &&
          selectableBoundaries.length > 0
        ) {
          const queryId = ++boundaryQueryCounter;
          const boundaryHitTest = await view
            .hitTest(event, { include: [currentLayers.hsacBoundariesLayer] })
            .catch(() => null);

          if (boundaryQueryCounter !== queryId) return;

          const isBoundarySublayerVisible = (id) => {
            const sublayer = findSublayerById(currentLayers.hsacBoundariesLayer, id);
            return Boolean(sublayer && sublayer.visible !== false);
          };
          const boundaryLayerIds = new Set(
            selectableBoundaries
              .filter(({ id }) => isBoundarySublayerVisible(id))
              .map(({ id }) => Number(id)),
          );

          if (boundaryLayerIds.size > 0) {
            const boundaryHit = getBoundaryHitResult({
              hitTestResponse: boundaryHitTest,
              boundaryLayerIds,
            });
            let boundaryGeometry = boundaryHit?.graphic?.geometry;

            if (!boundaryGeometry) {
              const orderedLayerIds = selectableBoundaries
                .map(({ id }) => Number(id))
                .filter((id) => boundaryLayerIds.has(id));

              const queriedFeature = await queryBoundaryFeatureAtPoint({
                mapPoint: event.mapPoint,
                orderedLayerIds,
                spatialReference: view.spatialReference,
              });
              if (boundaryQueryCounter !== queryId) return;
              boundaryGeometry = queriedFeature?.geometry ?? null;
            }

            if (boundaryGeometry) {
              currentLayers.selectionLayer?.add(
                new Graphic({ geometry: boundaryGeometry, symbol: BOUNDARY_FILL_SYMBOL }),
              );

              const extent = boundaryGeometry.extent;
              if (extent) {
                await view
                  .goTo(
                    { target: extent.expand(1.2) },
                    { duration: 820, easing: "ease-in-out", padding: BOUNDARY_SELECTION_PADDING },
                  )
                  .catch(() => undefined);
              }
              return;
            }
          }
        }

        // Cadastral zone (zoom > VILLAGE_MAX): show popup only when cadastral is enabled at this zoom
        const cadastralEffective = getEffectiveLayerVisibility(layerVisibilityRef.current);
        if (!cadastralEffective.cadastral || zoom <= CLICK_ZOOM.VILLAGE_MAX) return;
        const popupRequestId = ++cadastralPopupRequestCounter;

        const loadingPopup = createLandRecordPopupContent({
          // Start the loading popup blank ("--") instead of inheriting the previously
          // selected parcel, so a new click never shows the old record while loading.
          parcel: createPopupLoadingPreview(null, event.mapPoint),
          onClose: () => closeLandRecordMiniPopup(popupStateRef),
          onViewFullDetails: () => onPreviewFullDetailsRef.current?.(selectedParcelRef.current),
        });
        showLandRecordMiniPopup({
          popupStateRef,
          popupElement: loadingPopup.content,
          anchorPoint: event.mapPoint,
          screenPoint: { x: event.x, y: event.y },
        });

        const response = await view.hitTest(event).catch(() => null);

        const hit = response?.results?.find((r) => r.graphic?.layer === highlightLayer);
        let cadastralHit = response?.results?.find(
          (r) => r.graphic?.attributes?.n_khas_no || r.graphic?.attributes?.n_v_name,
        );

        if (!cadastralHit) {
          // Identify resolves the parcel across all cadastral sublayers in a single
          // request. Only fall back to the per-layer query loop when identify finds
          // nothing, so the slow sequential queries no longer run on every click.
          let resolvedFeature = await identifyCadastralParcelAtPoint({
            view,
            layers: currentLayers,
            mapPoint: event.mapPoint,
          });
          if (!resolvedFeature) {
            resolvedFeature = await queryCadastralParcelAtClick({ view, layers: currentLayers, event });
          }
          if (resolvedFeature) {
            cadastralHit = { graphic: resolvedFeature };
          }
        }

        if (!cadastralHit && !hit) {
          closeLandRecordMiniPopup(popupStateRef);
          return;
        }

        const targetGeometry =
          cadastralHit?.graphic?.geometry ??
          hit?.graphic?.geometry ??
          normalizeParcelGeometry(selectedParcelRef.current?.geometry);

        const quickPreviewRecord = createInstantParcelPreview({
          attributes: cadastralHit?.graphic?.attributes,
          geometry: targetGeometry,
          // No fallback to the previous parcel: fields not present in the clicked
          // feature (owner name, area, jamabandi…) show "--"/"Loading" instead of
          // the old record's values until the full details resolve.
          fallbackParcel: null,
        });

        if (!quickPreviewRecord) {
          setMapStatus("No land record preview is available for this map click.");
          return;
        }

        onParcelSelectRef.current?.(quickPreviewRecord, { openTable: false });
        hydrateLandRecordPopupDetails(popupStateRef.current?.popupElement, quickPreviewRecord, { keepLoading: true });
        setMapStatus(`Land record popup opened for Khasra ${quickPreviewRecord.khasraNo}. Loading full details...`);

        createParcelRecordFromMapFeature({
          attributes: cadastralHit?.graphic?.attributes,
          geometry: targetGeometry,
          fallbackParcel: quickPreviewRecord,
        })
          .then((fullPreviewRecord) => {
            if (!fullPreviewRecord || popupRequestId !== cadastralPopupRequestCounter) return;

            onParcelSelectRef.current?.(fullPreviewRecord, { openTable: false });
            hydrateLandRecordPopupDetails(popupStateRef.current?.popupElement, fullPreviewRecord);
            setMapStatus(`Land record popup opened for Khasra ${fullPreviewRecord.khasraNo}.`);
          })
          .catch(() => undefined);
      });
    };

    void initialiseMap();

    return () => {
      isDisposed = true;
      const viewToDestroy = view;
      scheduleMapTeardown(mountGeneration, () => {
        clearTimeout(cadastralExtentSyncTimer);
        mapContainerEl.removeEventListener("wheel", blockPageWheelZoom);
        mapContainerEl.removeEventListener("gesturestart", blockPageGestureZoom);
        mapContainerEl.removeEventListener("gesturechange", blockPageGestureZoom);
        mapContainerEl.removeEventListener("gestureend", blockPageGestureZoom);
        stopUserLocationWatch();
        userLocationRef.current = null;
        userLocationErrorRef.current = null;
        layersRef.current = {};
        viewRef.current = null;
        setMapReady(false);
        closeLandRecordMiniPopup(popupStateRef);
        popupExtentHandle?.remove?.();
        popupResizeHandle?.remove?.();
        clickHandle?.remove?.();
        zoomWatchHandle?.remove?.();
        pointerMoveHandle?.remove?.();
        pointerLeaveHandle?.remove?.();
        popupStateRef.current.host?.remove();
        popupStateRef.current.host = null;
        viewToDestroy?.destroy?.();
        if (lastMapView === viewToDestroy) {
          lastMapView = null;
        }
        clearBasemapCache();
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layer visibility + basemap sync ─────────────────────────────────────────
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers.map) return;

    layers.map.basemap = resolveBasemap(activeBasemap);
    const effective = getEffectiveLayerVisibility(layerVisibility);

    const boundaryChanged = applyBoundarySublayerVisibility({
      layers,
      layerVisibility,
      zoom: viewRef.current?.zoom,
    });
    if (boundaryChanged) {
      refreshVisibleHsacMapImageLayers(layers, {
        only: [layers.hsacMainLayer],
      });
    }
    syncStateBoundaryAndNearbyPlacesVisibility({
      layers,
      effective,
      currentScale: viewRef.current?.scale,
    });

    const currentZoom = viewRef.current?.zoom;
    const cadastralVisible = effective.cadastral && (currentZoom == null || currentZoom > CLICK_ZOOM.VILLAGE_MAX);
    if (layers.highlightLayer) layers.highlightLayer.visible = cadastralVisible;
    if (layers.hsacCadastralLayer) {
      const cadastralChanged = applyCadastralSublayerVisibility({
        layers,
        layerVisibility,
        cadastralEnabled: cadastralVisible,
        activeCadastralIds: activeCadastralIdsRef.current,
      });
      if (cadastralChanged) {
        refreshVisibleHsacMapImageLayers(layers, {
          only: [layers.hsacMainLayer],
        });
      }
      if (cadastralVisible) {
        cadastralSyncAnchorRef.current = null;
        layers.scheduleCadastralExtentSync?.();
      } else {
        activeCadastralIdsRef.current = null;
        cadastralSyncAnchorRef.current = null;
      }
    }

    const syncOptionalOverlay = (layer, shouldShow, label) => {
      if (!layer || !layers.map) return;
      if (!shouldShow) {
        layer.visible = false;
        return;
      }
      if (layers.map.layers.includes(layer)) {
        layer.visible = true;
        return;
      }
      void attachOptionalMapOverlay(layers.map, layer, { label, allowHidden: true }).then((result) => {
        layer.visible = Boolean(result?.ok);
      });
    };

    syncOptionalOverlay(layers.governmentAssetsLayer, effective.assets, "Government Assets layer");
    syncOptionalOverlay(layers.kanalMarlaLayer, effective.kanalMarla, "Kanal Marla layer");
    syncOptionalOverlay(layers.nhaiLayer, effective.nhai, "NHAI layer");
    syncOptionalOverlay(layers.roadsLayer, effective.roads, "Haryana Roads layer");
  }, [activeBasemap, layerVisibility]);

  // ── Selected parcel highlight ────────────────────────────────────────────────
  useEffect(() => {
    const highlightLayer = layersRef.current.highlightLayer;
    const view = viewRef.current;

    if (!highlightLayer) return;

    highlightLayer.removeAll();

    if (!selectedParcel || !view) return;

    const graphic = createParcelGraphic(selectedParcel);
    if (!graphic) return;

    highlightLayer.add(graphic);

    const rawExtent = graphic.geometry?.extent;
    if (!rawExtent) return;
    const targetExtent = rawExtent.clone ? rawExtent.clone() : rawExtent;
    const zoomTarget = targetExtent.expand ? targetExtent.expand(1.8) : targetExtent;
    const minimumCadastralZoom = CLICK_ZOOM.VILLAGE_MAX + 1;

    view
      .goTo({ target: zoomTarget }, { duration: 950, easing: "ease-in-out" })
      .then(() => {
        if ((view.zoom ?? 0) > CLICK_ZOOM.VILLAGE_MAX) return undefined;
        return view
          .goTo(
            { target: zoomTarget, zoom: minimumCadastralZoom },
            { duration: 520, easing: "ease-in-out" },
          )
          .catch(() => undefined);
      })
      .catch(() => undefined);
  }, [selectedParcel, mapReady]);

  // ── Exported functions ───────────────────────────────────────────────────────

  const closePopup = () => closeLandRecordMiniPopup(popupStateRef);

  const zoomForPrint = async () => {
    const view = viewRef.current;
    if (!view) return null;

    const savedExtent = view.extent?.clone?.() ?? null;

    // Try parcel geometry first, then fall back to the highlight layer graphic
    const geometry =
      normalizeParcelGeometry(selectedParcelRef.current?.geometry) ??
      (() => {
        const g = layersRef.current.highlightLayer?.graphics?.getItemAt?.(0);
        return g?.geometry ? normalizeParcelGeometry(g.geometry) : null;
      })();

    if (geometry?.extent) {
      await view
        .goTo({ target: geometry.extent.expand(1.5) }, { duration: 700, easing: "ease-in-out" })
        .catch(() => {});
    }

    return savedExtent;
  };

  const restoreExtentAfterPrint = async (savedExtent) => {
    const view = viewRef.current;
    if (view && savedExtent) {
      await view
        .goTo(savedExtent, { duration: 600, easing: "ease-in-out" })
        .catch(() => {});
    }
  };

  const refreshLayersForCurrentView = useCallback(() => {
    const layers = layersRef.current;
    if (!layers?.map || !viewRef.current) {
      return { ok: false, message: "Map is still loading." };
    }
    const effective = getEffectiveLayerVisibility(layerVisibilityRef.current);
    syncStateBoundaryAndNearbyPlacesVisibility({
      layers,
      effective,
      currentScale: viewRef.current.scale,
    });
    applyBoundarySublayerVisibility({
      layers,
      layerVisibility: layerVisibilityRef.current,
      zoom: viewRef.current.zoom,
    });
    return { ok: true, message: "Map layers refreshed." };
  }, []);

  const zoomIn = async () => {
    if (!viewRef.current) return { ok: false, message: "Map is still loading." };
    await viewRef.current.goTo({ zoom: viewRef.current.zoom + 1 });
    return { ok: true, message: "Zoomed in." };
  };

  const zoomOut = async () => {
    if (!viewRef.current) return { ok: false, message: "Map is still loading." };
    await viewRef.current.goTo({ zoom: viewRef.current.zoom - 1 });
    return { ok: true, message: "Zoomed out." };
  };

  const resetView = async () => {
    if (!viewRef.current || !defaultExtentRef.current) {
      return { ok: false, message: "Default Haryana extent is not available yet." };
    }
    // Reset extent and rotation together so the north compass returns to 0°.
    await viewRef.current.goTo(
      {
        target: defaultExtentRef.current.clone(),
        rotation: 0,
      },
      { duration: 900, easing: "ease-in-out" },
    );
    return { ok: true, message: "Map reset to the default Haryana extent." };
  };

  const refreshOperationalLayers = () => {
    const layers = layersRef.current;
    if (!layers.map) return { ok: false, message: "Map is still loading." };

    layers.map.basemap = resolveBasemap(activeBasemap);
    return refreshLayersForCurrentView();
  };

  const goToCurrentLocation = async () => {
    if (!viewRef.current) {
      return { ok: false, message: "Map is still loading." };
    }

    if (!navigator.geolocation) {
      return { ok: false, message: "Geolocation is not available in this environment." };
    }

    if (!isSecureGeolocationContext()) {
      return {
        ok: false,
        message:
          "Browser location access requires HTTPS or localhost. Run the app on localhost or an HTTPS server to see the location permission prompt.",
      };
    }

    const centerOnUser = async (coords) => {
      syncUserLocationDot(coords);
      const point = new Point({
        longitude: coords.longitude,
        latitude: coords.latitude,
      });
      await viewRef.current.goTo(
        { target: point, zoom: LOCATE_ME_ZOOM },
        { duration: 450, easing: "ease-out" },
      );
    };

    if (userLocationRef.current) {
      try {
        await centerOnUser(userLocationRef.current);
        return { ok: true, message: "Centered on your location." };
      } catch {
        return { ok: false, message: "Unable to centre the map on your location." };
      }
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await centerOnUser(position.coords);
            resolve({ ok: true, message: "Centered on your location." });
          } catch {
            resolve({ ok: false, message: "Unable to centre the map on your location." });
          }
        },
        (err) => {
          const message = geolocationMessageFromError(err);
          userLocationErrorRef.current = message;
          resolve({ ok: false, message });
        },
        USER_GEOLOCATION_OPTIONS,
      );
    });
  };

  const searchPlace = async (term) => {
    if (!viewRef.current) return { ok: false, message: "Map is still loading." };

    if (!ARCGIS_API_KEY) {
      return {
        ok: false,
        requiresKey: true,
        message: "Add VITE_ARCGIS_API_KEY to enable ArcGIS place geocoding.",
      };
    }

    try {
      const [candidate] = await locator.addressToLocations(
        arcgisPortalConfig.serviceUrls.geocoder,
        { address: { SingleLine: term }, maxLocations: 1, outFields: ["PlaceName", "Addr_type"] },
      );

      if (!candidate) return { ok: false, message: `No result found for "${term}".` };

      layersRef.current.locationLayer.removeAll();
      layersRef.current.locationLayer.add(
        createLocationGraphic(candidate.location, candidate.attributes.PlaceName || term),
      );

      await viewRef.current.goTo(
        { target: candidate.location, zoom: 14 },
        { duration: 950, easing: "ease-in-out" },
      );

      return { ok: true, message: `Centred on ${candidate.attributes.PlaceName || term}.` };
    } catch (error) {
      return { ok: false, message: error?.message || "Geocoding request failed." };
    }
  };

  const goToLatLong = async ({ latitude, longitude }) => {
    const view = viewRef.current;
    const locationLayer = layersRef.current.locationLayer;

    if (!view || !locationLayer) {
      return { ok: false, message: "Map is still loading." };
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { ok: false, message: "Latitude and Longitude must be numeric values." };
    }

    if (lat < -90 || lat > 90) {
      return { ok: false, message: "Latitude must be between -90 and 90." };
    }

    if (lon < -180 || lon > 180) {
      return { ok: false, message: "Longitude must be between -180 and 180." };
    }

    const point = new Point({
      longitude: lon,
      latitude: lat,
      spatialReference: { wkid: 4326 },
    });

    try {
      locationLayer.removeAll();
      const marker = createLatLongGraphic(point, lat, lon);
      locationLayer.add(marker);

      await view.goTo(
        { target: point, zoom: Math.max(view.zoom ?? 12, 15) },
        { duration: 900, easing: "ease-in-out" },
      );

      closeLandRecordMiniPopup(popupStateRef);
      view.closePopup();

      return {
        ok: true,
        message: `Point located at ${lat.toFixed(6)}, ${lon.toFixed(6)}.`,
      };
    } catch (error) {
      return {
        ok: false,
        message: error?.message || "Unable to locate this point on the map.",
      };
    }
  };

  const openSelectedParcel = async () => {
    if (!selectedParcel || !viewRef.current) {
      return { ok: false, message: "Select land information first." };
    }

    const geometry = normalizeParcelGeometry(selectedParcel.geometry);
    if (!geometry) {
      return { ok: false, message: "This record does not have land information geometry to highlight." };
    }

    layersRef.current.highlightLayer.removeAll();
    layersRef.current.highlightLayer.add(
      new Graphic({ geometry, symbol: PARCEL_FILL_SYMBOL }),
    );

    await viewRef.current.goTo(
      { target: geometry.extent.expand(5) },
      { duration: 850, easing: "ease-in-out" },
    );

    return { ok: true, message: `Land record opened for Khasra ${selectedParcel.khasraNo}.` };
  };

  const drawBoundary = async (type, codes, options = {}) => {
    if (!layersRef.current.boundaryLayer || !viewRef.current) {
      return { ok: false, message: "Map is not ready." };
    }

    try {
      const defaultExpandByType = {
        district: 1.12,
        tehsil: 1.2,
        village: 1.28,
      };
      const fallbackExpandFactor = defaultExpandByType[type] ?? 1.2;
      const expandFactor = Number.isFinite(options?.expandFactor)
        ? Math.max(options.expandFactor, 1.02)
        : fallbackExpandFactor;
      const { features } = await getBoundaryGeometry(type, codes);

      if (!features.length) {
        return { ok: false, message: "Boundary geometry is under updation for this selection." };
      }

      layersRef.current.boundaryLayer.removeAll();

      let unionExtent = null;

      features.forEach((f) => {
        layersRef.current.boundaryLayer.add(
          new Graphic({ geometry: f.geometry, symbol: BOUNDARY_FILL_SYMBOL }),
        );

        if (f.geometry?.extent) {
          unionExtent = unionExtent
            ? unionExtent.union(f.geometry.extent)
            : f.geometry.extent.clone();
        }
      });

      if (unionExtent) {
        await viewRef.current.goTo(
          { target: unionExtent.expand(expandFactor) },
          { duration: 800, easing: "ease-in-out" },
        );
      }

      return { ok: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} boundary highlighted on the map.` };
    } catch (err) {
      return { ok: false, message: err?.message || "Failed to load boundary from HSAC server." };
    }
  };

  return {
    containerRef,
    viewRef,
    layersRef,
    mapReady,
    mapStatus,
    mapScale,
    pointerCoords,
    serviceHealth,
    zoomIn,
    zoomOut,
    resetView,
    refreshOperationalLayers,
    refreshLayersForCurrentView,
    goToCurrentLocation,
    goToLatLong,
    searchPlace,
    openSelectedParcel,
    drawBoundary,
    closePopup,
    zoomForPrint,
    restoreExtentAfterPrint,
  };
}
