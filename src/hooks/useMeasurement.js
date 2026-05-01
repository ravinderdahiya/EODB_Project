/**
 * useMeasurement
 *
 * Geodesic distance (polyline) and area (polygon) measurement using
 * SketchViewModel + geodesicUtils. Follows the same lazy-layer pattern
 * as useSelectFeatures so it is safe to call before the map is ready.
 *
 * @param {{ viewRef: React.MutableRefObject, layersRef: React.MutableRefObject }} opts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import { geodesicLengths, geodesicAreas } from "@arcgis/core/geometry/geodesicUtils.js";
import { webMercatorToGeographic } from "@arcgis/core/geometry/support/webMercatorUtils.js";
import { isWebMercator } from "@arcgis/core/geometry/support/spatialReferenceUtils.js";

// geodesicLengths/geodesicAreas only accept geographic (lat-lon) coordinate systems.
// SketchViewModel produces Web Mercator geometries when the map uses tile basemaps,
// so we must project to WGS84 first.
function toGeographic(geometry) {
  if (!geometry) return null;
  return isWebMercator(geometry.spatialReference)
    ? webMercatorToGeographic(geometry)
    : geometry;
}

const MEASURE_LINE_SYMBOL = {
  type: "simple-line",
  color: [46, 115, 180, 0.92],
  width: 2.5,
  style: "solid",
};

const MEASURE_POLYGON_SYMBOL = {
  type: "simple-fill",
  color: [47, 141, 93, 0.10],
  outline: { color: [47, 141, 93, 0.9], width: 2.5 },
};

export function useMeasurement({ viewRef, layersRef }) {
  const sketchVmRef     = useRef(null);
  const sketchLayerRef  = useRef(null);
  const createHandleRef = useRef(null);

  const [result,    setResult]    = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Destroy SketchViewModel on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      createHandleRef.current?.remove();
      sketchVmRef.current?.destroy?.();
    };
  }, []);

  // Lazily creates the graphics layer and SketchViewModel the first time
  // startMeasure is called — safe to call before the map is ready.
  function getOrCreateSketchVm() {
    const view   = viewRef.current;
    const layers = layersRef.current;
    if (!view || !layers?.map) return null;

    if (!sketchLayerRef.current) {
      const layer = new GraphicsLayer({ title: "Measurement", listMode: "hide" });
      layers.map.add(layer);
      sketchLayerRef.current = layer;
    }

    if (!sketchVmRef.current) {
      sketchVmRef.current = new SketchViewModel({
        view,
        layer: sketchLayerRef.current,
        polylineSymbol: MEASURE_LINE_SYMBOL,
        polygonSymbol:  MEASURE_POLYGON_SYMBOL,
        defaultUpdateOptions: { enableRotation: false, enableScaling: false },
      });
    }

    return sketchVmRef.current;
  }

  // Start a new measurement draw. Cancels any active sketch first.
  const startMeasure = useCallback((type) => {
    const vm = getOrCreateSketchVm();
    if (!vm) return;

    // Cancel previous draw and detach its event handler
    createHandleRef.current?.remove();
    createHandleRef.current = null;
    vm.cancel?.();

    sketchLayerRef.current?.removeAll();
    setResult(null);
    setIsDrawing(true);

    vm.create(type === "distance" ? "polyline" : "polygon");

    createHandleRef.current = vm.on("create", (event) => {
      if (event.state === "cancel") {
        createHandleRef.current?.remove();
        createHandleRef.current = null;
        setIsDrawing(false);
        return;
      }

      if (event.state !== "complete") return;

      createHandleRef.current?.remove();
      createHandleRef.current = null;
      setIsDrawing(false);

      const geoGeometry = toGeographic(event.graphic?.geometry);
      if (!geoGeometry) return;

      if (type === "distance") {
        const meters = geodesicLengths([geoGeometry], "meters")[0];
        setResult({
          type: "distance",
          meters,
          km:    meters / 1000,
          feet:  meters / 0.3048,
          karam: meters / 1.6764,
        });
      } else {
        const sqMeters = Math.abs(geodesicAreas([geoGeometry], "square-meters")[0]);
        setResult({
          type: "area",
          sqMeters,
          hectares: sqMeters / 10000,
          acres:    sqMeters / 4046.856422,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // All referenced values are stable refs

  // Cancel active sketch, clear graphics, and reset result.
  const clearMeasure = useCallback(() => {
    createHandleRef.current?.remove();
    createHandleRef.current = null;
    sketchVmRef.current?.cancel?.();
    sketchLayerRef.current?.removeAll();
    setResult(null);
    setIsDrawing(false);
  }, []);

  return { startMeasure, clearMeasure, result, isDrawing };
}
