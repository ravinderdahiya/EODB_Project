import esriRequest from "@arcgis/core/request.js";
import { DISTRICT_SUBLAYERS, HSAC_LAYER, HSAC_MAIN_URL } from "@/config/arcgis";

const FALLBACK_LAYER_ID = DISTRICT_SUBLAYERS[0]?.id ?? 1;

let cachedLayerPlanPromise;

function createDefaultLayerPlan() {
  return {
    layerIds: [FALLBACK_LAYER_ID],
    districtLayerId: FALLBACK_LAYER_ID,
    tehsilLayerId: FALLBACK_LAYER_ID,
    villageLayerId: FALLBACK_LAYER_ID,
    murabbaLayerId: FALLBACK_LAYER_ID,
    cadastralLayerIds: [FALLBACK_LAYER_ID],
    usesFallback: true,
  };
}

function parseLayerId(code) {
  const value = Number.parseInt(String(code), 10);
  return Number.isFinite(value) ? value : null;
}

function getLayerIdFromDistrictCode(dCode, layerIds) {
  const candidate = parseLayerId(String(dCode).replace(/^0+/, "") || dCode);
  if (candidate !== null && layerIds.has(candidate)) {
    return candidate;
  }
  return null;
}

function createLayerPlanFromMetadata(metadata) {
  const layers = Array.isArray(metadata?.layers) ? metadata.layers : [];
  const ids = layers
    .map((layer) => layer?.id)
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  const idSet = new Set(ids);

  if (!ids.length) {
    return createDefaultLayerPlan();
  }

  const districtLayerId = idSet.has(HSAC_LAYER.DISTRICT)
    ? HSAC_LAYER.DISTRICT
    : ids[0];
  const tehsilLayerId = idSet.has(HSAC_LAYER.TEHSIL)
    ? HSAC_LAYER.TEHSIL
    : districtLayerId;
  const villageLayerId = idSet.has(HSAC_LAYER.VILLAGE)
    ? HSAC_LAYER.VILLAGE
    : districtLayerId;
  const murabbaLayerId = idSet.has(HSAC_LAYER.MURABBA)
    ? HSAC_LAYER.MURABBA
    : districtLayerId;

  const canonicalCadastralIds = DISTRICT_SUBLAYERS
    .map((entry) => entry.id)
    .filter((id) => idSet.has(id));
  const cadastralLayerIds = canonicalCadastralIds.length
    ? canonicalCadastralIds
    : [districtLayerId];

  const usesFallback =
    !idSet.has(HSAC_LAYER.DISTRICT) ||
    !idSet.has(HSAC_LAYER.TEHSIL) ||
    !idSet.has(HSAC_LAYER.VILLAGE) ||
    canonicalCadastralIds.length !== DISTRICT_SUBLAYERS.length;

  return {
    layerIds: ids,
    districtLayerId,
    tehsilLayerId,
    villageLayerId,
    murabbaLayerId,
    cadastralLayerIds,
    usesFallback,
  };
}

export async function getHsacLayerPlan() {
  if (!cachedLayerPlanPromise) {
    cachedLayerPlanPromise = (async () => {
      try {
        const response = await esriRequest(HSAC_MAIN_URL, {
          query: { f: "pjson" },
          responseType: "json",
        });
        const metadata = response?.data ?? response;
        return createLayerPlanFromMetadata(metadata);
      } catch {
        return createDefaultLayerPlan();
      }
    })();
  }

  return cachedLayerPlanPromise;
}

export async function getCadastralLayerId(dCode) {
  const plan = await getHsacLayerPlan();
  const layerIds = new Set(plan.layerIds);
  const detected = getLayerIdFromDistrictCode(dCode, layerIds);

  if (detected !== null) {
    return detected;
  }

  return plan.cadastralLayerIds[0] ?? FALLBACK_LAYER_ID;
}
