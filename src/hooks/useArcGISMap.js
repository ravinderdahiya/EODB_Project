/**
 * useArcGISMap.js
 *
 * Core map hook for the Haryana land-record portal.
 *
 * Migration changes from old project (esri.js + MapView.js):
 *   • Replaces ArcGIS Online placeholder FeatureLayers with the real HSAC
 *     MapImageLayer (https://hsac.org.in/server/rest/services/EODB/EODB_HR21/MapServer)
 *   • Adds Cadastral MapImageLayer (district sublayers 1-22) with popup template
 *   • Adds Government Assets, NHAI, and Haryana Roads operational layers
 *   • Adds `boundaryLayer` GraphicsLayer for drawBoundary query results
 *   • Exposes `drawBoundary(type, codes)` for SearchPanel-driven boundary highlights
 *   • All service URLs centralised in src/config/arcgis.js
 */

import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import Graphic from "@arcgis/core/Graphic.js";
import Map from "@arcgis/core/Map.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
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
import { getOwnerNames } from "@/services/landRecordService";

// ─── Symbol constants ────────────────────────────────────────────────────────

/** Orange highlight — used for selected parcel (mock / openSelectedParcel) */
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

/**
 * Build one row for the Khasra popup info table.
 * @param {string} label
 * @param {string|null} value
 * @returns {string}
 */
function popupRow(label, value) {
  if (!value) return "";
  return `<tr>
    <td style="font-size:11px;color:#888;padding:2px 12px 2px 0;white-space:nowrap">${label}</td>
    <td style="font-size:12px;padding:2px 0">${value}</td>
  </tr>`;
}

/**
 * Popup template applied to each cadastral district sublayer.
 * Migrated from esri.js `template` + ownersInPopup.js:
 *   - Static fields: District, Tehsil, Village, Murabba, Khasra
 *   - Owners: fetched async from
 *     https://hsac.org.in/LandOwnerAPI/getownername.asmx/Owner_name
 *     (proxied via /LandOwnerAPI/ in dev — see vite.config.js)
 *
 * Pattern: content() returns a DOM element immediately, then the owners
 * section is updated in-place once the ASMX call resolves — avoids any
 * need for ArcGIS to await a Promise from the content function.
 */
const CADASTRAL_POPUP_TEMPLATE = {
  title: "Khasra {n_khas_no}",
  outFields: ["*"],
  content: (feature) => {
    const a = feature.graphic.attributes ?? {};

    // ── Container returned immediately ────────────────────────────────────────
    const container = document.createElement("div");
    container.style.cssText = "font-family:inherit;line-height:1.4";

    container.innerHTML = `
      <table style="border-collapse:collapse;margin-bottom:10px">
        ${popupRow("District",  a.n_d_name  ? `${a.n_d_name} (${a.n_d_code})`  : a.n_d_code)}
        ${popupRow("Tehsil",    a.n_t_name  ? `${a.n_t_name} (${a.n_t_code})`  : a.n_t_code)}
        ${popupRow("Village",   a.n_v_name  ? `${a.n_v_name} (${a.n_v_code})`  : a.n_v_code)}
        ${popupRow("Murabba",   a.n_murr_no)}
        ${popupRow("Khasra",    a.n_khas_no)}
      </table>
      <div style="font-size:11px;font-weight:600;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">
        Owners
      </div>
      <div class="eodb-popup-owners" style="font-size:12px;color:#888;font-style:italic">
        Loading…
      </div>`;

    // ── Async owner fetch — updates DOM when ASMX responds ───────────────────
    // Migrated from: demo/ownersInPopup.js → Owners_name()
    const ownerEl = container.querySelector(".eodb-popup-owners");

    getOwnerNames(a.n_d_code, a.n_t_code, a.n_v_code, a.n_murr_no, a.n_khas_no)
      .then((owners) => {
        if (!ownerEl) return;
        if (owners.length === 0) {
          ownerEl.textContent = "No owner data available.";
          ownerEl.style.fontStyle = "italic";
          return;
        }
        ownerEl.style.fontStyle = "normal";
        ownerEl.style.color     = "inherit";
        ownerEl.innerHTML = `<ul style="margin:0;padding-left:16px">
          ${owners.map((o) => `<li>${o}</li>`).join("")}
        </ul>`;
      })
      .catch(() => {
        if (ownerEl) {
          ownerEl.textContent   = "Owner data unavailable (service error).";
          ownerEl.style.color   = "#c0392b";
          ownerEl.style.fontStyle = "italic";
        }
      });

    return container;
  },
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

export function useArcGISMap({ activeBasemap, layerVisibility, selectedParcel, onParcelSelect }) {
  const containerRef         = useRef(null);
  const viewRef              = useRef(null);
  const defaultExtentRef     = useRef(null);
  const layersRef            = useRef({});
  const onParcelSelectRef    = useRef(onParcelSelect);
  const selectedParcelRef    = useRef(selectedParcel);

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

    // ── Graphics layers ───────────────────────────────────────────────────────
    // boundaryLayer: drawBoundary() query results (blue outline)
    // highlightLayer: selected parcel highlight (orange fill)
    // locationLayer: geocoded / GPS location pin
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
      popup: { dockEnabled: false, collapseEnabled: true },
    });

    view.ui.components = []; // remove all default widgets (custom toolbar handles them)

    view.when(() => {
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
      setMapStatus("HSAC Haryana map is live with district / tehsil / village boundaries.");
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

    // Click handler: highlight layer parcel click
    const clickHandle = view.on("click", async (event) => {
      const response = await view
        .hitTest(event, { include: [highlightLayer] })
        .catch(() => null);

      const hit = response?.results?.find((r) => r.graphic?.layer === highlightLayer);

      if (hit && selectedParcelRef.current) {
        onParcelSelectRef.current?.(selectedParcelRef.current);
        setMapStatus(`Land record ${selectedParcelRef.current.khasraNo} already focused on the map.`);
        return;
      }

      setMapStatus("Use the search panel or dropdowns to focus a land record on the map.");
    });

    return () => {
      layersRef.current = {};
      viewRef.current   = null;
      setMapReady(false);
      clickHandle.remove();
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
    if (!selectedParcel || !layersRef.current.highlightLayer || !viewRef.current) return;

    const graphic = createParcelGraphic(selectedParcel);
    if (!graphic) return;

    layersRef.current.highlightLayer.removeAll();
    layersRef.current.highlightLayer.add(graphic);

    viewRef.current
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

  /**
   * drawBoundary — query the HSAC MapServer for boundary geometry and
   * render it on the map using the boundaryLayer GraphicsLayer.
   * Replaces the old demo/drawBoundary.js → boundaryOf() function.
   *
   * @param {"district"|"tehsil"|"village"|"murabba"|"khasra"} type
   * @param {{ dCode, tCode, vCode, murabbaNo, khasraNo }} codes
   */
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
    drawBoundary,
  };
}
