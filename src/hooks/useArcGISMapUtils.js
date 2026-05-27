import { triggerPrint } from "@/utils/printUtils";
import Extent from "@arcgis/core/geometry/Extent.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import Graphic from "@arcgis/core/Graphic.js";
import Basemap from "@arcgis/core/Basemap.js";
import TileLayer from "@arcgis/core/layers/TileLayer.js";
import * as identify from "@arcgis/core/rest/identify.js";
import * as restQuery from "@arcgis/core/rest/query.js";
import IdentifyParameters from "@arcgis/core/rest/support/IdentifyParameters.js";
import Query from "@arcgis/core/rest/support/Query.js";
import { arcgisPortalConfig, basemapPresets } from "@/config/arcgis";
import { getRuntimeConfigValue } from "@/config/runtimeConfig";
import { PARCEL_FILL_SYMBOL } from "@/config/mapSymbols";
export function downloadLandRecordPreview(preview) {
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

export async function shareLandRecordPreview(preview) {
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
export const CLICK_ZOOM = { DISTRICT_MAX: 9, TEHSIL_MAX: 12, VILLAGE_MAX: 14 };

export function getPopupLocaleStrings() {
  const lang = (document?.documentElement?.dataset?.lang || "en").toLowerCase();
  if (lang === "hi") {
    return {
      ariaLabel: "भूमि अभिलेख जानकारी",
      title: "भूमि अभिलेख जानकारी",
      closeAria: "भूमि अभिलेख पॉपअप बंद करें",
      viewAria: "पूरा विवरण देखें",
      loading: "भूमि अभिलेख विवरण लोड हो रहा है...",
      district: "जिला",
      tehsil: "तहसील",
      village: "गांव",
      murabba: "मुरब्बा",
      khasra: "खसरा",
      ownerName: "मालिक का नाम",
      khewat: "खेवट",
      khatoni: "खतौनी",
      jamabandi: "जमाबंदी",
      area: "क्षेत्र(K-M)",
      updatedPrefix: "अपडेट ",
      view: "और देखें",
    };
  }

  return {
    ariaLabel: "Land record information",
    title: "Land Record Information",
    closeAria: "Close land record popup",
    viewAria: "View full land record details",
    loading: "Loading land record details...",
    district: "District",
    tehsil: "Tehsil",
    village: "Village",
    murabba: "Murabba",
    khasra: "Khasra",
    ownerName: "Owner Name",
    khewat: "Khewat",
    khatoni: "Khatoni",
    jamabandi: "Jamabandi",
    area: "Area(K-M)",
    updatedPrefix: "Updated ",
    view: "View More",
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout(promise, timeoutMs, timeoutMessage) {
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

export async function loadLayerWithRetry(layer, {
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

export function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function closeLandRecordMiniPopup(popupStateRef) {
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

export function positionLandRecordMiniPopup({ host, popupElement, screenPoint }) {
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

export function syncLandRecordMiniPopup({ popupStateRef, view }) {
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

export function showLandRecordMiniPopup({
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

export function createLandRecordPopupContent({
  parcel,
  onClose,
  onViewFullDetails,
}) {
  const preview = parcel;
  const s = getPopupLocaleStrings();
  const container = document.createElement("div");
  const verificationTone = /service linked|verified/i.test(preview.verificationStatus)
    ? "verified"
    : "review";

  container.className = "map-click-popup";
  container.innerHTML = `
    <section class="map-click-popup__card" aria-label="${s.ariaLabel}">
      <div class="map-click-popup__hero">

        <div class="map-click-popup__hero-top">
          <div class="map-click-popup__hero-copy">
            <h3>${s.title}</h3>
          </div>

          <div class="map-click-popup__hero-actions">
            <button
              type="button"
              class="map-click-popup__view-details"
              data-role="view-details"
              aria-label="${s.viewAria}"
              title="${s.viewAria}"
            >
              ${s.view}
            </button>
            <button
              type="button"
              class="map-click-popup__icon-button"
              data-role="close"
              aria-label="${s.closeAria}"
            >
              x
            </button>
          </div>
        </div>

        
      </div>

      <div class="map-click-popup__scroll">
        <div class="map-click-popup__loading ${/fetching|loading/i.test(preview.verificationStatus || "") ? "is-active" : ""}" data-role="popup-loading">
          <span class="map-click-popup__loading-spinner" aria-hidden="true"></span>
          <span>${s.loading}</span>
        </div>

        <div class="record-panel__details map-click-popup__details">
          <div class="info-row info-row--owner">
            <span>${s.ownerName}</span>
            <strong data-field="ownerName">${preview.ownerName}</strong>
          </div>
          <div class="info-row">
            <span>${s.jamabandi}</span>
            <strong data-field="jamabandiYear">${preview.jamabandiYear}</strong>
          </div>
          <div class="info-row">
            <span>${s.area}</span>
            <strong data-field="area">${preview.area}</strong>
          </div>
          <div class="info-row">
            <span>${s.khewat}</span>
            <strong data-field="khewatNo">${preview.khewatNo}</strong>
          </div>
          <div class="info-row">
            <span>${s.khatoni}</span>
            <strong data-field="khatoniNo">${preview.khatoniNo}</strong>
          </div>
        </div>

        <div class="map-click-popup__location">
          <div class="map-click-popup__metrics">
            <article class="map-click-popup__metric">
              <span>${s.khasra}</span>
              <strong data-field="khasraNo">${preview.khasraNo}</strong>
            </article>
            <article class="map-click-popup__metric">
              <span>${s.murabba}</span>
              <strong data-field="murabbaNo">${preview.murabbaNo}</strong>
            </article>
          </div>

          <div class="map-click-popup__selectors">
            <div class="map-click-popup__selector map-click-popup__selector--wide">
              <span>${s.village}</span>
              <div class="map-click-popup__select">
                <strong data-field="village">${preview.village}</strong>
                <small data-field="villageCode">${preview.villageCode || "--"}</small>
              </div>
            </div>

            <div class="map-click-popup__selector">
              <span>${s.tehsil}</span>
              <div class="map-click-popup__select">
                <strong data-field="tehsil">${preview.tehsil}</strong>
                <small data-field="tehsilCode">${preview.tehsilCode || "--"}</small>
              </div>
            </div>

            <div class="map-click-popup__selector">
              <span>${s.district}</span>
              <div class="map-click-popup__select">
                <strong data-field="district">${preview.district}</strong>
                <small data-field="districtCode">${preview.districtCode || "--"}</small>
              </div>
            </div>
          </div>
        </div>

        <div class="record-panel__status map-click-popup__status">
          <span class="badge badge--${verificationTone}" data-field="verificationStatus">${preview.verificationStatus}</span>
          <small data-field="lastUpdated">${s.updatedPrefix}${preview.lastUpdated}</small>
        </div>
      </div>
    </section>`;

  container.querySelector('[data-role="close"]')?.addEventListener("click", () => {
    onClose?.();
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

export function hydrateLandRecordPopupDetails(popupContainer, preview, options = {}) {
  if (!popupContainer || !preview) return;
  const s = getPopupLocaleStrings();
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
  applyText("lastUpdated", preview.lastUpdated, s.updatedPrefix);

  const loadingNode = popupContainer.querySelector('[data-role="popup-loading"]');
  if (loadingNode) {
    loadingNode.classList.toggle("is-active", keepLoading);
  }
}

/** Minimal fallback popup for cadastral sublayers. */
export const CADASTRAL_POPUP_TEMPLATE = {
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

export function normalizeParcelGeometry(parcelGeometry) {
  if (!parcelGeometry) return null;
  if (parcelGeometry.clone) return parcelGeometry.clone();
  if (parcelGeometry.rings) return new Polygon(parcelGeometry);
  if (Array.isArray(parcelGeometry)) {
    return new Polygon({ rings: [parcelGeometry], spatialReference: { wkid: 4326 } });
  }
  return null;
}

export function createParcelGraphic(parcel) {
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

export function createInstantParcelPreview({ attributes = {}, geometry = null, fallbackParcel }) {
  const lang = (document?.documentElement?.dataset?.lang || "en").toLowerCase();
  const isHindi = lang === "hi";
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
    .map((value, index) => (
      index === 0
        ? isHindi ? `${value} जिला` : `${value} District`
        : index === 1
          ? isHindi ? `${value} तहसील` : `${value} Tehsil`
          : isHindi ? `गांव ${value}` : `Village ${value}`
    ))
    .join(" > ") || (isHindi ? "हरियाणा भूमि अभिलेख चयन" : "Haryana land record selection");

  return {
    district,
    districtCode,
    tehsil,
    tehsilCode,
    village,
    villageCode,
    murabbaNo,
    khasraNo,
    ownerName: pick(fallback.ownerName, isHindi ? "लोड हो रहा है..." : "Loading..."),
    khewatNo: pick(fallback.khewatNo, "--"),
    khatoniNo: pick(fallback.khatoniNo, "--"),
    jamabandiYear: pick(fallback.jamabandiYear, isHindi ? "लोड हो रहा है..." : "Loading..."),
    area: pick(fallback.area, "--"),
    landUse: pick(fallback.landUse, "--"),
    verificationStatus: isHindi ? "लाइव विवरण प्राप्त किए जा रहे हैं" : "Fetching live details",
    recordType: pick(fallback.recordType, "Khasra"),
    mutationStatus: pick(fallback.mutationStatus, "--"),
    registryRef:
      districtCode && tehsilCode && villageCode
        ? `DLR-${[districtCode, tehsilCode, villageCode, murabbaNo, khasraNo].filter(Boolean).join("-")}`
        : "DLR-UNAVAILABLE",
    lastUpdated: isHindi ? "लाइव HSAC सेवा विवरण लोड हो रहा है..." : "Loading live HSAC service details...",
    overview: isHindi ? "पार्सल पूर्वावलोकन खुल गया है। अतिरिक्त विवरण लोड हो रहे हैं।" : "Parcel preview opened quickly. Additional details are loading.",
    breadcrumb,
    geometry,
  };
}

export function createPopupLoadingPreview(fallbackParcel, mapPoint) {
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

export function createLocationGraphic(point, title) {
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
      content: "Your current device location on the map.",
    },
  });
}

export function createLatLongGraphic(point, latitude, longitude) {
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
export function getTileServiceUrls() {
  return {
    imagery: getRuntimeConfigValue("VITE_ARCGIS_IMAGERY_URL", ""),
    reference: getRuntimeConfigValue("VITE_ARCGIS_REFERENCE_URL", ""),
    topo: getRuntimeConfigValue("VITE_ARCGIS_TOPO_URL", ""),
    streets: getRuntimeConfigValue("VITE_ARCGIS_STREETS_URL", ""),
  };
}

const _basemapInstanceCache = {};

export function resolveBasemap(activeBasemap) {
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

export function getVisibleCadastralLayerIds(layers) {
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

export function createClickSearchExtent(view, event, tolerance = 8) {
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

export async function queryCadastralParcelAtClick({ view, layers, event }) {
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

export async function identifyCadastralParcelAtPoint({ view, layers, mapPoint }) {
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

