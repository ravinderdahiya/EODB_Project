/**
 * Core ArcGIS hook for the Haryana land-record portal.
 * Keeps the map wired to the migrated HSAC service stack from the legacy app.
 */

import { useEffect, useRef, useState } from "react";
import { useLatestRef } from "./useLatestRef";
import { triggerPrint } from "@/utils/printUtils";
import esriConfig from "@arcgis/core/config.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import Graphic from "@arcgis/core/Graphic.js";
import ArcGISMap from "@arcgis/core/Map.js";
import Basemap from "@arcgis/core/Basemap.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer.js";
import TileLayer from "@arcgis/core/layers/TileLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import * as identify from "@arcgis/core/rest/identify.js";
import * as locator from "@arcgis/core/rest/locator.js";
import * as restQuery from "@arcgis/core/rest/query.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import * as urlUtils from "@arcgis/core/core/urlUtils.js";
import IdentifyParameters from "@arcgis/core/rest/support/IdentifyParameters.js";
import Query from "@arcgis/core/rest/support/Query.js";
import {
  arcgisPortalConfig,
  basemapPresets,
  DISTRICT_SUBLAYERS,
  HSAC_LAYER,
} from "@/config/arcgis";
import { HSAC_PROXY_URL, HSAC_PROXY_URL_PREFIXES } from "@/config/proxyConfig";
import { getHsacLayerPlan } from "@/services/hsacLayerResolver";
import { getBoundaryGeometry } from "@/services/mapQueryService";
import { createParcelRecordFromMapFeature } from "@/services/parcelRecordService";
import { PARCEL_FILL_SYMBOL, BOUNDARY_FILL_SYMBOL } from "@/config/mapSymbols";

function downloadLandRecordPreview(preview) {
  const blob = new Blob([JSON.stringify(preview, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = `${preview.registryRef}.json`;
  link.click();
  URL.revokeObjectURL(href);
}

async function shareLandRecordPreview(preview) {
  const shareText =
    `${preview.registryRef} | Khasra ${preview.khasraNo} | ${preview.ownerName} | ` +
    `${preview.village}, ${preview.tehsil}, ${preview.district}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Land record ${preview.khasraNo}`,
        text: shareText,
      });
      return;
    } catch {
      // Fallback to clipboard when the native share sheet is cancelled or unavailable.
    }
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
  }
}

const MAP_CLICK_POPUP_MARGIN = 12;
const MAP_CLICK_POPUP_OFFSET_X = 14;
const MAP_CLICK_POPUP_OFFSET_Y = 18;
const CADASTRAL_EFFECTIVE_MIN_SCALE = 5000;
const CADASTRAL_AUTO_ZOOM_SCALE = 4000;

// Zoom thresholds that drive click-to-select behaviour.
// ≤ DISTRICT_MAX  → state view   → click selects district and zooms to fit
// ≤ TEHSIL_MAX    → district view → click selects tehsil  and zooms to fit
// ≤ VILLAGE_MAX   → tehsil view  → click selects village  and zooms to fit
// > VILLAGE_MAX   → cadastral zone → cadastral parcel popup (when layer visible)
const CLICK_ZOOM = { DISTRICT_MAX: 9, TEHSIL_MAX: 12, VILLAGE_MAX: 14 };

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatScaleDenominator(scale) {
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return `1:${Math.round(scale).toLocaleString("en-IN")}`;
}

function closeLandRecordMiniPopup(popupStateRef) {
  const popupState = popupStateRef.current;
  if (!popupState) return;

  if (popupState.frameId) {
    window.cancelAnimationFrame(popupState.frameId);
    popupState.frameId = 0;
  }

  popupState.host?.replaceChildren();
  popupState.popupElement = null;
  popupState.anchorPoint = null;
}

