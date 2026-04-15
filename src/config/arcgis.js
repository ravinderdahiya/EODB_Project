export const arcgisPortalConfig = {
  defaultExtent: {
    xmin: 74.88,
    ymin: 27.58,
    xmax: 77.62,
    ymax: 30.96,
    spatialReference: { wkid: 4326 },
  },
  serviceUrls: {
    geocoder:
      "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer",
    haryanaBoundary:
      "https://services1.arcgis.com/qN3V93cYGMKQCOxL/arcgis/rest/services/HARYANA_BOUNDARY/FeatureServer/0",
    haryanaDistricts:
      "https://services8.arcgis.com/wKeC0XcI9FDLOpJF/arcgis/rest/services/District_Boundary/FeatureServer/0",
  },
  boundarySublayers: [
    { id: 26, key: "district", title: "District boundaries" },
    { id: 27, key: "tehsil", title: "Tehsil boundaries" },
    { id: 28, key: "village", title: "Village boundaries" },
  ],
};

export const basemapPresets = {
  satellite: {
    id: "satellite",
    label: "Satellite",
    description: "Imagery-first parcel viewing",
    basemapId: "satellite",
  },
  cadastral: {
    id: "cadastral",
    label: "Cadastral",
    description: "Imagery with ESRI labels and boundary context",
    basemapId: "hybrid",
  },
  topo: {
    id: "topo",
    label: "Topo",
    description: "Terrain and road context",
    basemapId: "topo-vector",
  },
};
