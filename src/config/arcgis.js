// ─────────────────────────────────────────────────────────────────────────────
// HSAC Production MapServer — authoritative source for all Haryana land-record
// spatial data. Migrated from the old project's js/demo/url.js.
//
// All URL values are driven by VITE_* environment variables defined in .env.
// Hardcoded strings here act only as safe fallbacks — configure .env for real
// deployments.
// ─────────────────────────────────────────────────────────────────────────────

// Always use the official HSAC origin for MapServer calls. Proxy routing is
// handled by ArcGIS proxy rules (proxy.ashx) configured at app startup.
const _hsacOrigin = import.meta.env.VITE_HSAC_ORIGIN ?? "https://hsac.org.in";

// Security: VITE_HSAC_MAP_SERVICE_PATH MUST be set in production .env.
// The empty fallback ensures staging service names never leak into production bundles.
// If this is missing, map queries will fail visibly rather than silently use a staging service.
const _mapServicePath = import.meta.env.VITE_HSAC_MAP_SERVICE_PATH ?? "";

export const HSAC_MAIN_URL = `${_hsacOrigin}${_mapServicePath}`;

// Sub-layer index constants within the HSAC MapServer.
// TODO (ArcGIS Server admin): Enforce layer-level security on the MapServer so that
// only authenticated/IP-allowlisted clients can query these sublayers directly.
// Client-side layer IDs alone are not a security boundary.
export const HSAC_LAYER = {
  DISTRICT: 26, // District boundary polygons  — fields: n_d_code, n_d_name
  TEHSIL:   27, // Tehsil boundary polygons    — fields: n_t_code, n_t_name
  VILLAGE:  28, // Village boundary polygons   — fields: n_v_code, n_v_name
  MURABBA:  30, // Murabba boundary polygons   — fields: n_murr_no
  // Cadastral sub-layers: sublayer id == numeric district code (leading "0" stripped)
  // e.g.  district code "09" (Kaithal) → sublayer id 9
  //        district code "10" (Karnal)  → sublayer id 10
};

// All 22 Haryana districts with their HSAC MapServer cadastral sublayer IDs.
// Migrated from esri.js dynamicMapServiceLayer sublayer definitions.
export const DISTRICT_SUBLAYERS = [
  { id: 1,  code: "01", name: "Ambala" },
  { id: 2,  code: "02", name: "Bhiwani" },
  { id: 3,  code: "03", name: "Faridabad" },
  { id: 4,  code: "04", name: "Fatehabad" },
  { id: 5,  code: "05", name: "Gurugram" },
  { id: 6,  code: "06", name: "Hisar" },
  { id: 7,  code: "07", name: "Jhajjar" },
  { id: 8,  code: "08", name: "Jind" },
  { id: 9,  code: "09", name: "Kaithal" },
  { id: 10, code: "10", name: "Karnal" },
  { id: 11, code: "11", name: "Kurukshetra" },
  { id: 12, code: "12", name: "Mahendragad" },
  { id: 13, code: "13", name: "Panchkula" },
  { id: 14, code: "14", name: "Panipat" },
  { id: 15, code: "15", name: "Rewari" },
  { id: 16, code: "16", name: "Rohtak" },
  { id: 17, code: "17", name: "Sirsa" },
  { id: 18, code: "18", name: "Sonipat" },
  { id: 19, code: "19", name: "Yamunanagar" },
  { id: 20, code: "20", name: "Mewat" },
  { id: 21, code: "21", name: "Palwal" },
  { id: 22, code: "22", name: "Charkhi Dadri" },
];

export const arcgisPortalConfig = {
  // Default extent covers all of Haryana
  defaultExtent: {
    xmin: 74.88,
    ymin: 27.58,
    xmax: 77.62,
    ymax: 30.96,
    spatialReference: { wkid: 4326 },
  },

  serviceUrls: {
    // ArcGIS geocoding — set VITE_ARCGIS_API_KEY in .env for premium usage.
    geocoder:
      import.meta.env.VITE_ARCGIS_GEOCODER_URL ??
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer",

    // Haryana state outline — thick green border around all of Haryana.
    haryanaBoundary:
      import.meta.env.VITE_HARYANA_BOUNDARY_URL ??
      "https://services1.arcgis.com/qN3V93cYGMKQCOxL/arcgis/rest/services/HARYANA_BOUNDARY/FeatureServer/0",

    // ── HSAC / HSACGGM servers (migrated from old project url.js) ────────────
    hsacMain: HSAC_MAIN_URL,

    governmentAssets:
      import.meta.env.VITE_HSACGGM_ASSETS_URL ??
      "https://hsacggm.in/server/rest/services/Onemap_Haryana/Government_Assets/MapServer",

    nhaiRoads:
      import.meta.env.VITE_NHAI_ROADS_URL ??
      "https://onemapggm.gmda.gov.in/server/rest/services/NHAI_All/MapServer",

    haryanaRoads:
      import.meta.env.VITE_HARYANA_ROADS_URL ??
      "https://hsacggm.in/server/rest/services/Onemap_Haryana/Haryana_Roads/MapServer",
  },

  // Boundary sub-layers shown in LayerPanel toggles
  boundarySublayers: [
    { id: HSAC_LAYER.DISTRICT, key: "district", title: "District boundaries" },
    { id: HSAC_LAYER.TEHSIL,   key: "tehsil",   title: "Tehsil boundaries" },
    { id: HSAC_LAYER.VILLAGE,  key: "village",  title: "Village boundaries" },
  ],

  // Additional operational overlay layers shown in LayerPanel
  operationalLayers: [
    { key: "assets", title: "Government Assets",  description: "Govt. infrastructure from HSACGGM" },
    { key: "roads",  title: "HR Road Infra",       description: "Haryana road network overlay" },
    { key: "nhai",   title: "NHAI (Upcoming)",     description: "National Highway Authority of India" },
  ],
};

const _arcgisThumb = (name) =>
  `${import.meta.env.BASE_URL}arcgis/assets/esri/images/basemap/${name}`;

export const basemapPresets = {
  satellite: {
    id: "satellite",
    label: "Imagery",
    description: "High-resolution satellite imagery",
    basemapId: "satellite",
    thumbnail: _arcgisThumb("satellite.jpg"),
  },
  cadastral: {
    id: "cadastral",
    label: "Hybrid",
    description: "Imagery with labels and boundary context",
    basemapId: "hybrid",
    thumbnail: _arcgisThumb("hybrid.jpg"),
  },
  topo: {
    id: "topo",
    label: "Topo",
    description: "Terrain and road context",
    basemapId: "topo-vector",
    thumbnail: _arcgisThumb("topo-vector.jpg"),
  },
  streets: {
    id: "streets",
    label: "Streets",
    description: "Road network and local address context",
    basemapId: "streets-vector",
    thumbnail: _arcgisThumb("streets-vector.jpg"),
  },
};
