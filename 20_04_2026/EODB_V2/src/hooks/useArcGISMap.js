/**
 * Core ArcGIS hook for the Haryana land-record portal.
 * Keeps the map wired to the migrated HSAC service stack from the legacy app.
 */

import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import Graphic from "@arcgis/core/Graphic.js";
import Map from "@arcgis/core/Map.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import * as locator from "@arcgis/core/rest/locator.js";
import {
  arcgisPortalConfig,
  basemapPresets,
  DISTRICT_SUBLAYERS,
  HSAC_LAYER,
} from "@/config/arcgis";
import { getBoundaryGeometry } from "@/services/mapQueryService";
import { createParcelRecordFromMapFeature } from "@/services/parcelRecordService";

// ─── Symbol constants ────────────────────────────────────────────────────────

/** Orange highlight used for the active parcel selection. */
const PARCEL_FILL_SYMBOL = {
  type: "simple-fill",
  color: [244, 168, 34, 0.16],
  outline: { color: [237, 154, 29, 0.94], width: 2.6 },
};

/** Blue-green fill — used for drawBoundary query results (district/tehsil/village/murabba/khasra) */
const BOUNDARY_FILL_SYMBOL = {
  type: "simple-fill",
  color: [0, 110, 180, 0.08],
  outline: { color: [0, 85, 160, 0.85], width: 2.2 },
};

const DEMO_BOUNDARY_SYMBOL = {
  type: "simple-fill",
  color: [236, 200, 78, 0.18],
  outline: { color: [225, 166, 25, 0.96], width: 3 },
};

function createDemoBoundaryParcel() {
  const geometry = new Polygon({
    rings: [[
      [76.3506, 29.8247],
      [76.3554, 29.8229],
      [76.3541, 29.8182],
      [76.3491, 29.8168],
      [76.3452, 29.8198],
      [76.3463, 29.8236],
      [76.3506, 29.8247],
    ]],
    spatialReference: { wkid: 4326 },
  });

  return {
    district: "Kaithal",
    districtCode: "",
    tehsil: "Guhla",
    tehsilCode: "",
    village: "Bhagal",
    villageCode: "",
    murabbaNo: "38",
    khasraNo: "1070",
    ownerName: "Demo Owner",
    khewatNo: "DEMO-KHEWAT-01",
    khatoniNo: "DEMO-KHATONI-01",
    jamabandiYear: "2025-26",
    area: "2.5 Acres",
    landUse: "Agricultural",
    verificationStatus: "Demo boundary",
    recordType: "Khasra",
    mutationStatus: "Testing only",
    registryRef: "DLR-DEMO-38-1070",
    lastUpdated: "Demo dataset",
    overview: "This demo parcel boundary is placed on the map for popup, click, and boundary testing.",
    breadcrumb: "Kaithal District > Guhla Tehsil > Village Bhagal",
    geometry,
  };
}

function createDemoBoundaryGraphic(parcel) {
  return new Graphic({
    geometry: parcel.geometry,
    symbol: DEMO_BOUNDARY_SYMBOL,
    attributes: {
      __demoBoundary: true,
      n_d_name: parcel.district,
      n_t_name: parcel.tehsil,
      n_v_name: parcel.village,
      n_murr_no: parcel.murabbaNo,
      n_khas_no: parcel.khasraNo,
    },
    popupTemplate: CADASTRAL_POPUP_TEMPLATE,
  });
}

