# Haryana Land Records GIS Frontend

Modern React + Vite frontend for a Haryana government-style land records portal using Leaflet and React Leaflet.

## Stack

- React
- Vite
- Leaflet
- React Leaflet
- Lucide React icons

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run lint
```

## GIS data locations

Place production GeoJSON files in [`public/data`](/Volumes/myData/officeProjects/eodb_app/EODB/public/data):

- [`haryana-state.geojson`](/Volumes/myData/officeProjects/eodb_app/EODB/public/data/haryana-state.geojson)
- [`haryana-districts.geojson`](/Volumes/myData/officeProjects/eodb_app/EODB/public/data/haryana-districts.geojson)
- [`haryana-tehsils-demo.geojson`](/Volumes/myData/officeProjects/eodb_app/EODB/public/data/haryana-tehsils-demo.geojson)
- [`haryana-villages-demo.geojson`](/Volumes/myData/officeProjects/eodb_app/EODB/public/data/haryana-villages-demo.geojson)

The current tehsil and village files are demo placeholders. Replace them with your official cadastral GeoJSON and keep the filenames the same, or update [`src/config/layers.js`](/Volumes/myData/officeProjects/eodb_app/EODB/src/config/layers.js).

## Project structure

- [`src/App.jsx`](/Volumes/myData/officeProjects/eodb_app/EODB/src/App.jsx): app shell and UI state
- [`src/map/GISMap.jsx`](/Volumes/myData/officeProjects/eodb_app/EODB/src/map/GISMap.jsx): Leaflet map, layers, zoom behavior, feature focus
- [`src/components`](/Volumes/myData/officeProjects/eodb_app/EODB/src/components): header, toolbar, panels, footer, loading UI
- [`src/hooks/useGeoLayers.js`](/Volumes/myData/officeProjects/eodb_app/EODB/src/hooks/useGeoLayers.js): static GeoJSON loading hook
- [`src/config/layers.js`](/Volumes/myData/officeProjects/eodb_app/EODB/src/config/layers.js): basemap and layer metadata

## Future integration

This structure is ready to swap static files for:

- PostGIS-backed API endpoints
- GeoServer WMS / WMTS
- ArcGIS REST services
- QGIS-exported GeoJSON
- authentication and dashboard modules

To connect remote services later, the cleanest place to start is [`src/hooks/useGeoLayers.js`](/Volumes/myData/officeProjects/eodb_app/EODB/src/hooks/useGeoLayers.js) and [`src/config/layers.js`](/Volumes/myData/officeProjects/eodb_app/EODB/src/config/layers.js).
