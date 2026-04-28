/**
 * mapSymbols.js
 *
 * Shared ArcGIS fill-symbol definitions used across map hooks.
 * Centralised here so colour values stay in sync.
 */

/** Orange highlight — active parcel selection (useArcGISMap). */
export const PARCEL_FILL_SYMBOL = {
  type: "simple-fill",
  color: [244, 168, 34, 0.16],
  outline: { color: [237, 154, 29, 0.94], width: 2.6 },
};

/** Blue fill — boundary query results: district/tehsil/village/murabba/khasra (useArcGISMap). */
export const BOUNDARY_FILL_SYMBOL = {
  type: "simple-fill",
  color: [0, 110, 180, 0.08],
  outline: { color: [0, 85, 160, 0.85], width: 2.2 },
};

/** Blue fill — multi-parcel spatial selection (useSelectFeatures). */
export const SELECTION_FILL_SYMBOL = {
  type: "simple-fill",
  color: [0, 120, 220, 0.18],
  outline: { color: [0, 100, 200, 0.9], width: 2.2 },
};
