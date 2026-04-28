# Digital Land Record, Haryana

This project is a React + Vite land-record portal shell with an ArcGIS map focused on Haryana.

## Map features

- ESRI basemaps through the ArcGIS Maps SDK for JavaScript
- Highlighted Haryana state boundary in the map view
- Highlighted Haryana district boundaries in the map view
- Local parcel highlight overlay for the selected land record
- ArcGIS geocoding support for place search
- Browser geolocation support for centering the map on the current location

## Technology stack

- React 19
- Vite 8
- `@arcgis/core`
- `lucide-react`
- CSS in `src/styles/main.css`

## Main files

- [src/main.jsx](./src/main.jsx)
  Bootstraps the app and sets the ArcGIS assets path.
- [src/config/arcgis.js](./src/config/arcgis.js)
  Stores the Haryana default extent, ArcGIS service URLs, and basemap presets.
- [src/hooks/useArcGISMap.js](./src/hooks/useArcGISMap.js)
  Builds the ArcGIS map, view, Haryana boundary overlays, search flow, and parcel highlighting.
- [src/App.jsx](./src/App.jsx)
  Connects the map hook to the portal UI shell.

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## ArcGIS assets

ArcGIS runtime assets are copied into `public/assets` before `dev` and `build`.

Configured script in [package.json](./package.json):

```json
"copy:arcgis": "cpx \"node_modules/@arcgis/core/assets/**/*.*\" ./public/assets"
```

Configured app path in [src/main.jsx](./src/main.jsx):

```js
esriConfig.assetsPath = "/assets";
```

## Optional environment variable

To enable ArcGIS place search from the header search bar:

```bash
VITE_ARCGIS_API_KEY=your_arcgis_key
```
