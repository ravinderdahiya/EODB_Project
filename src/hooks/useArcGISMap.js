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
import { getHsacLayerPlan } from "@/services/hsacLayerResolver";
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
  loadLayerWithRetry,
  normalizeParcelGeometry,
  queryCadastralParcelAtClick,
  clearBasemapCache,
  resolveBasemap,
  showLandRecordMiniPopup,
  syncLandRecordMiniPopup,
} from "./useArcGISMapUtils";
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

  if (layers.hsacStateBoundaryLayer) {
    // Visibility sync rule: checkbox is required, and scale must be within configured range.
    layers.hsacStateBoundaryLayer.visible = shouldShowStateBoundary;
    const stateSublayer = findSublayerById(layers.hsacStateBoundaryLayer, HSAC_LAYER.STATE_BOUNDARY);
    if (stateSublayer) {
      stateSublayer.visible = shouldShowStateBoundary;
    } else if (import.meta.env.DEV) {
      console.warn("[useArcGISMap] Missing state boundary sublayer (id 31).");
    }
  }

  if (layers.nearbyPlacesLayer) {
    layers.nearbyPlacesLayer.visible = effective.nearbyPlacesPoi;
    const poiSublayer = findSublayerById(layers.nearbyPlacesLayer, HSAC_LAYER.POI);
    if (poiSublayer) {
      poiSublayer.visible = effective.nearbyPlacesPoi;
    } else if (import.meta.env.DEV) {
      console.warn("[useArcGISMap] Missing POI sublayer (id 24) in Nearby Places layer.");
    }
  }
};

