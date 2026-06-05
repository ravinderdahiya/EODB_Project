/**
 * Legend swatches shown beside sub-layer toggles in LayerPanel.
 * Colors mirror the HSAC MapServer symbology where known.
 */

/** @typedef {'polygon' | 'line' | 'point' | 'grid'} LayerPanelSymbolType */

/**
 * @typedef {Object} LayerPanelSymbol
 * @property {LayerPanelSymbolType} type
 * @property {string} [fill]
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {string} [dash]
 */

/** @type {Record<string, LayerPanelSymbol>} */
export const LAYER_PANEL_SYMBOLOGY = {
  murrabaGrid: {
    type: "grid",
    stroke: "#2D6CDF",
    strokeWidth: 1.5,
  },
  cadastral: {
    type: "polygon",
    fill: "rgba(255, 235, 180, 0.65)",
    stroke: "#8B4513",
    strokeWidth: 1.5,
  },
  stateBoundary: {
    type: "polygon",
    fill: "transparent",
    stroke: "#FFFF00",
    strokeWidth: 3,
  },
  district: {
    type: "polygon",
    fill: "rgba(231, 76, 60, 0.12)",
    stroke: "#FAA700",
    strokeWidth: 2,
  },
  tehsil: {
    type: "polygon",
    fill: "rgba(52, 152, 219, 0.1)",
    stroke: "#FFA57D",
    strokeWidth: 2,
  },
  village: {
    type: "polygon",
    fill: "rgba(46, 204, 113, 0.12)",
    stroke: "#2ECC71",
    strokeWidth: 1.5,
  },
  assets: {
    type: "point",
    fill: "#3498DB",
    stroke: "#2C3E50",
    strokeWidth: 1.5,
  },
  roads: {
    type: "line",
    stroke: "#34495E",
    strokeWidth: 3,
  },
  nhai: {
    type: "line",
    stroke: "#E74C3C",
    strokeWidth: 2.5,
    dash: "5 3",
  },
};

/**
 * @param {string | undefined | null} symbolKey
 * @returns {LayerPanelSymbol | null}
 */
export function getLayerPanelSymbol(symbolKey) {
  if (!symbolKey) return null;
  return LAYER_PANEL_SYMBOLOGY[symbolKey] ?? null;
}
