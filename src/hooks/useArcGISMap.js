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
import { getRuntimeConfigValue } from "@/config/runtimeConfig";

const ARCGIS_API_KEY = getRuntimeConfigValue(
  "VITE_ARCGIS_API_KEY",
  import.meta.env.VITE_ARCGIS_API_KEY,
);

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
const LAYER_LOAD_TIMEOUT_MS = 12000;
const LAYER_LOAD_RETRY_ATTEMPTS = 2;
const LAYER_LOAD_RETRY_DELAY_MS = 900;
const INITIAL_EXTENT_ZOOM_OUT_FACTOR = 1.5;

// Zoom thresholds that drive click-to-select behaviour.
// ≤ DISTRICT_MAX  → state view   → click selects district and zooms to fit
// ≤ TEHSIL_MAX    → district view → click selects tehsil  and zooms to fit
// ≤ VILLAGE_MAX   → tehsil view  → click selects village  and zooms to fit
// > VILLAGE_MAX   → cadastral zone → cadastral parcel popup (when layer visible)
const CLICK_ZOOM = { DISTRICT_MAX: 9, TEHSIL_MAX: 12, VILLAGE_MAX: 14 };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

async function loadLayerWithRetry(layer, {
  label,
  attempts = LAYER_LOAD_RETRY_ATTEMPTS,
  timeoutMs = LAYER_LOAD_TIMEOUT_MS,
  retryDelayMs = LAYER_LOAD_RETRY_DELAY_MS,
} = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await withTimeout(
        layer.load(),
        timeoutMs,
        `${label || layer?.title || "Layer"} metadata load timed out.`,
      );

      return { ok: true, attempts: attempt, error: null };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(retryDelayMs * attempt);
      }
    }
  }

  return { ok: false, attempts, error: lastError };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
        <div class="map-click-popup__loading ${/fetching|loading/i.test(preview.verificationStatus || "") ? "is-active" : ""}" data-role="popup-loading">
          <span class="map-click-popup__loading-spinner" aria-hidden="true"></span>
          <span>Loading land record details...</span>
        </div>
        <div class="map-click-popup__selectors">
          <div class="map-click-popup__selector">
            <span>District</span>
            <div class="map-click-popup__select">
              <strong data-field="district">${preview.district}</strong>
              <small data-field="districtCode">${preview.districtCode || "--"}</small>
            </div>
          </div>

          <div class="map-click-popup__selector">
            <span>Tehsil</span>
            <div class="map-click-popup__select">
              <strong data-field="tehsil">${preview.tehsil}</strong>
              <small data-field="tehsilCode">${preview.tehsilCode || "--"}</small>
            </div>
          </div>

          <div class="map-click-popup__selector map-click-popup__selector--wide">
            <span>Village</span>
            <div class="map-click-popup__select">
              <strong data-field="village">${preview.village}</strong>
              <small data-field="villageCode">${preview.villageCode || "--"}</small>
            </div>
          </div>
        </div>

        <div class="map-click-popup__metrics">
          <article class="map-click-popup__metric">
            <span>Murabba</span>
            <strong data-field="murabbaNo">${preview.murabbaNo}</strong>
          </article>
          <article class="map-click-popup__metric">
            <span>Khasra</span>
            <strong data-field="khasraNo">${preview.khasraNo}</strong>
          </article>
          

        </div>

        <div class="record-panel__details map-click-popup__details">
          <div class="info-row">
            <span>Owner Name</span>
            <strong data-field="ownerName">${preview.ownerName}</strong>
          </div>
          <div class="info-row">
            <span>Khewat</span>
            <strong data-field="khewatNo">${preview.khewatNo}</strong>
          </div>
          <div class="info-row">
            <span>Khatoni</span>
            <strong data-field="khatoniNo">${preview.khatoniNo}</strong>
          </div>
          <div class="info-row">
            <span>Jamabandi</span>
            <strong data-field="jamabandiYear">${preview.jamabandiYear}</strong>
          </div>
          <div class="info-row">
            <span>Area(K-M)</span>
            <strong data-field="area">${preview.area}</strong>
          </div>
        </div>

        <div class="record-panel__status map-click-popup__status">
          <span class="badge badge--${verificationTone}" data-field="verificationStatus">${preview.verificationStatus}</span>
          <small data-field="lastUpdated">Updated ${preview.lastUpdated}</small>
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