function positionLandRecordMiniPopup({ host, popupElement, screenPoint }) {
  if (!host || !popupElement || !screenPoint) return;

  const hostRect = host.getBoundingClientRect();
  const popupWidth = popupElement.offsetWidth || 320;
  const popupHeight = popupElement.offsetHeight || 420;
  const maxLeft = Math.max(MAP_CLICK_POPUP_MARGIN, hostRect.width - popupWidth - MAP_CLICK_POPUP_MARGIN);
  const maxTop = Math.max(MAP_CLICK_POPUP_MARGIN, hostRect.height - popupHeight - MAP_CLICK_POPUP_MARGIN);

  let left = screenPoint.x + MAP_CLICK_POPUP_OFFSET_X;
  if (left > maxLeft) {
    left = screenPoint.x - popupWidth - MAP_CLICK_POPUP_OFFSET_X;
  }

  let top = screenPoint.y + MAP_CLICK_POPUP_OFFSET_Y;
  if (top > maxTop) {
    top = screenPoint.y - popupHeight - MAP_CLICK_POPUP_OFFSET_Y;
  }

  const clampedLeft = clampNumber(left, MAP_CLICK_POPUP_MARGIN, maxLeft);
  const clampedTop = clampNumber(top, MAP_CLICK_POPUP_MARGIN, maxTop);

  popupElement.style.left = `${clampedLeft}px`;
  popupElement.style.top = `${clampedTop}px`;
  popupElement.style.transformOrigin =
    `${clampedLeft > screenPoint.x ? "0%" : "100%"} ${clampedTop > screenPoint.y ? "0%" : "100%"}`;
}

function syncLandRecordMiniPopup({ popupStateRef, view }) {
  const popupState = popupStateRef.current;
  if (!popupState?.host || !popupState.popupElement || !popupState.anchorPoint || !view) return;

  const hostRect = popupState.host.getBoundingClientRect();
  const screenPoint = view.toScreen(popupState.anchorPoint);

  if (
    !screenPoint ||
    screenPoint.x < 0 ||
    screenPoint.y < 0 ||
    screenPoint.x > hostRect.width ||
    screenPoint.y > hostRect.height
  ) {
    closeLandRecordMiniPopup(popupStateRef);
    return;
  }

  positionLandRecordMiniPopup({
    host: popupState.host,
    popupElement: popupState.popupElement,
    screenPoint,
  });
}

function showLandRecordMiniPopup({
  popupStateRef,
  popupElement,
  anchorPoint,
  screenPoint,
}) {
  const popupState = popupStateRef.current;
  if (!popupState?.host || !popupElement || !anchorPoint) return;

  closeLandRecordMiniPopup(popupStateRef);
  popupState.host.append(popupElement);
  popupState.popupElement = popupElement;
  popupState.anchorPoint = anchorPoint.clone ? anchorPoint.clone() : anchorPoint;
  popupState.frameId = window.requestAnimationFrame(() => {
    positionLandRecordMiniPopup({
      host: popupState.host,
      popupElement,
      screenPoint,
    });
    popupState.frameId = 0;
  });
}

