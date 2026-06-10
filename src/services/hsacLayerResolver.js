import esriRequest from "@arcgis/core/request.js";
import { DISTRICT_SUBLAYERS, HSAC_LAYER, getHsacMainUrl } from "@/config/arcgis";

const FALLBACK_LAYER_ID = DISTRICT_SUBLAYERS[0]?.id ?? 1;
// Bump the version whenever the canonical layer set changes (e.g. adding the Hansi
// cadastral layer) so stale cached plans without the new layers are discarded.
const HSAC_LAYER_PLAN_STORAGE_KEY = "eodb_hsac_layer_plan_v2";
const HSAC_LAYER_PLAN_REFRESH_TIMEOUT_MS = 2500;

let cachedLayerPlanPromise;
let metadataRefreshStarted = false;

function createDefaultLayerPlan() {
  const cadastralIds = DISTRICT_SUBLAYERS
    .map((entry) => entry?.id)
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);

  const districtLayerId = Number.isFinite(HSAC_LAYER.DISTRICT) ? HSAC_LAYER.DISTRICT : FALLBACK_LAYER_ID;
  const tehsilLayerId = Number.isFinite(HSAC_LAYER.TEHSIL) ? HSAC_LAYER.TEHSIL : districtLayerId;
  const villageLayerId = Number.isFinite(HSAC_LAYER.VILLAGE) ? HSAC_LAYER.VILLAGE : districtLayerId;
  const murabbaLayerId = Number.isFinite(HSAC_LAYER.MURABBA) ? HSAC_LAYER.MURABBA : districtLayerId;

  const layerIds = Array.from(
    new Set([
      districtLayerId,
      tehsilLayerId,
      villageLayerId,
      murabbaLayerId,
      ...cadastralIds,
    ]),
  ).sort((a, b) => a - b);

  return {
    layerIds: layerIds.length ? layerIds : [FALLBACK_LAYER_ID],
    districtLayerId,
    tehsilLayerId,
    villageLayerId,
    murabbaLayerId,
    cadastralLayerIds: cadastralIds.length ? cadastralIds : [FALLBACK_LAYER_ID],
    usesFallback: false,
  };
}

function parseLayerId(code) {
  const value = Number.parseInt(String(code), 10);
  return Number.isFinite(value) ? value : null;
}

// Normalise a district code to the 2-digit form used in DISTRICT_SUBLAYERS (e.g. "5" → "05").
function normaliseDistrictCode(dCode) {
  const raw = `${dCode ?? ""}`.trim();
  if (!raw) return "";
  const digits = raw.replace(/^0+/, "") || raw;
  return digits.padStart(2, "0");
}

function getLayerIdFromDistrictCode(dCode, layerIds) {
  // District code and cadastral layer id are NOT always identical. Districts
  // 01–22 map to layer ids 1–22, but newer districts differ — e.g. Hansi has
  // district code 23 yet its cadastral data lives on layer id 32. Resolve via the
  // canonical sublayer table first so these special cases are handled correctly.
  const entry = DISTRICT_SUBLAYERS.find((d) => d.code === normaliseDistrictCode(dCode));
  if (entry) {
    return layerIds.has(entry.id) ? entry.id : null;
  }

  // Unknown code: fall back to the legacy assumption that code === layer id.
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

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("HSAC layer metadata request timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function readLayerPlanFromStorage() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(HSAC_LAYER_PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const layerIds = Array.isArray(parsed.layerIds)
      ? parsed.layerIds.filter((id) => Number.isFinite(id)).sort((a, b) => a - b)
      : [];
    const cadastralLayerIds = Array.isArray(parsed.cadastralLayerIds)
      ? parsed.cadastralLayerIds.filter((id) => Number.isFinite(id)).sort((a, b) => a - b)
      : [];
    const districtLayerId = Number.isFinite(parsed.districtLayerId) ? parsed.districtLayerId : null;
    const tehsilLayerId = Number.isFinite(parsed.tehsilLayerId) ? parsed.tehsilLayerId : null;
    const villageLayerId = Number.isFinite(parsed.villageLayerId) ? parsed.villageLayerId : null;
    const murabbaLayerId = Number.isFinite(parsed.murabbaLayerId) ? parsed.murabbaLayerId : null;

    if (!layerIds.length || !districtLayerId || !tehsilLayerId || !villageLayerId || !murabbaLayerId) {
      return null;
    }

    return {
      layerIds,
      districtLayerId,
      tehsilLayerId,
      villageLayerId,
      murabbaLayerId,
      cadastralLayerIds: cadastralLayerIds.length ? cadastralLayerIds : [districtLayerId],
      usesFallback: Boolean(parsed.usesFallback),
    };
  } catch {
    return null;
  }
}

function saveLayerPlanToStorage(plan) {
  if (typeof window === "undefined" || !plan) return;
  try {
    window.sessionStorage.setItem(HSAC_LAYER_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Ignore storage write failures (private mode/quota).
  }
}

async function fetchLayerPlanFromMetadata() {
  const response = await withTimeout(
    esriRequest(getHsacMainUrl(), {
      query: { f: "pjson" },
      responseType: "json",
    }),
    HSAC_LAYER_PLAN_REFRESH_TIMEOUT_MS,
  );
  const metadata = response?.data ?? response;
  return createLayerPlanFromMetadata(metadata);
}

/** Synchronous layer plan for map bootstrap — avoids awaiting metadata before first paint. */
export function getHsacLayerPlanSync() {
  return readLayerPlanFromStorage() ?? createDefaultLayerPlan();
}

export async function getHsacLayerPlan() {
  if (!cachedLayerPlanPromise) {
    const storedPlan = readLayerPlanFromStorage();
    const initialPlan = storedPlan ?? createDefaultLayerPlan();
    cachedLayerPlanPromise = Promise.resolve(initialPlan);
    saveLayerPlanToStorage(initialPlan);
  }

  if (!metadataRefreshStarted) {
    metadataRefreshStarted = true;
    void (async () => {
      try {
        const freshPlan = await fetchLayerPlanFromMetadata();
        cachedLayerPlanPromise = Promise.resolve(freshPlan);
        saveLayerPlanToStorage(freshPlan);
      } catch {
        // Keep fast cached/default plan for this session when metadata is slow/unreachable.
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