function hydrateLandRecordPopupDetails(popupContainer, preview, options = {}) {
  if (!popupContainer || !preview) return;
  const keepLoading = Boolean(options.keepLoading);

  const applyText = (field, value, prefix = "") => {
    const node = popupContainer.querySelector(`[data-field="${field}"]`);
    if (!node) return;
    node.textContent = `${prefix}${value ?? "--"}`;
  };

  applyText("district", preview.district);
  applyText("districtCode", preview.districtCode);
  applyText("tehsil", preview.tehsil);
  applyText("tehsilCode", preview.tehsilCode);
  applyText("village", preview.village);
  applyText("villageCode", preview.villageCode);
  applyText("murabbaNo", preview.murabbaNo);
  applyText("khasraNo", preview.khasraNo);
  applyText("ownerName", preview.ownerName);
  applyText("khewatNo", preview.khewatNo);
  applyText("khatoniNo", preview.khatoniNo);
  applyText("jamabandiYear", preview.jamabandiYear);
  applyText("area", preview.area);
  applyText("verificationStatus", preview.verificationStatus);
  applyText("lastUpdated", preview.lastUpdated, "Updated ");

  const loadingNode = popupContainer.querySelector('[data-role="popup-loading"]');
  if (loadingNode) {
    loadingNode.classList.toggle("is-active", keepLoading);
  }
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

function createInstantParcelPreview({ attributes = {}, geometry = null, fallbackParcel }) {
  const fallback = fallbackParcel ?? {};
  const pick = (value, fb = "--") => {
    if (value === undefined || value === null) return fb;
    const text = `${value}`.trim();
    return text || fb;
  };

  const districtCode = pick(attributes.n_d_code, fallback.districtCode ?? "");
  const tehsilCode = pick(attributes.n_t_code, fallback.tehsilCode ?? "");
  const villageCode = pick(attributes.n_v_code, fallback.villageCode ?? "");
  const murabbaNo = pick(attributes.n_murr_no, fallback.murabbaNo ?? "--");
  const khasraNo = pick(attributes.n_khas_no, fallback.khasraNo ?? "--");
  const district = pick(attributes.n_d_name, fallback.district ?? "--");
  const tehsil = pick(attributes.n_t_name, fallback.tehsil ?? "--");
  const village = pick(attributes.n_v_name, fallback.village ?? "--");
  const breadcrumb = [district, tehsil, village]
    .filter((value) => value && value !== "--")
    .map((value, index) => (index === 0 ? `${value} District` : index === 1 ? `${value} Tehsil` : `Village ${value}`))
    .join(" > ") || "Haryana land record selection";

  return {
    district,
    districtCode,
    tehsil,
    tehsilCode,
    village,
    villageCode,
    murabbaNo,
    khasraNo,
    ownerName: pick(fallback.ownerName, "Loading..."),
    khewatNo: pick(fallback.khewatNo, "--"),
    khatoniNo: pick(fallback.khatoniNo, "--"),
    jamabandiYear: pick(fallback.jamabandiYear, "Loading..."),
    area: pick(fallback.area, "--"),
    landUse: pick(fallback.landUse, "--"),
    verificationStatus: "Fetching live details",
    recordType: pick(fallback.recordType, "Khasra"),
    mutationStatus: pick(fallback.mutationStatus, "--"),
    registryRef:
      districtCode && tehsilCode && villageCode
        ? `DLR-${[districtCode, tehsilCode, villageCode, murabbaNo, khasraNo].filter(Boolean).join("-")}`
        : "DLR-UNAVAILABLE",
    lastUpdated: "Loading live HSAC service details...",
    overview: "Parcel preview opened quickly. Additional details are loading.",
    breadcrumb,
    geometry,
  };
}

function createPopupLoadingPreview(fallbackParcel, mapPoint) {
  const fallback = fallbackParcel ?? {};
  return {
    district: fallback.district || "--",
    districtCode: fallback.districtCode || "",
    tehsil: fallback.tehsil || "--",
    tehsilCode: fallback.tehsilCode || "",
    village: fallback.village || "--",
    villageCode: fallback.villageCode || "",
    murabbaNo: "--",
    khasraNo: "--",
    ownerName: "Loading...",
    khewatNo: "--",
    khatoniNo: "--",
    jamabandiYear: "Loading...",
    area: "--",
    landUse: "--",
    verificationStatus: "Loading details",
    recordType: "Khasra",
    mutationStatus: "--",
    registryRef: "DLR-UNAVAILABLE",
    lastUpdated: "Please wait...",
    overview: "Fetching cadastral parcel details from live services.",
    breadcrumb: "Resolving clicked parcel",
    geometry: mapPoint ?? null,
  };
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

function createLatLongGraphic(point, latitude, longitude) {
  const latLabel = Number(latitude).toFixed(6);
  const lonLabel = Number(longitude).toFixed(6);

  return new Graphic({
    geometry: point,
    attributes: {
      title: "Selected Coordinate",
      latitude: latLabel,
      longitude: lonLabel,
    },
    symbol: {
      type: "simple-marker",
      style: "circle",
      color: [229, 115, 40, 0.95],
      size: 11,
      outline: { color: [255, 255, 255, 1], width: 2 },
    },
    popupTemplate: {
      title: "Selected Coordinate",
      content: `<strong>Latitude:</strong> ${latLabel}<br /><strong>Longitude:</strong> ${lonLabel}`,
    },
  });
}

// Public raster tile services — no ArcGIS API key required.
// The SDK 5.x built-in "classic" basemaps (hybrid, topo-vector, streets-vector) rely on
// cdn.arcgis.com VectorTile CDN items that fail without an API key, so we build
// explicit Basemap instances from these authenticated-free tile endpoints instead.
function getTileServiceUrls() {
  return {
    imagery: getRuntimeConfigValue("VITE_ARCGIS_IMAGERY_URL", ""),
    reference: getRuntimeConfigValue("VITE_ARCGIS_REFERENCE_URL", ""),
    topo: getRuntimeConfigValue("VITE_ARCGIS_TOPO_URL", ""),
    streets: getRuntimeConfigValue("VITE_ARCGIS_STREETS_URL", ""),
  };
}

const _basemapInstanceCache = {};

function resolveBasemap(activeBasemap) {
  const tileUrls = getTileServiceUrls();
  const id = basemapPresets[activeBasemap]?.basemapId ?? basemapPresets.satellite.basemapId;
  if (_basemapInstanceCache[id]) return _basemapInstanceCache[id];

  let basemap;
  switch (id) {
    case "satellite":
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: tileUrls.imagery })],
        title: "Imagery",
      });
      break;
    case "hybrid":
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: tileUrls.imagery })],
        referenceLayers: [new TileLayer({ url: tileUrls.reference })],
        title: "Hybrid",
      });
      break;
    case "topo-vector":
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: tileUrls.topo })],
        title: "Topographic",
      });
      break;
    case "streets-vector":
    default:
      basemap = new Basemap({
        baseLayers: [new TileLayer({ url: tileUrls.streets })],
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
  const layerVisibilityRef       = useLatestRef(layerVisibility);

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
    const initialExtent = defaultExtent.clone().expand(INITIAL_EXTENT_ZOOM_OUT_FACTOR);
    defaultExtentRef.current = initialExtent.clone();

    const updateHealth = (key, value) =>
      setServiceHealth((cur) => ({ ...cur, [key]: value }));
    let popupExtentHandle;
    let popupResizeHandle;
    let clickHandle;
    let zoomWatchHandle;
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
        visible: false,
      });
      const locationLayer   = new GraphicsLayer({ title: "Location search",    listMode: "hide" });
      const selectionLayer  = new GraphicsLayer({ title: "Feature selection",  listMode: "hide" });

      const map = new ArcGISMap({
        basemap: resolveBasemap(activeBasemap),
      });

      map.addMany([
        hsacCadastralLayer,
        hsacBoundariesLayer,
        locationLayer,
        boundaryLayer,
        selectionLayer,
        highlightLayer,
      ]);

      view = new MapView({
        container: containerRef.current,
        map,
        extent: initialExtent.clone(),
        constraints: { minZoom: 6, snapToZoom: false },
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
          hsacCadastralLayer,
          governmentAssetsLayer,
          nhaiLayer,
          roadsLayer,
          boundaryLayer,
          selectionLayer,
          highlightLayer,
          locationLayer,
        };

        // Live scale ratio — updates on every zoom/pan
        reactiveUtils.watch(
          () => view.scale,
          (newScale) => { if (!isDisposed) setMapScale(newScale); },
          { initial: true },
        );

        // Zoom-based cadastral visibility — hide cadastral when zoomed out past village level.
        // Parcels are invisible and the server renders nothing useful at low zoom anyway.
        zoomWatchHandle = reactiveUtils.watch(
          () => view.zoom,
          (zoom) => {
            if (isDisposed) return;
            const lyr = layersRef.current;
            const shouldShow = layerVisibilityRef.current.cadastral && zoom > CLICK_ZOOM.VILLAGE_MAX;
            if (lyr.hsacCadastralLayer) lyr.hsacCadastralLayer.visible = shouldShow;
            if (lyr.highlightLayer)     lyr.highlightLayer.visible     = shouldShow;
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
          loadLayerWithRetry(hsacCadastralLayer, { label: "Cadastral layer" }),
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

      clickHandle = view.on("click", async (event) => {
        const currentLayers = layersRef.current;
        if (currentLayers?.__selectionDrawing || currentLayers?.__measurementDrawing) {
          return;
        }

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
        const popupRequestId = ++cadastralPopupRequestCounter;

        const loadingPopup = createLandRecordPopupContent({
          parcel: createPopupLoadingPreview(selectedParcelRef.current, event.mapPoint),
          onClose: () => closeLandRecordMiniPopup(popupStateRef),
          onZoomToParcel: async () => {
            if (!event.mapPoint) return;
            await view
              .goTo({ target: event.mapPoint, zoom: Math.max(view.zoom ?? 13, 15) })
              .catch(() => undefined);
          },
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

    // Cadastral + parcel highlight — respect the zoom threshold (same rule as click handler)
    const currentZoom = viewRef.current?.zoom;
    const cadastralVisible = layerVisibility.cadastral && (currentZoom == null || currentZoom > CLICK_ZOOM.VILLAGE_MAX);
    if (layers.hsacCadastralLayer) layers.hsacCadastralLayer.visible = cadastralVisible;
    if (layers.highlightLayer)     layers.highlightLayer.visible     = cadastralVisible;

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
    new Promise(async (resolve) => {
      if (!navigator.geolocation || !viewRef.current) {
        resolve({ ok: false, message: "Geolocation is not available in this environment." });
        return;
      }

      const isSecureLocation =
        window.isSecureContext ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isSecureLocation) {
        resolve({
          ok: false,
          message:
            "Browser location access requires HTTPS or localhost. Run the app on localhost or an HTTPS server to see the location permission prompt.",
        });
        return;
      }

      try {
        const permissionStatus = await navigator.permissions?.query?.({ name: "geolocation" }).catch(() => null);
        if (permissionStatus?.state === "denied") {
          resolve({
            ok: false,
            message:
              "Location permission is denied. Please enable location access in your browser settings and try again.",
          });
          return;
        }
      } catch {
        // Ignore permission query errors and continue to request geolocation.
      }

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const point = new Point({ longitude: coords.longitude, latitude: coords.latitude });

          layersRef.current.locationLayer.removeAll();
          layersRef.current.locationLayer.add(createLocationGraphic(point, "Current Location"));

          await viewRef.current.goTo({ target: point, zoom: 14 }, { duration: 950, easing: "ease-in-out" });
          resolve({ ok: true, message: "Current location loaded and centred on the map." });
        },
        (err) => {
          let message = "Unable to access current location.";
          if (err?.code === 1) {
            message = "Location permission denied. Please allow location access in your browser.";
          } else if (err?.code === 2) {
            message = "Unable to determine location. Please try again.";
          } else if (err?.code === 3) {
            message = "Location request timed out. Please try again.";
          }
          resolve({ ok: false, message });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });

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