function createLandRecordPopupContent({
  parcel,
  onClose,
  onZoomToParcel,
  onViewFullDetails,
}) {
  const preview = parcel;
  const container = document.createElement("div");
  const verificationTone = /service linked|verified/i.test(preview.verificationStatus)
    ? "verified"
    : "review";

  container.className = "map-click-popup";
  container.innerHTML = `
    <section class="map-click-popup__card" aria-label="Land record information">
      <div class="map-click-popup__hero">

        <div class="map-click-popup__hero-top">
          <div class="map-click-popup__hero-copy">
            <h3>Land Record Information</h3>
            <p>${preview.breadcrumb}</p>
          </div>

          <div class="map-click-popup__hero-actions">
            <button
              type="button"
              class="map-click-popup__icon-button"
              data-role="zoom"
              aria-label="Zoom to land information"
            >
              Zoom
            </button>
            <button
              type="button"
              class="map-click-popup__icon-button"
              data-role="close"
              aria-label="Close land record popup"
            >
              x
            </button>
          </div>
        </div>

        
      </div>

      <div class="map-click-popup__scroll">
        <div class="map-click-popup__selectors">
          <div class="map-click-popup__selector">
            <span>District</span>
            <div class="map-click-popup__select">
              <strong>${preview.district}</strong>
              <small>${preview.districtCode || "--"}</small>
            </div>
          </div>

          <div class="map-click-popup__selector">
            <span>Tehsil</span>
            <div class="map-click-popup__select">
              <strong>${preview.tehsil}</strong>
              <small>${preview.tehsilCode || "--"}</small>
            </div>
          </div>

          <div class="map-click-popup__selector map-click-popup__selector--wide">
            <span>Village</span>
            <div class="map-click-popup__select">
              <strong>${preview.village}</strong>
              <small>${preview.villageCode || "--"}</small>
            </div>
          </div>
        </div>

        <div class="map-click-popup__metrics">
          <article class="map-click-popup__metric">
            <span>Murabba</span>
            <strong>${preview.murabbaNo}</strong>
          </article>
          <article class="map-click-popup__metric">
            <span>Khasra</span>
            <strong>${preview.khasraNo}</strong>
          </article>
          

        </div>

        <div class="record-panel__details map-click-popup__details">
          <div class="info-row">
            <span>Owner Name</span>
            <strong>${preview.ownerName}</strong>
          </div>
          <div class="info-row">
            <span>Khewat</span>
            <strong>${preview.khewatNo}</strong>
          </div>
          <div class="info-row">
            <span>Khatoni</span>
            <strong>${preview.khatoniNo}</strong>
          </div>
          <div class="info-row">
            <span>Jamabandi</span>
            <strong>${preview.jamabandiYear}</strong>
          </div>
          <div class="info-row">
            <span>Area(K-M)</span>
            <strong>${preview.area}</strong>
          </div>
        </div>

        <div class="record-panel__status map-click-popup__status">
          <span class="badge badge--${verificationTone}">${preview.verificationStatus}</span>
          <small>Updated ${preview.lastUpdated}</small>
        </div>

        

        <button type="button" class="primary-button map-click-popup__primary" data-role="view-details">
          View Full Details
        </button>

        
      </div>
    </section>`;

  container.querySelector('[data-role="close"]')?.addEventListener("click", () => {
    onClose?.();
  });

  container.querySelector('[data-role="zoom"]')?.addEventListener("click", () => {
    onZoomToParcel?.();
  });

  container.querySelector('[data-role="view-details"]')?.addEventListener("click", () => {
    onViewFullDetails?.(preview);
  });

  container.querySelector('[data-role="print"]')?.addEventListener("click", () => {
    triggerPrint();
  });

  container.querySelector('[data-role="share"]')?.addEventListener("click", async () => {
    await shareLandRecordPreview(preview).catch(() => undefined);
  });

  container.querySelector('[data-role="download"]')?.addEventListener("click", () => {
    downloadLandRecordPreview(preview);
  });

  return {
    title: "",
    content: container,
    preview,
  };
}

/** Minimal fallback popup for cadastral sublayers. */
const CADASTRAL_POPUP_TEMPLATE = {
  title: "Khasra {n_khas_no}",
  outFields: ["*"],
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "n_d_name", label: "District" },
        { fieldName: "n_t_name", label: "Tehsil" },
        { fieldName: "n_v_name", label: "Village" },
        { fieldName: "n_murr_no", label: "Murabba" },
        { fieldName: "n_khas_no", label: "Khasra" },
      ],
    },
  ],
};

// ─── Geometry helpers ────────────────────────────────────────────────────────

function normalizeParcelGeometry(parcelGeometry) {
  if (!parcelGeometry) return null;
  if (parcelGeometry.clone) return parcelGeometry.clone();
  if (parcelGeometry.rings) return new Polygon(parcelGeometry);
  if (Array.isArray(parcelGeometry)) {
    return new Polygon({ rings: [parcelGeometry], spatialReference: { wkid: 4326 } });
  }
  return null;
}

function createParcelGraphic(parcel) {
  const polygon = normalizeParcelGeometry(parcel.geometry);
  if (!polygon) return null;

  return new Graphic({
    geometry: polygon,
    attributes: { khasraNo: parcel.khasraNo, ownerName: parcel.ownerName },
    symbol: PARCEL_FILL_SYMBOL,
    popupTemplate: {
      title: `Khasra ${parcel.khasraNo}`,
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "ownerName", label: "Owner Name" },
            { fieldName: "khasraNo",  label: "Khasra No." },
          ],
        },
      ],
    },
  });
}

