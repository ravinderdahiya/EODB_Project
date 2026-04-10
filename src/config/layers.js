export const HARYANA_CENTER = [29.0588, 76.0856]

export const BASEMAPS = {
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
  topo: {
    id: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  light: {
    id: 'light',
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
  },
}

export const LAYER_CONFIG = [
  {
    id: 'state',
    label: 'Haryana State Boundary',
    shortLabel: 'State',
    url: '/data/haryana-state.geojson',
    defaultVisible: true,
    minZoom: 0,
    demo: false,
    style: {
      color: '#d8ec83',
      weight: 3.2,
      opacity: 0.95,
      fillColor: '#b3d34d',
      fillOpacity: 0.02,
    },
  },
  {
    id: 'districts',
    label: 'District Boundaries',
    shortLabel: 'Districts',
    url: '/data/haryana-districts.geojson',
    defaultVisible: true,
    minZoom: 7,
    demo: false,
    style: {
      color: '#7cc9f8',
      weight: 1.5,
      opacity: 0.9,
      fillColor: '#2ea8df',
      fillOpacity: 0.04,
    },
  },
  {
    id: 'tehsils',
    label: 'Tehsil Boundaries',
    shortLabel: 'Tehsils',
    url: '/data/haryana-tehsils-demo.geojson',
    defaultVisible: true,
    minZoom: 9,
    demo: true,
    style: {
      color: '#f5c96d',
      weight: 1.7,
      opacity: 0.92,
      fillColor: '#f1af43',
      fillOpacity: 0.07,
      dashArray: '8 6',
    },
  },
  {
    id: 'villages',
    label: 'Village Boundaries',
    shortLabel: 'Villages',
    url: '/data/haryana-villages-demo.geojson',
    defaultVisible: true,
    minZoom: 11,
    demo: true,
    style: {
      color: '#ff9971',
      weight: 1.3,
      opacity: 0.95,
      fillColor: '#ff7e4f',
      fillOpacity: 0.12,
    },
  },
]

export function getFeatureLabel(layerId, feature) {
  const props = feature?.properties ?? {}

  if (layerId === 'state') {
    return props.name ?? 'Haryana'
  }

  return props.name ?? props.district ?? props.tehsil ?? props.village ?? 'Unnamed feature'
}