async function loadDemoBoundaryPreview({ boundaryLayer, view }) {
  const demoParcel = createDemoBoundaryParcel();
  const demoGraphic = createDemoBoundaryGraphic(demoParcel);

  boundaryLayer.removeAll();
  boundaryLayer.add(demoGraphic);

  await view.goTo(
    { target: demoParcel.geometry.extent.expand(18) },
    { duration: 950, easing: "ease-in-out" },
  ).catch(() => undefined);

  return {
    ok: true,
    parcel: demoParcel,
    message: "Demo boundary loaded near Kaithal. Click inside it to test the land-record popup.",
  };
}

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
        <div class="map-click-popup__eyebrow">Interactive parcel preview</div>

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
              aria-label="Zoom to parcel"
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

        <div class="map-click-popup__headline">
          <strong>Khasra ${preview.khasraNo}</strong>
          <span>${preview.registryRef}</span>
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
            <span>Area</span>
            <strong>${preview.area}</strong>
          </article>
          <article class="map-click-popup__metric">
            <span>Land Use</span>
            <strong>${preview.landUse}</strong>
          </article>
          <article class="map-click-popup__metric">
            <span>Record</span>
            <strong>${preview.recordType}</strong>
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
            <span>Mutation</span>
            <strong>${preview.mutationStatus}</strong>
          </div>
        </div>

        <div class="record-panel__status map-click-popup__status">
          <span class="badge badge--${verificationTone}">${preview.verificationStatus}</span>
          <small>Updated ${preview.lastUpdated}</small>
        </div>

        <p class="map-click-popup__overview">${preview.overview}</p>

        <button type="button" class="primary-button map-click-popup__primary" data-role="view-details">
          View Full Details
        </button>

        <div class="record-panel__actions map-click-popup__actions">
          <button type="button" class="action-link" data-role="print">Print</button>
          <button type="button" class="action-link" data-role="share">Share</button>
          <button type="button" class="action-link" data-role="download">Download</button>
        </div>
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
    window.print();
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