function createLocationGraphic(point, title) {
  return new Graphic({
    geometry: point,
    attributes: { title },
    symbol: {
      type: "simple-marker",
      style: "circle",
      color: [28, 112, 189, 0.9],
      size: 11,
      outline: { color: [255, 255, 255, 1], width: 2 },
    },
    popupTemplate: {
      title,
      content: "Location centered from ArcGIS geolocation workflow.",
    },
  });
}

// Public raster tile services — no ArcGIS API key required.
// The SDK 5.x built-in "classic" basemaps (hybrid, topo-vector, streets-vector) rely on
// cdn.arcgis.com VectorTile CDN items that fail without an API key, so we build
// explicit Basemap instances from these authenticated-free tile endpoints instead.
const _TILE = {
  imagery:   "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
  reference: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer",
  topo:      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
  streets:   "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
};

const _basemapInstanceCache = {};

function resolveBasemap(activeBasemap) {
  const id = basemapPresets[activeBasemap]?.basemapId ?? basemapPresets.cadastral.basemapId;
  if (_basemapInstanceCache[id]) return _basemapInstanceCache[id];

  let basemap;
  switch (id) {
    case "satellite":
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: _TILE.imagery })],
        title: "Imagery",
      });
      break;
    case "hybrid":
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: _TILE.imagery })],
        referenceLayers: [new TileLayer({ url: _TILE.reference })],
        title: "Hybrid",
      });
      break;
    case "topo-vector":
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: _TILE.topo })],
        title: "Topographic",
      });
      break;
    case "streets-vector":
    default:
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: _TILE.streets })],
        title: "Streets",
      });
  }

  _basemapInstanceCache[id] = basemap;
  return basemap;
}

function getVisibleCadastralLayerIds(layers) {
  const cadastralLayer = layers?.hsacCadastralLayer;
  const layerPlan = layers?.layerPlan;

  if (!cadastralLayer?.visible || !layerPlan?.cadastralLayerIds?.length) {
    return [];
  }

  return layerPlan.cadastralLayerIds.filter((id) => {
    const sublayer = cadastralLayer.findSublayerById?.(id);
    return sublayer ? sublayer.visible !== false : true;
  });
}

function createClickSearchExtent(view, event, tolerance = 8) {
  if (!view || !event) return null;

  const leftTop = view.toMap({ x: event.x - tolerance, y: event.y - tolerance });
  const rightBottom = view.toMap({ x: event.x + tolerance, y: event.y + tolerance });

  if (!leftTop || !rightBottom) return null;

  return new Extent({
    xmin: Math.min(leftTop.x, rightBottom.x),
    ymin: Math.min(leftTop.y, rightBottom.y),
    xmax: Math.max(leftTop.x, rightBottom.x),
    ymax: Math.max(leftTop.y, rightBottom.y),
    spatialReference: view.spatialReference,
  });
}

async function queryCadastralParcelAtClick({ view, layers, event }) {
  const layerIds = getVisibleCadastralLayerIds(layers);
  const clickExtent = createClickSearchExtent(view, event);

  if (!view || !clickExtent || !layerIds.length) {
    return null;
  }

  for (const layerId of layerIds) {
    const result = await restQuery
      .executeQueryJSON(
        `${arcgisPortalConfig.serviceUrls.hsacMain}/${layerId}`,
        new Query({
          geometry: clickExtent,
          spatialRelationship: "intersects",
          returnGeometry: true,
          outFields: ["*"],
          outSpatialReference: view.spatialReference,
          num: 1,
          where:
            "n_d_code IS NOT NULL AND n_t_code IS NOT NULL AND n_v_code IS NOT NULL " +
            "AND n_murr_no IS NOT NULL AND n_khas_no IS NOT NULL",
        }),
      )
      .catch(() => null);

    const feature = result?.features?.find((entry) => {
      const attributes = entry?.attributes ?? {};
      return attributes.n_khas_no || attributes.n_murr_no;
    });

    if (feature) {
      return feature;
    }
  }

  return null;
}

