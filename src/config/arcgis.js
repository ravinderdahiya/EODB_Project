import { getRuntimeConfigValue } from "@/config/runtimeConfig";

export function getHsacMainUrl() {
  const hsacMainUrl = getRuntimeConfigValue("VITE_HSAC_MAIN_URL", "");
  return `${hsacMainUrl}`.replace(/\/+$/, "");
}

const serviceUrls = {
  get geocoder() {
    return getRuntimeConfigValue("VITE_ARCGIS_GEOCODER_URL", "");
  },
  get haryanaBoundary() {
    return getRuntimeConfigValue("VITE_HARYANA_BOUNDARY_URL", "");
  },
  get hsacMain() {
    return getHsacMainUrl();
  },
  get governmentAssets() {
    return getRuntimeConfigValue("VITE_HSACGGM_ASSETS_URL", "");
  },
  get nhaiRoads() {
    return getRuntimeConfigValue("VITE_NHAI_ROADS_URL", "");
  },
  get haryanaRoads() {
    return getRuntimeConfigValue("VITE_HARYANA_ROADS_URL", "");
  },
};

export const HSAC_LAYER = {
  NEARBY_PLACES_GROUP: 23,
  POI: 24,
  BOUNDARIES_GROUP: 25,
  DISTRICT: 26,
  TEHSIL: 27,
  VILLAGE: 28,
  MURABBA_GROUP: 29,
  MURABBA: 30,
  STATE_BOUNDARY: 31,
};

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
  defaultExtent: {
    xmin: 74.88,
    ymin: 27.58,
    xmax: 77.62,
    ymax: 30.96,
    spatialReference: { wkid: 4326 },
  },
  serviceUrls,
  boundarySublayers: [
    { id: HSAC_LAYER.DISTRICT, key: "district", title: "District boundaries", description: "23 Districts of Haryana" },
    { id: HSAC_LAYER.TEHSIL, key: "tehsil", title: "Tehsil boundaries", description: "143 Tehsils of Haryana" },
    { id: HSAC_LAYER.VILLAGE, key: "village", title: "Village boundaries", description: "7,103 Villages of Haryana" },
  ],
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