function resolveBasemapId(activeBasemap) {
  return basemapPresets[activeBasemap]?.basemapId ?? basemapPresets.cadastral.basemapId;
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
  const demoBoundaryLoadedRef = useRef(false);
  const onParcelSelectRef    = useRef(onParcelSelect);
  const selectedParcelRef    = useRef(selectedParcel);
  const onPreviewFullDetailsRef = useRef(onPreviewFullDetails);

  const [mapReady,     setMapReady]     = useState(false);
  const [mapStatus,    setMapStatus]    = useState("Initialising Haryana land-record map…");
  const [serviceHealth, setServiceHealth] = useState({
    cadastral:  "loading",
    boundaries: "loading",
    assets:     "loading",
  });

  // Keep latest callback / parcel in refs so effects don't re-run on each render
  useEffect(() => { onParcelSelectRef.current = onParcelSelect; }, [onParcelSelect]);
  useEffect(() => { selectedParcelRef.current = selectedParcel; }, [selectedParcel]);
  useEffect(() => { onPreviewFullDetailsRef.current = onPreviewFullDetails; }, [onPreviewFullDetails]);

  // ── Map initialisation (runs once) ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return undefined;

    esriConfig.assetsPath = "/assets";
    if (import.meta.env.VITE_ARCGIS_API_KEY) {
      esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
    }

    const defaultExtent = new Extent(arcgisPortalConfig.defaultExtent);
    defaultExtentRef.current = defaultExtent;

    const updateHealth = (key, value) =>
      setServiceHealth((cur) => ({ ...cur, [key]: value }));

    // ── Boundary layer (District 26 / Tehsil 27 / Village 28 / Murabba 30) ───
    // Migrated from: esri.js `Boundaries` MapImageLayer
    const hsacBoundariesLayer = new MapImageLayer({
      url:     arcgisPortalConfig.serviceUrls.hsacMain,
      title:   "Boundaries",
      visible: true,
      sublayers: [
        { id: HSAC_LAYER.MURABBA,  title: "Murabba",  visible: false },
        { id: HSAC_LAYER.VILLAGE,  title: "Village",  visible: layerVisibility.village },
        { id: HSAC_LAYER.TEHSIL,   title: "Tehsil",   visible: layerVisibility.tehsil },
        { id: HSAC_LAYER.DISTRICT, title: "District", visible: layerVisibility.district },
      ],
    });

    // ── Cadastral layer (district sublayers 1-22 + popup template) ───────────
    // Migrated from: esri.js `dynamicMapServiceLayer` MapImageLayer
    const hsacCadastralLayer = new MapImageLayer({
      url:     arcgisPortalConfig.serviceUrls.hsacMain,
      title:   "Cadastral",
      visible: layerVisibility.cadastral,
      sublayers: DISTRICT_SUBLAYERS.map(({ id, name }) => ({
        id,
        title:         name,
        popupTemplate: CADASTRAL_POPUP_TEMPLATE,
      })),
    });

    // ── Government Assets ─────────────────────────────────────────────────────
    // Migrated from: esri.js `karnal` MapImageLayer
    const governmentAssetsLayer = new MapImageLayer({
      url:     arcgisPortalConfig.serviceUrls.governmentAssets,
      title:   "Government Assets",
      visible: layerVisibility.assets ?? false,
    });

    // ── NHAI ──────────────────────────────────────────────────────────────────
    // Migrated from: esri.js `NHAI` MapImageLayer  (visible: false by default)
    const nhaiLayer = new MapImageLayer({
      url:     arcgisPortalConfig.serviceUrls.nhaiRoads,
      title:   "NHAI (Upcoming)",
      visible: layerVisibility.nhai ?? false,
    });

    // ── Haryana Roads ─────────────────────────────────────────────────────────
    // Migrated from: esri.js `RoadInfra` MapImageLayer (visible: false by default)
    const roadsLayer = new MapImageLayer({
      url:     arcgisPortalConfig.serviceUrls.haryanaRoads,
      title:   "HR Road Infra",
      visible: layerVisibility.roads ?? false,
    });

    const boundaryLayer  = new GraphicsLayer({ title: "Boundary selection", listMode: "hide" });
    const highlightLayer = new GraphicsLayer({ title: "Selected parcel",    listMode: "hide", visible: layerVisibility.cadastral });
    const locationLayer  = new GraphicsLayer({ title: "Location search",    listMode: "hide" });

    const map = new Map({
      basemap: resolveBasemapId(activeBasemap),
    });

    // Layer add order (bottom → top):
    // Roads → NHAI → Cadastral → Assets → Boundaries → Location → Boundary → Highlight
    map.addMany([
      roadsLayer,
      nhaiLayer,
      hsacCadastralLayer,
      governmentAssetsLayer,
      hsacBoundariesLayer,
      locationLayer,
      boundaryLayer,
      highlightLayer,
    ]);

    const view = new MapView({
      container: containerRef.current,
      map,
      extent: defaultExtent.clone(),
      constraints: { minZoom: 7, maxZoom: 19 },
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

    view.ui.components = []; // remove all default widgets (custom toolbar handles them)
    view.popupEnabled = false;

    const popupHost = document.createElement("div");
    popupHost.className = "map-click-popup-host";
    containerRef.current.append(popupHost);
    popupStateRef.current.host = popupHost;

    view.when(async () => {
      viewRef.current = view;
      layersRef.current = {
        map,
        hsacBoundariesLayer,
        hsacCadastralLayer,
        governmentAssetsLayer,
        nhaiLayer,
        roadsLayer,
        boundaryLayer,
        highlightLayer,
        locationLayer,
      };
      setMapReady(true);

      if (!demoBoundaryLoadedRef.current) {
        demoBoundaryLoadedRef.current = true;
        const demoResult = await loadDemoBoundaryPreview({
          boundaryLayer,
          view,
        }).catch(() => null);

        setMapStatus(
          demoResult?.message || "HSAC Haryana map is live with district / tehsil / village boundaries.",
        );
        return;
      }

      setMapStatus("HSAC Haryana map is live with district / tehsil / village boundaries.");
    });

    const popupExtentHandle = view.watch("extent", () => {
      syncLandRecordMiniPopup({ popupStateRef, view });
    });
    const popupResizeHandle = view.on("resize", () => {
      syncLandRecordMiniPopup({ popupStateRef, view });
    });

    // Service health checks
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

    // Click handler: open a land-record popup at the clicked map point.
    const clickHandle = view.on("click", async (event) => {
      const response = await view
        .hitTest(event)
        .catch(() => null);

      const hit = response?.results?.find((r) => r.graphic?.layer === highlightLayer);
      const cadastralHit = response?.results?.find(
        (r) => r.graphic?.attributes?.n_khas_no || r.graphic?.attributes?.n_v_name,
      );

      if (hit && selectedParcelRef.current) {
        onParcelSelectRef.current?.(selectedParcelRef.current);
      }

      if (!cadastralHit && !hit) {
        closeLandRecordMiniPopup(popupStateRef);
        view.closePopup();
        return;
      }

      const demoFallbackParcel =
        cadastralHit?.graphic?.attributes?.__demoBoundary
          ? createDemoBoundaryParcel()
          : null;

      const previewRecord = await createParcelRecordFromMapFeature({
        attributes: cadastralHit?.graphic?.attributes,
        geometry:
          cadastralHit?.graphic?.geometry ??
          hit?.graphic?.geometry ??
          normalizeParcelGeometry(selectedParcelRef.current?.geometry),
        fallbackParcel: demoFallbackParcel ?? selectedParcelRef.current,
      }).catch(() => demoFallbackParcel ?? selectedParcelRef.current);

      if (!previewRecord) {
        closeLandRecordMiniPopup(popupStateRef);
        setMapStatus("No land record preview is available for this map click.");
        return;
      }

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
            await view.goTo(targetGeometry.extent.expand(0.5)).catch(() => undefined);
            return;
          }

          await view
            .goTo({ target: targetGeometry, zoom: Math.max(view.zoom ?? 15, 17) })
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

    return () => {
      layersRef.current = {};
      viewRef.current   = null;
      setMapReady(false);
      closeLandRecordMiniPopup(popupStateRef);
      popupExtentHandle.remove();
      popupResizeHandle.remove();
      clickHandle.remove();
      popupStateRef.current.host?.remove();
      popupStateRef.current.host = null;
      view.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layer visibility + basemap sync ─────────────────────────────────────────
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers.map) return;

    layers.map.basemap = resolveBasemapId(activeBasemap);

    // Boundary sub-layer visibility
    const distSub  = layers.hsacBoundariesLayer?.findSublayerById(HSAC_LAYER.DISTRICT);
    const tehSub   = layers.hsacBoundariesLayer?.findSublayerById(HSAC_LAYER.TEHSIL);
    const vilSub   = layers.hsacBoundariesLayer?.findSublayerById(HSAC_LAYER.VILLAGE);
    if (distSub) distSub.visible = layerVisibility.district;
    if (tehSub)  tehSub.visible  = layerVisibility.tehsil;
    if (vilSub)  vilSub.visible  = layerVisibility.village;

    // Cadastral + parcel highlight
    if (layers.hsacCadastralLayer) layers.hsacCadastralLayer.visible = layerVisibility.cadastral;
    if (layers.highlightLayer)     layers.highlightLayer.visible     = layerVisibility.cadastral;

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

    layers.map.basemap = resolveBasemapId(activeBasemap);

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
      return { ok: false, message: "Select a land parcel first." };
    }

    const geometry = normalizeParcelGeometry(selectedParcel.geometry);
    if (!geometry) {
      return { ok: false, message: "This record does not have parcel geometry to highlight." };
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

  const loadDemoBoundary = async () => {
    if (!layersRef.current.boundaryLayer || !viewRef.current) {
      return { ok: false, message: "Map is not ready yet for the demo boundary." };
    }

    const result = await loadDemoBoundaryPreview({
      boundaryLayer: layersRef.current.boundaryLayer,
      view: viewRef.current,
    }).catch(() => null);

    return result ?? { ok: false, message: "Unable to load the demo boundary right now." };
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
    mapReady,
    mapStatus,
    serviceHealth,
    zoomIn,
    zoomOut,
    resetView,
    refreshOperationalLayers,
    goToCurrentLocation,
    searchPlace,
    openSelectedParcel,
    loadDemoBoundary,
    drawBoundary,
  };
}