/** Refresh visible HSAC MapImageLayers after zoom / scale changes. */
export const refreshVisibleHsacMapImageLayers = (layers) => {
  if (!layers) return;
  [
    layers.hsacBoundariesLayer,
    layers.hsacStateBoundaryLayer,
    layers.hsacCadastralLayer,
    layers.nearbyPlacesLayer,
    layers.governmentAssetsLayer,
    layers.nhaiLayer,
    layers.roadsLayer,
  ].forEach((layer) => {
    if (layer?.visible) layer.refresh?.();
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
  const [serviceHealth, setServiceHealth] = useState({
    cadastral:  "loading",
    boundaries: "loading",
    assets:     "loading",
  });
  // ── Map initialisation (runs once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return undefined;

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
    let zoomLayerRefreshTimer = null;
    let view;
    let isDisposed = false;

    const initialiseMap = async () => {
      const layerPlan = await getHsacLayerPlan();
      if (isDisposed || !containerRef.current) {
        return;
      }

      const effective = getEffectiveLayerVisibility(layerVisibility);
      const boundaryCandidates = [
        { id: layerPlan.murabbaLayerId, title: "Murabba", visible: effective.murraba },
        { id: layerPlan.villageLayerId, title: "Village", visible: effective.village },
        { id: layerPlan.tehsilLayerId, title: "Tehsil", visible: effective.tehsil },
        { id: layerPlan.districtLayerId, title: "District", visible: effective.district },
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
          visible: effective.cadastral && (layerVisibility[`cadastral_${id}`] ?? true),
          minScale: 0,
          maxScale: 0,
          popupTemplate: CADASTRAL_POPUP_TEMPLATE,
        };
      });

      const hsacBoundariesLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.hsacMain,
        title: "Boundaries",
        visible: boundarySublayers.length > 0,
        sublayers: boundarySublayers,
      });

      const hsacCadastralLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.hsacMain,
        title: "Cadastral",
        // Keep heavy cadastral draw off during initial state-wide load; zoom watcher turns it on later.
        visible: false,
        minScale: 0,
        maxScale: 0,
        sublayers: cadastralSublayers,
      });
      const hsacStateBoundaryLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.hsacMain,
        title: "Haryana State Boundary",
        visible: effective.stateBoundary,
        sublayers: [
          {
            id: HSAC_LAYER.STATE_BOUNDARY,
            title: "Haryana State Boundary",
            visible: effective.stateBoundary,
            // Keep sublayer scale-unrestricted here; we enforce exact range in a single runtime sync path below.
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
        ],
      });
      const nearbyPlacesLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.hsacMain,
        title: "Nearby Places",
        visible: effective.nearbyPlacesPoi,
        sublayers: [
          {
            id: HSAC_LAYER.POI,
            title: "POI",
            visible: effective.nearbyPlacesPoi,
          },
        ],
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
        hsacCadastralLayer,
        hsacBoundariesLayer,
        hsacStateBoundaryLayer,
        nearbyPlacesLayer,
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

      const popupHost = document.createElement("div");
      popupHost.className = "map-click-popup-host";
      containerRef.current.append(popupHost);
      popupStateRef.current.host = popupHost;

      view.when(async () => {
        if (isDisposed) return;

        viewRef.current = view;
        layersRef.current = {
          map,
          layerPlan,
          hsacBoundariesLayer,
          hsacStateBoundaryLayer,
          hsacCadastralLayer,
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

        startUserLocationWatch();

        const syncLayersAfterZoom = () => {
          const layers = layersRef.current;
          if (!layers?.map) return;
          refreshVisibleHsacMapImageLayers(layers);
          const effective = getEffectiveLayerVisibility(layerVisibilityRef.current);
          syncStateBoundaryAndNearbyPlacesVisibility({
            layers,
            effective,
            currentScale: view.scale,
          });
        };

        const scheduleZoomLayerRefresh = () => {
          clearTimeout(zoomLayerRefreshTimer);
          zoomLayerRefreshTimer = setTimeout(() => {
            if (!isDisposed) syncLayersAfterZoom();
          }, 250);
        };

        // Slower, smoother mouse-wheel zoom at the cursor (small fractional steps + animation).
        const MOUSE_WHEEL_ZOOM_STEP = 0.12;
        const MOUSE_WHEEL_ZOOM_DURATION_MS = 130;
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
              scheduleZoomLayerRefresh();
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

        // Live scale ratio — updates on every zoom/pan; debounced layer refresh on scale change.
        reactiveUtils.watch(
          () => view.scale,
          (newScale) => {
            if (!isDisposed) setMapScale(newScale);
            scheduleZoomLayerRefresh();
          },
          { initial: true },
        );

        // Zoom-based cadastral visibility — hide cadastral when zoomed out past village level.
        // Parcels are invisible and the server renders nothing useful at low zoom anyway.
        zoomWatchHandle = reactiveUtils.watch(
          () => view.zoom,
          (zoom) => {
            if (isDisposed) return;
            const lyr = layersRef.current;
            // Visibility sync rule: UI toggle state is the source of truth; zoom can only further restrict.
            const effectiveState = getEffectiveLayerVisibility(layerVisibilityRef.current);
            const shouldShow = effectiveState.cadastral && zoom > CLICK_ZOOM.VILLAGE_MAX;
            if (lyr.hsacCadastralLayer) lyr.hsacCadastralLayer.visible = shouldShow;
            if (lyr.highlightLayer)     lyr.highlightLayer.visible     = shouldShow;
            scheduleZoomLayerRefresh();
          },
          { initial: true },
        );

        // Map is interactive immediately — layer metadata loads continue in the background.
        setMapReady(true);
        setMapStatus("Haryana map ready. Verifying layer connectivity…");

        void Promise.resolve().then(() => {
          if (isDisposed) return;
          map.addMany([governmentAssetsLayer, nhaiLayer, roadsLayer]);
        });

        const [boundariesLoad, cadastralLoad, assetsLoad] = await Promise.all([
          loadLayerWithRetry(hsacBoundariesLayer, { label: "Boundaries layer" }),
          loadLayerWithRetry(hsacStateBoundaryLayer, { label: "State boundary layer", attempts: 1 }),
          loadLayerWithRetry(hsacCadastralLayer, { label: "Cadastral layer" }),
          loadLayerWithRetry(nearbyPlacesLayer, { label: "Nearby Places layer", attempts: 1 }),
          loadLayerWithRetry(governmentAssetsLayer, { label: "Government Assets layer" }),
        ]);

        if (isDisposed) return;

        updateHealth("boundaries", boundariesLoad.ok ? "connected" : "degraded");
        updateHealth("cadastral", cadastralLoad.ok ? "connected" : "degraded");
        updateHealth("assets", assetsLoad.ok ? "connected" : "degraded");

        // Optional overlays should not block core tool readiness.
        void Promise.all([
          loadLayerWithRetry(nhaiLayer, { label: "NHAI layer", attempts: 1 }),
          loadLayerWithRetry(roadsLayer, { label: "Haryana Roads layer", attempts: 1 }),
        ]);

        const coreLayerHealthy = boundariesLoad.ok && cadastralLoad.ok;
        if (!coreLayerHealthy) {
          setMapStatus(
            "HSAC map loaded with limited connectivity. Core services will auto-recover when available.",
          );
        } else {
          setMapStatus(
            layerPlan.usesFallback
              ? "HSAC map loaded with dynamic layer fallback."
              : "HSAC Haryana map is live with district / tehsil / village boundaries.",
          );
        }
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
          selectableBoundaries.length > 0 &&
          currentLayers.hsacBoundariesLayer?.visible
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

        // Cadastral zone (zoom > VILLAGE_MAX): show popup only when Cadastral layer is visible
        if (!currentLayers.hsacCadastralLayer?.visible) return;
        const popupRequestId = ++cadastralPopupRequestCounter;

        const loadingPopup = createLandRecordPopupContent({
          parcel: createPopupLoadingPreview(selectedParcelRef.current, event.mapPoint),
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
          const [queriedFeature, identifiedFeature] = await Promise.all([
            queryCadastralParcelAtClick({ view, layers: currentLayers, event }),
            identifyCadastralParcelAtPoint({ view, layers: currentLayers, mapPoint: event.mapPoint }),
          ]);
          const resolvedFeature = queriedFeature ?? identifiedFeature;
          if (resolvedFeature) {
            cadastralHit = { graphic: resolvedFeature };
          }
        }

        if (hit && selectedParcelRef.current) {
          onParcelSelectRef.current?.(selectedParcelRef.current, { openTable: false });
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
          fallbackParcel: selectedParcelRef.current,
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

    initialiseMap();

    return () => {
      isDisposed = true;
      clearTimeout(zoomLayerRefreshTimer);
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
      popupStateRef.current.host?.remove();
      popupStateRef.current.host = null;
      view?.destroy?.();
      clearBasemapCache();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layer visibility + basemap sync ─────────────────────────────────────────
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers.map) return;

    layers.map.basemap = resolveBasemap(activeBasemap);
    const effective = getEffectiveLayerVisibility(layerVisibility);

    // Boundary sub-layer visibility
    const layerPlan = layers.layerPlan;
    const visibilityByBoundaryLayerId = new Map();

    [
      { id: layerPlan?.murabbaLayerId ?? HSAC_LAYER.MURABBA, visible: effective.murraba },
      { id: layerPlan?.districtLayerId ?? HSAC_LAYER.DISTRICT, visible: effective.district },
      { id: layerPlan?.tehsilLayerId ?? HSAC_LAYER.TEHSIL, visible: effective.tehsil },
      { id: layerPlan?.villageLayerId ?? HSAC_LAYER.VILLAGE, visible: effective.village },
    ].forEach(({ id, visible }) => {
      visibilityByBoundaryLayerId.set(id, (visibilityByBoundaryLayerId.get(id) ?? false) || visible);
    });

    visibilityByBoundaryLayerId.forEach((visible, id) => {
      const sublayer = findSublayerById(layers.hsacBoundariesLayer, id);
      if (sublayer) {
        sublayer.visible = visible;
      } else if (import.meta.env.DEV) {
        console.warn(`[useArcGISMap] Missing boundary sublayer id ${id}.`);
      }
    });

    if (layers.hsacBoundariesLayer) {
      const hasVisibleBoundary = Array.from(visibilityByBoundaryLayerId.values()).some(Boolean);
      layers.hsacBoundariesLayer.visible = hasVisibleBoundary;
    }
    syncStateBoundaryAndNearbyPlacesVisibility({
      layers,
      effective,
      currentScale: viewRef.current?.scale,
    });

    // Visibility sync rule: do not auto-enable from zoom; zoom only constrains toggled-on layers.
    const currentZoom = viewRef.current?.zoom;
    const cadastralVisible = effective.cadastral && (currentZoom == null || currentZoom > CLICK_ZOOM.VILLAGE_MAX);
    if (layers.hsacCadastralLayer) layers.hsacCadastralLayer.visible = cadastralVisible;
    if (layers.highlightLayer)     layers.highlightLayer.visible     = cadastralVisible;
    if (layers.hsacCadastralLayer) {
      (layerPlan?.cadastralLayerIds ?? DISTRICT_SUBLAYERS.map((entry) => entry.id)).forEach((id) => {
        const sublayer = findSublayerById(layers.hsacCadastralLayer, id);
        if (sublayer) {
          sublayer.visible = effective.cadastral && Boolean(layerVisibility[`cadastral_${id}`] ?? true);
        } else if (import.meta.env.DEV) {
          console.warn(`[useArcGISMap] Missing cadastral sublayer id ${id}.`);
        }
      });
    }

    // Operational overlays
    if (layers.governmentAssetsLayer) layers.governmentAssetsLayer.visible = effective.assets;
    if (layers.nhaiLayer)             layers.nhaiLayer.visible             = effective.nhai;
    if (layers.roadsLayer)            layers.roadsLayer.visible            = effective.roads;
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
    refreshVisibleHsacMapImageLayers(layers);
    const effective = getEffectiveLayerVisibility(layerVisibilityRef.current);
    syncStateBoundaryAndNearbyPlacesVisibility({
      layers,
      effective,
      currentScale: viewRef.current.scale,
    });
    return { ok: true, message: "Map layers refreshed." };
  }, []);

  const zoomIn = async () => {
    if (!viewRef.current) return { ok: false, message: "Map is still loading." };
    await viewRef.current.goTo({ zoom: viewRef.current.zoom + 1 });
    refreshLayersForCurrentView();
    return { ok: true, message: "Zoomed in." };
  };

  const zoomOut = async () => {
    if (!viewRef.current) return { ok: false, message: "Map is still loading." };
    await viewRef.current.goTo({ zoom: viewRef.current.zoom - 1 });
    refreshLayersForCurrentView();
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
