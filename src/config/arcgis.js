// ─────────────────────────────────────────────────────────────────────────────
// HSAC Production MapServer — authoritative source for all Haryana land-record
// spatial data. Migrated from the old project's js/demo/url.js.
//
// All URL values are driven by backend runtime config (api_url table).
// Frontend fallbacks point only to backend proxy routes.
// ─────────────────────────────────────────────────────────────────────────────

import { getRuntimeConfigValue } from "@/config/runtimeConfig";

const _hsacMainUrl = getRuntimeConfigValue("VITE_HSAC_MAIN_URL", "/mapserver/service/hsacMain");
export const HSAC_MAIN_URL = `${_hsacMainUrl}`.replace(/\/+$/, "");

// Sub-layer index constants within the HSAC MapServer.
// TODO (ArcGIS Server admin): Enforce layer-level security on the MapServer so that
// only authenticated/IP-allowlisted clients can query these sublayers directly.
// Client-side layer IDs alone are not a security boundary.
export const HSAC_LAYER = {
    DISTRICT: 26, // District boundary polygons  — fields: n_d_code, n_d_name
    TEHSIL: 27, // Tehsil boundary polygons    — fields: n_t_code, n_t_name
    VILLAGE: 28, // Village boundary polygons   — fields: n_v_code, n_v_name
    MURABBA: 30, // Murabba boundary polygons   — fields: n_murr_no
    // Cadastral sub-layers: sublayer id == numeric district code (leading "0" stripped)
    // e.g.  district code "09" (Kaithal) → sublayer id 9
    //        district code "10" (Karnal)  → sublayer id 10
};

// All 22 Haryana districts with their HSAC MapServer cadastral sublayer IDs.
// Migrated from esri.js dynamicMapServiceLayer sublayer definitions.
export const DISTRICT_SUBLAYERS = [
    { id: 1, code: "01", name: "Ambala" },
    { id: 2, code: "02", name: "Bhiwani" },
    { id: 3, code: "03", name: "Faridabad" },
    { id: 4, code: "04", name: "Fatehabad" },
    { id: 5, code: "05", name: "Gurugram" },
    { id: 6, code: "06", name: "Hisar" },
    { id: 7, code: "07", name: "Jhajjar" },
    { id: 8, code: "08", name: "Jind" },
    { id: 9, code: "09", name: "Kaithal" },
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
        // ArcGIS geocoding through backend proxy.
        geocoder: getRuntimeConfigValue(
            "VITE_ARCGIS_GEOCODER_URL",
            "/mapserver/service/geocoder",
        ),

        // Haryana state outline — thick green border around all of Haryana.
        haryanaBoundary: getRuntimeConfigValue(
            "VITE_HARYANA_BOUNDARY_URL",
            "/mapserver/service/haryanaBoundary",
        ),

        // ── HSAC / HSACGGM servers (migrated from old project url.js) ────────────
        hsacMain: HSAC_MAIN_URL,

        governmentAssets: getRuntimeConfigValue(
            "VITE_HSACGGM_ASSETS_URL",
            "/mapserver/service/governmentAssets",
        ),

        nhaiRoads: getRuntimeConfigValue(
            "VITE_NHAI_ROADS_URL",
            "/mapserver/service/nhaiRoads",
        ),

        haryanaRoads: getRuntimeConfigValue(
            "VITE_HARYANA_ROADS_URL",
            "/mapserver/service/haryanaRoads",
        ),
    },

    // Boundary sub-layers shown in LayerPanel toggles
    boundarySublayers: [
        { id: HSAC_LAYER.DISTRICT, key: "district", title: "District boundaries", description: "23 Districts of Haryana" },
        { id: HSAC_LAYER.TEHSIL, key: "tehsil", title: "Tehsil boundaries", description: "94 Tehsils of Haryana" },
        { id: HSAC_LAYER.VILLAGE, key: "village", title: "Village boundaries", description: "6,841 Villages of Haryana" },
    ],

    // Additional operational overlay layers shown in LayerPanel
    operationalLayers: [
        { key: "assets", title: "Government Assets", description: "Govt. infrastructure from HSACGGM" },
        { key: "roads", title: "HR Road Infra", description: "Haryana road network overlay" },
        { key: "nhai", title: "NHAI (Upcoming)", description: "National Highway Authority of India" },
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