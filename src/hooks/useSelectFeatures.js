/**
 * useSelectFeatures
 *
 * Manages the full "Select Features" workflow:
 *   1. SketchViewModel drawing (rectangle / polygon / polyline)
 *   2. District-layer guard query  (HSAC layer 26)
 *   3. Khasra-sublayer query       (HSAC sublayer == stripped district code)
 *   4. Map highlight + zoom
 *   5. Sequential owner-name fetch with per-row progress
 *
 * Stale-request safety: every async chain is tagged with an integer token from
 * `tokenRef`.  Incrementing the token (on clear or new startSelect) causes all
 * outstanding async checks to bail out silently.
 *
 * @param {{ viewRef: React.MutableRefObject, layersRef: React.MutableRefObject }} opts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import * as restQuery from "@arcgis/core/rest/query.js";
import Query from "@arcgis/core/rest/support/Query.js";
import { getHsacMainUrl } from "@/config/arcgis";
import { getCadastralLayerId } from "@/services/hsacLayerResolver";
import { getOwnerNames } from "@/services/landRecordService";
import { SELECTION_FILL_SYMBOL } from "@/config/mapSymbols";
import { MAX_KHASRA_SELECTION } from "@/constants/selectFeatures";

export function useSelectFeatures({ viewRef, layersRef }) {
  // ── Internal refs ────────────────────────────────────────────────────────────
  const sketchVmRef     = useRef(null);
  const sketchLayerRef  = useRef(null);
  const tokenRef        = useRef(0);
  const createHandleRef = useRef(null);

  // ── Point ("Single tap") tool refs ───────────────────────────────────────────
  const clickHandleRef   = useRef(null);   // view "click" listener for the point tool
  const pointRowsRef     = useRef([]);      // accumulated result rows across taps
  const pointKeysRef     = useRef(new Set()); // unique khasra keys (dedupe)
  const flagRefreshRef   = useRef(null);    // interval keeping the drawing flag fresh

  // ── Exposed state ────────────────────────────────────────────────────────────
  const [activeTool,    setActiveTool]    = useState(null);   // 'rectangle'|'polygon'|'polyline'|null
  const [isActive,      setIsActive]      = useState(false);  // true after first startSelect; false after clear
  const [progress,      setProgress]      = useState({ current: 0, total: 0, running: false });
  const [rows,          setRows]          = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  const setSelectionDrawingFlag = useCallback((value) => {
    if (layersRef.current) {
      const next = Boolean(value);
      layersRef.current.__selectionDrawing = next;
      layersRef.current.__selectionDrawingSince = next ? Date.now() : null;
    }
  }, [layersRef]);

  // ── Cleanup SketchViewModel on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      createHandleRef.current?.remove();
      clickHandleRef.current?.remove();
      if (flagRefreshRef.current) clearInterval(flagRefreshRef.current);
      sketchVmRef.current?.destroy?.();
      sketchVmRef.current = null;
      sketchLayerRef.current = null;
      setSelectionDrawingFlag(false);
    };
  }, [setSelectionDrawingFlag]);

  // ── Lazy SketchViewModel initialiser ────────────────────────────────────────
  // Called only when view and map are confirmed ready.
  function getOrCreateSketchVm() {
    const view   = viewRef.current;
    const layers = layersRef.current;
    if (!view || !layers?.map) return null;

    if (!sketchLayerRef.current) {
      const layer = new GraphicsLayer({ title: "Selection sketch", listMode: "hide" });
      layers.map.add(layer);
      sketchLayerRef.current = layer;
    }

    if (!sketchVmRef.current) {
      sketchVmRef.current = new SketchViewModel({
        view,
        layer: sketchLayerRef.current,
        defaultUpdateOptions: { tool: "reshape", enableRotation: false },
        polylineSymbol: {
          type: "simple-line",
          color: [0, 100, 200, 0.9],
          width: 2,
          style: "dash",
        },
      });
    }

    return sketchVmRef.current;
  }

  // ── Core geometry-processing pipeline ───────────────────────────────────────
  // Pure async function — all side-effects guarded by token checks.
  // Uses only refs and stable state setters, so it is stale-closure-safe.
  async function processGeometry(geometry, token) {
    const view   = viewRef.current;
    const layers = layersRef.current;
    if (!view || !layers) return;

    setProgress({ current: 0, total: 0, running: true });
    setStatusMessage("Querying district layer…");

    try {
      // ── Step 1: district guard ──────────────────────────────────────────────
      const distRes = await restQuery.executeQueryJSON(
        `${getHsacMainUrl()}/26`,
        new Query({
          geometry,
          spatialRelationship: "intersects",
          returnGeometry: false,
          outFields: ["n_d_code", "n_d_name"],
          where: "n_d_code IS NOT NULL AND n_d_code <> ''",
          outSpatialReference: view.spatialReference,
          num: MAX_KHASRA_SELECTION + 1,
        }),
      );

      if (tokenRef.current !== token) return;

      const distFeatures = distRes?.features ?? [];

      if (distFeatures.length === 0) {
        setStatusMessage("No district found in the selected area.");
        setProgress({ current: 0, total: 0, running: false });
        return;
      }

      if (distFeatures.length > MAX_KHASRA_SELECTION) {
        setStatusMessage(`You Can Select Maximum ${MAX_KHASRA_SELECTION} Khasra`);
        setProgress({ current: 0, total: 0, running: false });
        return;
      }

      const rawDCode = `${distFeatures[0]?.attributes?.n_d_code ?? ""}`.trim();
      const layerId  = await getCadastralLayerId(rawDCode);

      setStatusMessage("Querying khasra layer…");

      // ── Step 2: khasra query on the district cadastral sublayer ─────────────
      const khasRes = await restQuery.executeQueryJSON(
        `${getHsacMainUrl()}/${layerId}`,
        new Query({
          geometry,
          spatialRelationship: "intersects",
          returnGeometry: true,
          outFields: ["*"],
          where: "n_khas_no IS NOT NULL AND n_khas_no <> ''",
          outSpatialReference: view.spatialReference,
          num: MAX_KHASRA_SELECTION + 1,
        }),
      );

      if (tokenRef.current !== token) return;

      const khasFeatures = khasRes?.features ?? [];

      if (khasFeatures.length === 0) {
        setStatusMessage("No Khasra parcels found in the selected area.");
        setProgress({ current: 0, total: 0, running: false });
        return;
      }

      if (khasFeatures.length > MAX_KHASRA_SELECTION) {
        setStatusMessage(`You Can Select Maximum ${MAX_KHASRA_SELECTION} Khasra`);
        setProgress({ current: 0, total: 0, running: false });
        return;
      }

      // ── Step 3: highlight features on map + zoom to union extent ───────────
      const selLayer = layers.selectionLayer;
      if (selLayer) {
        selLayer.removeAll();
        let unionExtent = null;

        for (const feat of khasFeatures) {
          if (feat.geometry) {
            selLayer.add(new Graphic({ geometry: feat.geometry, symbol: SELECTION_FILL_SYMBOL }));
            const ext = feat.geometry.extent;
            if (ext) {
              unionExtent = unionExtent ? unionExtent.union(ext) : ext.clone();
            }
          }
        }

        if (unionExtent) {
          await view
            .goTo({ target: unionExtent.expand(2) }, { duration: 800, easing: "ease-in-out" })
            .catch(() => {});
        }
      }

      if (tokenRef.current !== token) return;

      // ── Step 4: fetch owner names sequentially with per-row progress ────────
      setProgress({ current: 0, total: khasFeatures.length, running: true });
      setStatusMessage(`Fetching owner data for ${khasFeatures.length} parcel(s)…`);

      const resultRows = [];

      for (let i = 0; i < khasFeatures.length; i++) {
        if (tokenRef.current !== token) return;

        const attrs = khasFeatures[i].attributes ?? {};
        const dCode  = `${attrs.n_d_code  ?? ""}`.trim();
        const tCode  = `${attrs.n_t_code  ?? ""}`.trim();
        const vCode  = `${attrs.n_v_code  ?? ""}`.trim();
        const murr   = `${attrs.n_murr_no ?? ""}`.trim();
        const khas   = `${attrs.n_khas_no ?? ""}`.trim();
        const kanal  = attrs.N_KANAL ?? attrs.n_kanal;
        const marla  = attrs.N_MARLA ?? attrs.n_marla;
        const area   =
          kanal != null || marla != null
            ? `${kanal ?? 0}-${marla ?? 0}`
            : "--";

        let ownerName = "No Owner Name";

        if (dCode && tCode && vCode && murr && khas) {
          try {
            const owners = await getOwnerNames(dCode, tCode, vCode, murr, khas);
            if (owners.length) ownerName = owners.join(", ");
          } catch {
            // default stays "No Owner Name"
          }
        }

        if (tokenRef.current !== token) return;

        resultRows.push({
          id:           `${dCode}-${tCode}-${vCode}-${murr}-${khas}-${i}`,
          districtName: `${attrs.n_d_name ?? ""}`.trim() || "--",
          districtCode: dCode  || "--",
          tehsilName:   `${attrs.n_t_name ?? ""}`.trim() || "--",
          tehsilCode:   tCode  || "--",
          villageName:  `${attrs.n_v_name ?? ""}`.trim() || "--",
          nvCode:       vCode  || "--",
          murrabbaNo:   murr   || "--",
          khasraNo:     khas   || "--",
          area,
          ownerName,
        });

        setProgress({ current: i + 1, total: khasFeatures.length, running: i + 1 < khasFeatures.length });
      }

      if (tokenRef.current !== token) return;

      setRows(resultRows);
      setProgress({ current: khasFeatures.length, total: khasFeatures.length, running: false });
      setStatusMessage(`${resultRows.length} Khasra parcel(s) selected.`);
    } catch (err) {
      if (tokenRef.current !== token) return;
      setStatusMessage(err?.message || "Selection query failed. Please try again.");
      setProgress({ current: 0, total: 0, running: false });
    }
  }

  // ── Single-tap (point) processing ────────────────────────────────────────────
  // Each map tap resolves the khasra parcel under the point and APPENDS it to the
  // running selection (deduped, capped at MAX_KHASRA_SELECTION).
  function buildRowFromAttrs(attrs, index, key) {
    const dCode  = `${attrs.n_d_code  ?? ""}`.trim();
    const tCode  = `${attrs.n_t_code  ?? ""}`.trim();
    const vCode  = `${attrs.n_v_code  ?? ""}`.trim();
    const murr   = `${attrs.n_murr_no ?? ""}`.trim();
    const khas   = `${attrs.n_khas_no ?? ""}`.trim();
    const kanal  = attrs.N_KANAL ?? attrs.n_kanal;
    const marla  = attrs.N_MARLA ?? attrs.n_marla;
    const area   =
      kanal != null || marla != null ? `${kanal ?? 0}-${marla ?? 0}` : "--";

    return {
      id:           `${key}-${index}`,
      districtName: `${attrs.n_d_name ?? ""}`.trim() || "--",
      districtCode: dCode  || "--",
      tehsilName:   `${attrs.n_t_name ?? ""}`.trim() || "--",
      tehsilCode:   tCode  || "--",
      villageName:  `${attrs.n_v_name ?? ""}`.trim() || "--",
      nvCode:       vCode  || "--",
      murrabbaNo:   murr   || "--",
      khasraNo:     khas   || "--",
      area,
      ownerName:    "No Owner Name",
      __dCode: dCode, __tCode: tCode, __vCode: vCode, __murr: murr, __khas: khas,
    };
  }

  async function processPointTap(mapPoint, token) {
    const view   = viewRef.current;
    const layers = layersRef.current;
    if (!view || !layers) return;

    if (pointRowsRef.current.length >= MAX_KHASRA_SELECTION) {
      setStatusMessage(`You Can Select Maximum ${MAX_KHASRA_SELECTION} Khasra`);
      return;
    }

    setStatusMessage("Resolving Khasra at the tapped location…");

    try {
      // ── District guard at the tapped point ──────────────────────────────────
      const distRes = await restQuery.executeQueryJSON(
        `${getHsacMainUrl()}/26`,
        new Query({
          geometry: mapPoint,
          spatialRelationship: "intersects",
          returnGeometry: false,
          outFields: ["n_d_code", "n_d_name"],
          where: "n_d_code IS NOT NULL AND n_d_code <> ''",
          outSpatialReference: view.spatialReference,
          num: 1,
        }),
      );
      if (tokenRef.current !== token) return;

      const distFeatures = distRes?.features ?? [];
      if (distFeatures.length === 0) {
        setStatusMessage("No district found at the tapped location.");
        return;
      }

      const rawDCode = `${distFeatures[0]?.attributes?.n_d_code ?? ""}`.trim();
      const layerId  = await getCadastralLayerId(rawDCode);
      if (tokenRef.current !== token) return;

      // ── Khasra parcel under the tapped point ────────────────────────────────
      const khasRes = await restQuery.executeQueryJSON(
        `${getHsacMainUrl()}/${layerId}`,
        new Query({
          geometry: mapPoint,
          spatialRelationship: "intersects",
          returnGeometry: true,
          outFields: ["*"],
          where: "n_khas_no IS NOT NULL AND n_khas_no <> ''",
          outSpatialReference: view.spatialReference,
          num: 1,
        }),
      );
      if (tokenRef.current !== token) return;

      const feat = (khasRes?.features ?? [])[0];
      if (!feat) {
        setStatusMessage("No Khasra parcel found at the tapped location.");
        return;
      }

      const attrs = feat.attributes ?? {};
      const dCode = `${attrs.n_d_code  ?? ""}`.trim();
      const tCode = `${attrs.n_t_code  ?? ""}`.trim();
      const vCode = `${attrs.n_v_code  ?? ""}`.trim();
      const murr  = `${attrs.n_murr_no ?? ""}`.trim();
      const khas  = `${attrs.n_khas_no ?? ""}`.trim();
      const key   = `${dCode}-${tCode}-${vCode}-${murr}-${khas}`;

      if (pointKeysRef.current.has(key)) {
        setStatusMessage("That Khasra is already selected.");
        return;
      }
      if (pointRowsRef.current.length >= MAX_KHASRA_SELECTION) {
        setStatusMessage(`You Can Select Maximum ${MAX_KHASRA_SELECTION} Khasra`);
        return;
      }

      // ── Highlight on map ────────────────────────────────────────────────────
      const selLayer = layers.selectionLayer;
      if (selLayer && feat.geometry) {
        selLayer.add(
          new Graphic({
            geometry: feat.geometry,
            symbol: SELECTION_FILL_SYMBOL,
            attributes: { __khasKey: key },
          }),
        );
      }

      // ── Append row immediately, then resolve owner name ─────────────────────
      const index = pointRowsRef.current.length;
      const row   = buildRowFromAttrs(attrs, index, key);
      pointKeysRef.current.add(key);
      pointRowsRef.current = [...pointRowsRef.current, row];
      setRows(pointRowsRef.current);

      const count = pointRowsRef.current.length;
      setProgress({ current: count, total: count, running: true });

      if (dCode && tCode && vCode && murr && khas) {
        try {
          const owners = await getOwnerNames(dCode, tCode, vCode, murr, khas);
          if (tokenRef.current !== token) return;
          if (owners.length) {
            pointRowsRef.current = pointRowsRef.current.map((r) =>
              r.id === row.id ? { ...r, ownerName: owners.join(", ") } : r,
            );
            setRows(pointRowsRef.current);
          }
        } catch {
          // keep "No Owner Name"
        }
      }

      if (tokenRef.current !== token) return;
      const total = pointRowsRef.current.length;
      setProgress({ current: total, total, running: false });
      setStatusMessage(
        total >= MAX_KHASRA_SELECTION
          ? `Maximum ${MAX_KHASRA_SELECTION} Khasra selected.`
          : `${total} Khasra selected. Tap more parcels or Clear. (max ${MAX_KHASRA_SELECTION})`,
      );
    } catch (err) {
      if (tokenRef.current !== token) return;
      setStatusMessage(err?.message || "Selection query failed. Please try again.");
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    tokenRef.current += 1;
    createHandleRef.current?.remove();
    createHandleRef.current = null;
    clickHandleRef.current?.remove();
    clickHandleRef.current = null;
    if (flagRefreshRef.current) {
      clearInterval(flagRefreshRef.current);
      flagRefreshRef.current = null;
    }
    sketchVmRef.current?.cancel?.();
    sketchLayerRef.current?.removeAll();

    const selLayer = layersRef.current?.selectionLayer;
    if (selLayer) selLayer.removeAll();

    pointRowsRef.current = [];
    pointKeysRef.current = new Set();

    setActiveTool(null);
    setIsActive(false);
    setProgress({ current: 0, total: 0, running: false });
    setRows([]);
    setStatusMessage(null);
    setSelectionDrawingFlag(false);
  }, [layersRef, setSelectionDrawingFlag]);

  // Single-tap selection: keep listening for map clicks and accumulate parcels.
  const startPointSelect = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    // Tear down any draw / previous point session
    createHandleRef.current?.remove();
    createHandleRef.current = null;
    clickHandleRef.current?.remove();
    clickHandleRef.current = null;
    sketchVmRef.current?.cancel?.();
    sketchLayerRef.current?.removeAll();
    tokenRef.current += 1;
    const token = tokenRef.current;

    const selLayer = layersRef.current?.selectionLayer;
    if (selLayer) selLayer.removeAll();

    pointRowsRef.current = [];
    pointKeysRef.current = new Set();

    setIsActive(true);
    setActiveTool("point");
    setRows([]);
    setProgress({ current: 0, total: 0, running: false });
    setStatusMessage(`Tap parcels on the map to select Khasra (max ${MAX_KHASRA_SELECTION})…`);
    setSelectionDrawingFlag(true);

    // Keep the "drawing" flag fresh so the default map-click popup stays suppressed
    // throughout the (potentially long) tap session.
    if (flagRefreshRef.current) clearInterval(flagRefreshRef.current);
    flagRefreshRef.current = setInterval(() => {
      if (tokenRef.current === token) setSelectionDrawingFlag(true);
      else clearInterval(flagRefreshRef.current);
    }, 20000);

    clickHandleRef.current = view.on("click", async (event) => {
      if (tokenRef.current !== token) return;
      event.stopPropagation?.();
      setSelectionDrawingFlag(true);
      const mapPoint = event.mapPoint;
      if (!mapPoint) return;
      await processPointTap(mapPoint, token);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSelectionDrawingFlag]);

  const startSelect = useCallback((tool) => {
    if (tool === "point") {
      startPointSelect();
      return;
    }

    const vm = getOrCreateSketchVm();
    if (!vm) {
      return;
    }

    // Cancel any ongoing draw / point session and invalidate in-flight async ops
    createHandleRef.current?.remove();
    createHandleRef.current = null;
    clickHandleRef.current?.remove();
    clickHandleRef.current = null;
    if (flagRefreshRef.current) {
      clearInterval(flagRefreshRef.current);
      flagRefreshRef.current = null;
    }
    pointRowsRef.current = [];
    pointKeysRef.current = new Set();
    vm.cancel?.();
    tokenRef.current += 1;
    const token = tokenRef.current;

    // Clear previous selection graphics and state
    sketchLayerRef.current?.removeAll();
    const selLayer = layersRef.current?.selectionLayer;
    if (selLayer) selLayer.removeAll();

    setIsActive(true);
    setActiveTool(tool);
    setRows([]);
    setProgress({ current: 0, total: 0, running: false });
    setStatusMessage("Draw on the map to select Khasra parcels…");
    setSelectionDrawingFlag(true);

    const drawTool =
      tool === "rectangle" ? "rectangle" :
      tool === "polygon"   ? "polygon"   : "polyline";

    vm.create(drawTool).catch(() => {
      setActiveTool(null);
      setStatusMessage("Unable to start selection drawing. Please try again.");
      setSelectionDrawingFlag(false);
    });

    createHandleRef.current = vm.on("create", async (event) => {
      if (event.state === "cancel") {
        createHandleRef.current?.remove();
        createHandleRef.current = null;
        setActiveTool(null);
        setStatusMessage(null);
        setSelectionDrawingFlag(false);
        return;
      }

      if (event.state !== "complete") return;

      createHandleRef.current?.remove();
      createHandleRef.current = null;
      setActiveTool(null);
      setSelectionDrawingFlag(false);

      // Remove the temporary sketch graphic immediately after draw
      if (event.graphic && sketchLayerRef.current) {
        sketchLayerRef.current.remove(event.graphic);
      }

      const drawn = event.graphic?.geometry;
      if (!drawn) {
        setStatusMessage("No geometry was drawn.");
        return;
      }

      if (tokenRef.current !== token) return;
      await processGeometry(drawn, token);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSelectionDrawingFlag, startPointSelect]); // All other referenced values are refs or stable imported functions

  return {
    activeTool,
    isActive,
    progress,
    rows,
    statusMessage,
    startSelect,
    clearSelection,
  };
}