async function identifyCadastralParcelAtPoint({ view, layers, mapPoint }) {
  const layerIds = getVisibleCadastralLayerIds(layers);

  if (!view || !layers?.hsacCadastralLayer || !mapPoint || !layerIds.length) {
    return null;
  }

  const response = await identify
    .identify(
      arcgisPortalConfig.serviceUrls.hsacMain,
      new IdentifyParameters({
        geometry: mapPoint,
        mapExtent: view.extent,
        spatialReference: view.spatialReference,
        width: view.width,
        height: view.height,
        tolerance: 6,
        layerIds,
        layerOption: "all",
        returnGeometry: true,
        returnFieldName: true,
      }),
    )
    .catch(() => null);

  const result = response?.results?.find((entry) => {
    const attributes = entry?.feature?.attributes ?? {};
    return attributes.n_khas_no || attributes.n_murr_no || attributes.n_v_name;
  });

  return result?.feature ?? null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

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

  const [mapReady,     setMapReady]     = useState(false);
  const [mapStatus,    setMapStatus]    = useState("Initialising Haryana land-record map…");
  const [mapScale,     setMapScale]     = useState(null);
  const [serviceHealth, setServiceHealth] = useState({
    cadastral:  "loading",
    boundaries: "loading",
    assets:     "loading",
  });
  const lastCadastralVisibilityRef = useRef(layerVisibility.cadastral ?? true);

  const ensureCadastralVisibleScale = async (reason = "toggle") => {
    const view = viewRef.current;
    if (!view) {
      return { ok: false, message: "Map is still loading." };
    }

    const currentScale = view.scale ?? Number.POSITIVE_INFINITY;
    if (currentScale <= CADASTRAL_EFFECTIVE_MIN_SCALE) {
      return { ok: true, message: null };
    }

    await view.goTo(
      { target: view.center, scale: CADASTRAL_AUTO_ZOOM_SCALE },
      { duration: 900, easing: "ease-in-out" },
    ).catch(() => undefined);

    const scaleLabel = formatScaleDenominator(CADASTRAL_EFFECTIVE_MIN_SCALE) ?? "1:5,000";
    const sourceText = reason === "startup" ? "startup" : "layer";

    return {
      ok: true,
      message:
        `Cadastral visibility is scale-dependent. Auto-zoomed via ${sourceText} control to show parcels ` +
        `(${scaleLabel} or closer).`,
    };
  };

  // ── Map initialisation (runs once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return undefined;

    if (import.meta.env.VITE_ARCGIS_API_KEY) {
      esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
    }
    HSAC_PROXY_URL_PREFIXES.forEach((urlPrefix) => {
      const existingRule = urlUtils.getProxyRule(urlPrefix);
      if (existingRule?.urlPrefix === urlPrefix) return;

      urlUtils.addProxyRule({
        urlPrefix,
        proxyUrl: HSAC_PROXY_URL,
      });
    });

    const defaultExtent = new Extent(arcgisPortalConfig.defaultExtent);
    defaultExtentRef.current = defaultExtent;

    const updateHealth = (key, value) =>
      setServiceHealth((cur) => ({ ...cur, [key]: value }));
    let popupExtentHandle;
    let popupResizeHandle;
    let clickHandle;
    let view;
    let isDisposed = false;

    const initialiseMap = async () => {
      const layerPlan = await getHsacLayerPlan();
      if (isDisposed || !containerRef.current) {
        return;
      }

      const boundaryCandidates = [
        { id: layerPlan.murabbaLayerId, title: "Murabba", visible: false },
        { id: layerPlan.villageLayerId, title: "Village", visible: layerVisibility.village },
        { id: layerPlan.tehsilLayerId, title: "Tehsil", visible: layerVisibility.tehsil },
        { id: layerPlan.districtLayerId, title: "District", visible: layerVisibility.district },
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
          visible: true,
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
        visible: layerVisibility.cadastral,
        sublayers: cadastralSublayers,
      });

      const governmentAssetsLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.governmentAssets,
        title: "Government Assets",
        visible: layerVisibility.assets ?? false,
      });

      const nhaiLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.nhaiRoads,
        title: "NHAI (Upcoming)",
        visible: layerVisibility.nhai ?? false,
      });

      const roadsLayer = new MapImageLayer({
        url: arcgisPortalConfig.serviceUrls.haryanaRoads,
        title: "HR Road Infra",
        visible: layerVisibility.roads ?? false,
      });

      const boundaryLayer = new GraphicsLayer({ title: "Boundary selection", listMode: "hide" });
      const highlightLayer = new GraphicsLayer({
        title: "Selected land information",
        listMode: "hide",
        visible: layerVisibility.cadastral,
      });
      const locationLayer   = new GraphicsLayer({ title: "Location search",    listMode: "hide" });
      const selectionLayer  = new GraphicsLayer({ title: "Feature selection",  listMode: "hide" });

      const map = new ArcGISMap({
        basemap: resolveBasemap(activeBasemap),
      });

      map.addMany([
        roadsLayer,
        nhaiLayer,
        hsacCadastralLayer,
        governmentAssetsLayer,
        hsacBoundariesLayer,
        locationLayer,
        boundaryLayer,
        selectionLayer,
        highlightLayer,
      ]);

      view = new MapView({
        container: containerRef.current,
        map,
        extent: defaultExtent.clone(),
        constraints: { minZoom: 7 },
        navigation: { mouseWheelZoomEnabled: true, browserTouchPanEnabled: true },
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
      });

      view.ui.components = [];
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
          hsacCadastralLayer,
          governmentAssetsLayer,
          nhaiLayer,
          roadsLayer,
          boundaryLayer,
          selectionLayer,
          highlightLayer,
          locationLayer,
        };
        setMapReady(true);

        // Live scale ratio — updates on every zoom/pan
        reactiveUtils.watch(
          () => view.scale,
          (newScale) => { if (!isDisposed) setMapScale(newScale); },
          { initial: true },
        );

        if (layerPlan.usesFallback) {
          await hsacCadastralLayer.load().catch(() => undefined);
          const cadastralExtent = hsacCadastralLayer.fullExtent;
          if (cadastralExtent) {
            await view.goTo(cadastralExtent.expand(1.15), {
              duration: 850,
              easing: "ease-in-out",
            }).catch(() => undefined);
          }
        }

        // Always start from Haryana-wide extent on initial load.
        await view.goTo(defaultExtent.clone(), {
          duration: 900,
          easing: "ease-in-out",
        }).catch(() => undefined);

        setMapStatus(
          layerPlan.usesFallback
            ? "HSAC map loaded with dynamic layer fallback."
            : "HSAC Haryana map is live with district / tehsil / village boundaries.",
        );
      });

      popupExtentHandle = reactiveUtils.watch(() => view.extent, () => {
        syncLandRecordMiniPopup({ popupStateRef, view });
      });
      popupResizeHandle = view.on("resize", () => {
        syncLandRecordMiniPopup({ popupStateRef, view });
      });

      hsacBoundariesLayer.load().then(
        () => updateHealth("boundaries", "connected"),
        () => updateHealth("boundaries", "degraded"),
      );
      hsacCadastralLayer.load().then(
        () => updateHealth("cadastral", "connected"),
        () => updateHealth("cadastral", "degraded"),
      );
      governmentAssetsLayer.load().then(
        () => updateHealth("assets", "connected"),
        () => updateHealth("assets", "degraded"),
      );

      let boundaryQueryCounter = 0;

      clickHandle = view.on("click", async (event) => {
        const currentLayers = layersRef.current;
        const zoom = Math.round(view.zoom);

        // Clear the previous boundary highlight and any open popup on every click
        currentLayers.selectionLayer?.removeAll();
        closeLandRecordMiniPopup(popupStateRef);
        view.closePopup();

        // Resolve which boundary level the current zoom targets
        const layerPlan = currentLayers.layerPlan;
        let boundaryLayerId = null;
        if (zoom <= CLICK_ZOOM.DISTRICT_MAX) {
          boundaryLayerId = layerPlan?.districtLayerId;
        } else if (zoom <= CLICK_ZOOM.TEHSIL_MAX) {
          boundaryLayerId = layerPlan?.tehsilLayerId;
        } else if (zoom <= CLICK_ZOOM.VILLAGE_MAX) {
          boundaryLayerId = layerPlan?.villageLayerId;
        }

        if (boundaryLayerId != null) {
          // Boundary selection mode: highlight clicked polygon + zoom to fit, no popup
          const queryId = ++boundaryQueryCounter;
          const result = await restQuery
            .executeQueryJSON(
              `${arcgisPortalConfig.serviceUrls.hsacMain}/${boundaryLayerId}`,
              new Query({
                geometry: event.mapPoint,
                spatialRelationship: "intersects",
                returnGeometry: true,
                outFields: [],
                outSpatialReference: view.spatialReference,
                num: 1,
              }),
            )
            .catch(() => null);

          if (boundaryQueryCounter !== queryId) return;

          const feature = result?.features?.[0];
          if (feature?.geometry) {
            currentLayers.selectionLayer?.removeAll();
            currentLayers.selectionLayer?.add(
              new Graphic({ geometry: feature.geometry, symbol: BOUNDARY_FILL_SYMBOL }),
            );

            const extent = feature.geometry.extent;
            if (extent) {
              await view
                .goTo({ target: extent.expand(1.25) }, { duration: 820, easing: "ease-in-out" })
                .catch(() => undefined);
            }
          }
          return;
        }

        // Cadastral zone (zoom > VILLAGE_MAX): show popup only when Cadastral layer is visible
        if (!currentLayers.hsacCadastralLayer?.visible) return;

        const response = await view.hitTest(event).catch(() => null);

        const hit = response?.results?.find((r) => r.graphic?.layer === highlightLayer);
        let cadastralHit = response?.results?.find(
          (r) => r.graphic?.attributes?.n_khas_no || r.graphic?.attributes?.n_v_name,
        );

        const queriedCadastralFeature = cadastralHit
          ? null
          : await queryCadastralParcelAtClick({ view, layers: currentLayers, event });

        if (queriedCadastralFeature) {
          cadastralHit = { graphic: queriedCadastralFeature };
        }

        const identifiedCadastralFeature = cadastralHit
          ? null
          : await identifyCadastralParcelAtPoint({
              view,
              layers: currentLayers,
              mapPoint: event.mapPoint,
            });

        if (identifiedCadastralFeature) {
          cadastralHit = { graphic: identifiedCadastralFeature };
        }

        if (hit && selectedParcelRef.current) {
          onParcelSelectRef.current?.(selectedParcelRef.current, { openTable: false });
        }

        if (!cadastralHit && !hit) return;

        const previewRecord = await createParcelRecordFromMapFeature({
          attributes: cadastralHit?.graphic?.attributes,
          geometry:
            cadastralHit?.graphic?.geometry ??
            hit?.graphic?.geometry ??
            normalizeParcelGeometry(selectedParcelRef.current?.geometry),
          fallbackParcel: selectedParcelRef.current,
        }).catch(() => selectedParcelRef.current);

        if (!previewRecord) {
          setMapStatus("No land record preview is available for this map click.");
          return;
        }

        onParcelSelectRef.current?.(previewRecord, { openTable: false });

        const popup = createLandRecordPopupContent({
          parcel: previewRecord,
          onClose: () => closeLandRecordMiniPopup(popupStateRef),
          onZoomToParcel: async () => {
            const targetGeometry =
              previewRecord?.geometry ??
              cadastralHit?.graphic?.geometry ??
              hit?.graphic?.geometry ??
              event.mapPoint;

            if (!targetGeometry) return;

            if (targetGeometry.extent?.expand) {
              await view.goTo(targetGeometry.extent.expand(1.5)).catch(() => undefined);
              return;
            }

            await view
              .goTo({ target: targetGeometry, zoom: Math.max(view.zoom ?? 13, 15) })
              .catch(() => undefined);
          },
          onViewFullDetails: (preview) => onPreviewFullDetailsRef.current?.(preview),
        });

        showLandRecordMiniPopup({
          popupStateRef,
          popupElement: popup.content,
          anchorPoint: event.mapPoint,
          screenPoint: { x: event.x, y: event.y },
        });

        setMapStatus(`Land record popup opened for Khasra ${popup.preview.khasraNo}.`);
      });
    };

    initialiseMap();

    return () => {
      isDisposed = true;
      layersRef.current = {};
      viewRef.current = null;
      setMapReady(false);
      closeLandRecordMiniPopup(popupStateRef);
      popupExtentHandle?.remove?.();
      popupResizeHandle?.remove?.();
      clickHandle?.remove?.();
      popupStateRef.current.host?.remove();
      popupStateRef.current.host = null;
      view?.destroy?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layer visibility + basemap sync ─────────────────────────────────────────
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers.map) return;

    layers.map.basemap = resolveBasemap(activeBasemap);

    // Boundary sub-layer visibility
    const layerPlan = layers.layerPlan;
    const visibilityByBoundaryLayerId = new Map();

    [
      { id: layerPlan?.districtLayerId ?? HSAC_LAYER.DISTRICT, visible: layerVisibility.district },
      { id: layerPlan?.tehsilLayerId ?? HSAC_LAYER.TEHSIL, visible: layerVisibility.tehsil },
      { id: layerPlan?.villageLayerId ?? HSAC_LAYER.VILLAGE, visible: layerVisibility.village },
    ].forEach(({ id, visible }) => {
      visibilityByBoundaryLayerId.set(id, (visibilityByBoundaryLayerId.get(id) ?? false) || visible);
    });

    visibilityByBoundaryLayerId.forEach((visible, id) => {
      const sublayer = layers.hsacBoundariesLayer?.findSublayerById(id);
      if (sublayer) sublayer.visible = visible;
    });

    // Cadastral + parcel highlight
    if (layers.hsacCadastralLayer) layers.hsacCadastralLayer.visible = layerVisibility.cadastral;
    if (layers.highlightLayer)     layers.highlightLayer.visible     = layerVisibility.cadastral;

    const wasCadastralVisible = lastCadastralVisibilityRef.current;
    const isCadastralVisible = layerVisibility.cadastral ?? true;
    lastCadastralVisibilityRef.current = isCadastralVisible;

    if (isCadastralVisible && !wasCadastralVisible) {
      void ensureCadastralVisibleScale("layer").then((result) => {
        if (result?.message) {
          setMapStatus(result.message);
        }
      });
    }

    // Operational overlays
    if (layers.governmentAssetsLayer) layers.governmentAssetsLayer.visible = layerVisibility.assets ?? false;
    if (layers.nhaiLayer)             layers.nhaiLayer.visible             = layerVisibility.nhai  ?? false;
    if (layers.roadsLayer)            layers.roadsLayer.visible            = layerVisibility.roads ?? false;
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

    view
      .goTo({ target: graphic.geometry.extent.expand(7) }, { duration: 950, easing: "ease-in-out" })
      .catch(() => undefined);
  }, [selectedParcel]);

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
    await viewRef.current.goTo(defaultExtentRef.current.clone(), {
      duration: 900, easing: "ease-in-out",
    });
    return { ok: true, message: "Map reset to the default Haryana extent." };
  };

  const refreshOperationalLayers = () => {
    const layers = layersRef.current;
    if (!layers.map) return { ok: false, message: "Map is still loading." };

    layers.map.basemap = resolveBasemap(activeBasemap);

    [
      layers.hsacBoundariesLayer,
      layers.hsacCadastralLayer,
      layers.governmentAssetsLayer,
    ].forEach((layer) => layer?.refresh?.());

    return { ok: true, message: "HSAC map layers refreshed." };
  };

  const goToCurrentLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation || !viewRef.current) {
        resolve({ ok: false, message: "Geolocation is not available in this environment." });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const point = new Point({ longitude: coords.longitude, latitude: coords.latitude });

          layersRef.current.locationLayer.removeAll();
          layersRef.current.locationLayer.add(createLocationGraphic(point, "Current Location"));

          await viewRef.current.goTo({ target: point, zoom: 14 }, { duration: 950, easing: "ease-in-out" });
          resolve({ ok: true, message: "Current location loaded and centred on the map." });
        },
        () => resolve({ ok: false, message: "Location permission denied." }),
      );
    });

  const searchPlace = async (term) => {
    if (!viewRef.current) return { ok: false, message: "Map is still loading." };

    if (!import.meta.env.VITE_ARCGIS_API_KEY) {
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

  const drawBoundary = async (type, codes) => {
    if (!layersRef.current.boundaryLayer || !viewRef.current) {
      return { ok: false, message: "Map is not ready." };
    }

    try {
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
          { target: unionExtent.expand(5) },
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
    goToCurrentLocation,
    searchPlace,
    openSelectedParcel,
    drawBoundary,
    closePopup,
    zoomForPrint,
    restoreExtentAfterPrint,
  };
}
