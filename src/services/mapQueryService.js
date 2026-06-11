/**
 * mapQueryService.js
 *
 * Centralised query service for the HSAC MapServer.
 * Replaces the old Dojo AMD modules:
 *   demo/districtNew.js · demo/tehsilNew.js · demo/villageNew.js
 *   demo/murrabaNew.js  · demo/khasraNew.js · demo/drawBoundary.js
 *
 * All queries go against backend-provided HSAC MapServer proxy URL.
 */

import * as restQuery from "@arcgis/core/rest/query.js";
import Query from "@arcgis/core/rest/support/Query.js";
import { getHsacMainUrl } from "@/config/arcgis";
import { getCadastralLayerId, getHsacLayerPlan } from "@/services/hsacLayerResolver";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// Old logic (murrabaNew.js / khasraNew.js):
//   if (Dcode.startsWith('0')) urlsuffix = Dcode.replace("0", "");
// Maps district code like "09" → sublayer "/9", "10" → sublayer "/10"
// ─────────────────────────────────────────────────────────────────────────────
async function cadastralUrl(dCode) {
  const layerId = await getCadastralLayerId(dCode);
  return `${getHsacMainUrl()}/${layerId}`;
}

function cleanText(value) {
  return `${value ?? ""}`.trim();
}

// Voice/admin reference datasets (all districts/tehsils/villages) are large and
// effectively static for a session. Cache them in sessionStorage so they are fetched
// from HSAC at most once per tab instead of on every map open.
function readSessionCache(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSessionCache(key, value) {
  if (typeof window === "undefined" || !Array.isArray(value) || !value.length) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/private-mode write failures — data simply re-fetches next time.
  }
}

const DISTRICTS_CACHE_KEY = "eodb_ref_districts_v1";
const ALL_TEHSILS_CACHE_KEY = "eodb_ref_all_tehsils_v1";
const ALL_VILLAGES_CACHE_KEY = "eodb_ref_all_villages_v1";

function tehsilsCacheKey(dCode) {
  return `eodb_tehsils_${dCode}_v1`;
}

function villagesCacheKey(dCode, tCode) {
  return `eodb_villages_${dCode}_${tCode}_v1`;
}

function murrabasCacheKey(dCode, tCode, vCode) {
  return `eodb_murabba_${dCode}_${tCode}_${vCode}_v1`;
}

function khasrasCacheKey(dCode, tCode, vCode, murabbaNo) {
  return `eodb_khasra_${dCode}_${tCode}_${vCode}_${murabbaNo}_v1`;
}

function mapDistinctOptions(features, codeKey, nameKey) {
  const seen = new Set();

  return features
    .map((feature) => {
      const code = cleanText(feature?.attributes?.[codeKey]);
      const name = cleanText(feature?.attributes?.[nameKey]);
      return { code, name };
    })
    .filter(({ code, name }) => {
      if (!code || !name) return false;
      const signature = `${code}::${name}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
}

function normalizeLookupName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeAdminSearchTerm(value) {
  return normalizeLookupName(value);
}

export function formatAdminSuggestionDescription(match) {
  if (match.type === "district") {
    return "District boundary";
  }

  if (match.type === "tehsil") {
    return `Tehsil boundary | District ${match.dName || match.dCode}`;
  }

  return `Village boundary | District ${match.dName || match.dCode} | Tehsil ${match.tName || match.tCode}`;
}

export function toAdminSuggestionItem(match) {
  return {
    id: `admin-${match.id}`,
    kind: "admin",
    title: match.name,
    description: formatAdminSuggestionDescription(match),
    boundaryType: match.type,
    codes: {
      dCode: match.dCode,
      ...(match.tCode ? { tCode: match.tCode } : {}),
      ...(match.vCode ? { vCode: match.vCode } : {}),
    },
  };
}

export async function resolveAdminBoundarySearchTarget(rawQuery, options = {}) {
  const matches = await searchAdministrativeAreas(rawQuery, { limit: options.limit ?? 10 });
  if (!matches.length) return null;

  const normalizedQuery = normalizeAdminSearchTerm(rawQuery);
  const exact = matches.find(
    (match) => normalizeAdminSearchTerm(match.name) === normalizedQuery,
  );
  const chosen = exact ?? matches[0];

  return {
    target: {
      type: chosen.type,
      label: chosen.name,
      codes: {
        dCode: chosen.dCode,
        ...(chosen.tCode ? { tCode: chosen.tCode } : {}),
        ...(chosen.vCode ? { vCode: chosen.vCode } : {}),
      },
    },
    exactMatch: Boolean(exact),
  };
}

function escapeSqlLikeTerm(value) {
  return cleanText(value)
    .replace(/'/g, "''")
    .replace(/[%_]/g, " ");
}

function scoreNameMatch(name, searchTerm) {
  const normalizedName = normalizeLookupName(name);
  const normalizedTerm = normalizeLookupName(searchTerm);

  if (!normalizedName || !normalizedTerm) return Number.MAX_SAFE_INTEGER;
  if (normalizedName === normalizedTerm) return 0;
  if (normalizedName.startsWith(normalizedTerm)) return 1;
  if (normalizedName.includes(normalizedTerm)) return 2;
  return 3;
}

function mapAdminSuggestionRows(type, features, fields) {
  const seen = new Set();

  return features
    .map((feature) => {
      const attributes = feature?.attributes ?? {};
      const name = cleanText(attributes[fields.nameKey]);
      const dCode = cleanText(attributes[fields.dCodeKey]);
      const tCode = cleanText(attributes[fields.tCodeKey]);
      const vCode = cleanText(attributes[fields.vCodeKey]);
      const dName = cleanText(attributes[fields.dNameKey]);
      const tName = cleanText(attributes[fields.tNameKey]);

      if (!name || !dCode) return null;
      if (type !== "district" && !tCode) return null;
      if (type === "village" && !vCode) return null;

      const signature = [type, dCode, tCode, vCode].filter(Boolean).join(":");
      if (seen.has(signature)) return null;
      seen.add(signature);

      return {
        id: signature,
        type,
        name,
        dCode,
        tCode: tCode || undefined,
        vCode: vCode || undefined,
        dName: dName || undefined,
        tName: tName || undefined,
      };
    })
    .filter(Boolean);
}

// ─── Districts (Layer 26) ────────────────────────────────────────────────────
/**
 * Fetch all Haryana districts from HSAC layer 26.
 * Migrated from: demo/districtNew.js → getDistricts()
 * @returns {Promise<{code: string, name: string}[]>}
 */
export async function getDistricts() {
  const cached = readSessionCache(DISTRICTS_CACHE_KEY);
  if (cached) return cached;

  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_d_code", "n_d_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_d_name"],
    where: "n_d_code IS NOT NULL AND n_d_code <> '' AND n_d_name IS NOT NULL AND n_d_name <> ''",
    outSpatialReference: { wkid: 4326 },
  });

  const res = await restQuery.executeQueryJSON(
    `${getHsacMainUrl()}/${layerPlan.districtLayerId}`,
    q,
  );

  const districts = mapDistinctOptions(res.features, "n_d_code", "n_d_name");
  writeSessionCache(DISTRICTS_CACHE_KEY, districts);
  return districts;
}

// ─── Tehsils (Layer 27) ──────────────────────────────────────────────────────
/**
 * Fetch tehsils for a given district code from HSAC layer 27.
 * Migrated from: demo/tehsilNew.js → getTehsils()
 * @param {string} dCode  e.g. "09"
 * @returns {Promise<{code: string, name: string}[]>}
 */
export async function getTehsils(dCode) {
  const cached = readSessionCache(tehsilsCacheKey(dCode));
  if (cached) return cached;

  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_t_code", "n_t_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_t_name"],
    where: `n_d_code='${dCode}' AND n_t_code IS NOT NULL AND n_t_code <> ''`,
  });

  const res = await restQuery.executeQueryJSON(
    `${getHsacMainUrl()}/${layerPlan.tehsilLayerId}`,
    q,
  );

  const tehsils = mapDistinctOptions(res.features, "n_t_code", "n_t_name");
  writeSessionCache(tehsilsCacheKey(dCode), tehsils);
  return tehsils;
}

/**
 * Fetch all Haryana tehsils with district context for voice matching.
 * This keeps a local list so voice can resolve near-spelling variants
 * (for example: "badli" -> "badali") without relying only on SQL LIKE.
 *
 * @returns {Promise<Array<{ dCode: string, dName: string, tCode: string, tName: string }>>}
 */
export async function getAllTehsils() {
  const cached = readSessionCache(ALL_TEHSILS_CACHE_KEY);
  if (cached) return cached;

  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_d_code", "n_d_name", "n_t_code", "n_t_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_t_name", "n_d_name"],
    where:
      "n_d_code IS NOT NULL AND n_d_code <> '' " +
      "AND n_t_code IS NOT NULL AND n_t_code <> '' " +
      "AND n_t_name IS NOT NULL AND n_t_name <> ''",
  });

  const res = await restQuery.executeQueryJSON(
    `${getHsacMainUrl()}/${layerPlan.tehsilLayerId}`,
    q,
  );

  const seen = new Set();

  const tehsils = (res.features || [])
    .map((feature) => {
      const attrs = feature?.attributes ?? {};
      const dCode = cleanText(attrs.n_d_code);
      const dName = cleanText(attrs.n_d_name);
      const tCode = cleanText(attrs.n_t_code);
      const tName = cleanText(attrs.n_t_name);
      if (!dCode || !tCode || !tName) {
        return null;
      }

      const signature = `${dCode}:${tCode}`;
      if (seen.has(signature)) {
        return null;
      }
      seen.add(signature);

      return {
        dCode,
        dName,
        tCode,
        tName,
      };
    })
    .filter(Boolean);

  writeSessionCache(ALL_TEHSILS_CACHE_KEY, tehsils);
  return tehsils;
}

// ─── Villages (Layer 28) ─────────────────────────────────────────────────────
/**
 * Fetch villages for a district + tehsil from HSAC layer 28.
 * Migrated from: demo/villageNew.js → getVillages()
 * @param {string} dCode
 * @param {string} tCode
 * @returns {Promise<{code: string, name: string}[]>}
 */
export async function getVillages(dCode, tCode) {
  const cached = readSessionCache(villagesCacheKey(dCode, tCode));
  if (cached) return cached;

  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_v_code", "n_v_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_v_name"],
    where: `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code IS NOT NULL AND n_v_code <> ''`,
  });

  const res = await restQuery.executeQueryJSON(
    `${getHsacMainUrl()}/${layerPlan.villageLayerId}`,
    q,
  );

  const villages = mapDistinctOptions(res.features, "n_v_code", "n_v_name");
  writeSessionCache(villagesCacheKey(dCode, tCode), villages);
  return villages;
}

/**
 * Fetch all Haryana villages with district + tehsil context for voice matching.
 * Used by voice assistant so village-name commands can resolve without requiring
 * exact spelling from speech recognition.
 *
 * @returns {Promise<Array<{
 *   dCode: string, dName: string, tCode: string, tName: string, vCode: string, vName: string
 * }>>}
 */
export async function getAllVillages() {
  const cached = readSessionCache(ALL_VILLAGES_CACHE_KEY);
  if (cached) return cached;

  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_d_code", "n_d_name", "n_t_code", "n_t_name", "n_v_code", "n_v_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_v_name", "n_t_name", "n_d_name"],
    where:
      "n_d_code IS NOT NULL AND n_d_code <> '' " +
      "AND n_t_code IS NOT NULL AND n_t_code <> '' " +
      "AND n_v_code IS NOT NULL AND n_v_code <> '' " +
      "AND n_v_name IS NOT NULL AND n_v_name <> ''",
  });

  const res = await restQuery.executeQueryJSON(
    `${getHsacMainUrl()}/${layerPlan.villageLayerId}`,
    q,
  );

  const seen = new Set();

  const villages = (res.features || [])
    .map((feature) => {
      const attrs = feature?.attributes ?? {};
      const dCode = cleanText(attrs.n_d_code);
      const dName = cleanText(attrs.n_d_name);
      const tCode = cleanText(attrs.n_t_code);
      const tName = cleanText(attrs.n_t_name);
      const vCode = cleanText(attrs.n_v_code);
      const vName = cleanText(attrs.n_v_name);

      if (!dCode || !tCode || !vCode || !vName) {
        return null;
      }

      const signature = `${dCode}:${tCode}:${vCode}`;
      if (seen.has(signature)) {
        return null;
      }
      seen.add(signature);

      return {
        dCode,
        dName,
        tCode,
        tName,
        vCode,
        vName,
      };
    })
    .filter(Boolean);

  writeSessionCache(ALL_VILLAGES_CACHE_KEY, villages);
  return villages;
}

// ─── Internal cadastral helper ────────────────────────────────────────────────
/**
 * Query the cadastral sublayer for a district and return distinct text values
 * of a single attribute field. Used by getMurrabas and getKhasras which share
 * the same "distinct single-field" query shape.
 */
async function queryCadastralField(dCode, field, where, cacheKey = null) {
  if (cacheKey) {
    const cached = readSessionCache(cacheKey);
    if (cached) return cached;
  }

  const q = new Query({
    outFields: [field],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: [field],
    outSpatialReference: { wkid: 4326 },
    where,
  });
  const res = await restQuery.executeQueryJSON(await cadastralUrl(dCode), q);
  const values = res.features.map((f) => cleanText(f?.attributes?.[field])).filter(Boolean);
  if (cacheKey) writeSessionCache(cacheKey, values);
  return values;
}

// ─── Murrabas (Cadastral sublayer by district) ───────────────────────────────
/**
 * Fetch murabba numbers for a village from the cadastral district sublayer.
 * Migrated from: demo/murrabaNew.js → getMurrabas()
 *
 * The cadastral sublayer index equals the numeric district code
 * (leading zero stripped), e.g. dCode "09" → sublayer "/9"
 *
 * @param {string} dCode
 * @param {string} tCode
 * @param {string} vCode
 * @returns {Promise<string[]>}  sorted murabba numbers
 */
export async function getMurrabas(dCode, tCode, vCode) {
  return queryCadastralField(
    dCode,
    "n_murr_no",
    `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}' AND n_murr_no IS NOT NULL AND n_murr_no <> ''`,
    murrabasCacheKey(dCode, tCode, vCode),
  );
}

// ─── Khasras (Cadastral sublayer by district) ────────────────────────────────
/**
 * Fetch khasra numbers for a murabba from the cadastral district sublayer.
 * Migrated from: demo/khasraNew.js → getKhasras()
 *
 * @param {string} dCode
 * @param {string} tCode
 * @param {string} vCode
 * @param {string} murabbaNo
 * @returns {Promise<string[]>}  sorted khasra numbers
 */
export async function getKhasras(dCode, tCode, vCode, murabbaNo) {
  return queryCadastralField(
    dCode,
    "n_khas_no",
    `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}' AND n_murr_no='${murabbaNo}' AND n_khas_no IS NOT NULL AND n_khas_no <> ''`,
    khasrasCacheKey(dCode, tCode, vCode, murabbaNo),
  );
}

// ─── Single-name search across district / tehsil / village ──────────────────
/**
 * Search HSAC administrative boundaries by a single free-text name.
 * Supports district, tehsil and village matches in one request pipeline.
 *
 * @param {string} term
 * @param {{ limit?: number }} [options]
 * @returns {Promise<Array<{
 *   id: string,
 *   type: "district"|"tehsil"|"village",
 *   name: string,
 *   dCode: string,
 *   tCode?: string,
 *   vCode?: string,
 *   dName?: string,
 *   tName?: string
 * }>>}
 */
export async function searchAdministrativeAreas(term, options = {}) {
  const cleanedTerm = cleanText(term);
  if (!cleanedTerm) return [];

  const likeTerm = escapeSqlLikeTerm(cleanedTerm).toUpperCase();
  if (!likeTerm) return [];

  const limit = Math.max(1, Number(options.limit) || 10);
  const perLayerCount = Math.max(limit * 2, 12);
  const layerPlan = await getHsacLayerPlan();
  const typePriority = { district: 0, tehsil: 1, village: 2 };

  const districtRes = await restQuery
    .executeQueryJSON(
      `${getHsacMainUrl()}/${layerPlan.districtLayerId}`,
      new Query({
        outFields: ["n_d_code", "n_d_name"],
        returnDistinctValues: true,
        returnGeometry: false,
        orderByFields: ["n_d_name"],
        num: perLayerCount,
        where:
          "n_d_code IS NOT NULL AND n_d_code <> '' " +
          "AND n_d_name IS NOT NULL AND n_d_name <> '' " +
          `AND UPPER(n_d_name) LIKE '%${likeTerm}%'`,
      }),
    )
    .catch(() => null);

  const districtRows = mapAdminSuggestionRows("district", districtRes?.features ?? [], {
    nameKey: "n_d_name",
    dCodeKey: "n_d_code",
    dNameKey: "n_d_name",
  });

  if (districtRows.length >= limit) {
    return districtRows
      .map((row) => ({
        ...row,
        _score: scoreNameMatch(row.name, cleanedTerm),
      }))
      .sort((a, b) => {
        if (a._score !== b._score) return a._score - b._score;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit)
      .map(({ _score, ...row }) => row);
  }

  const [tehsilRes, villageRes] = await Promise.allSettled([
    restQuery.executeQueryJSON(
      `${getHsacMainUrl()}/${layerPlan.tehsilLayerId}`,
      new Query({
        outFields: ["n_d_code", "n_d_name", "n_t_code", "n_t_name"],
        returnDistinctValues: true,
        returnGeometry: false,
        orderByFields: ["n_t_name"],
        num: perLayerCount,
        where:
          "n_d_code IS NOT NULL AND n_d_code <> '' " +
          "AND n_t_code IS NOT NULL AND n_t_code <> '' " +
          "AND n_t_name IS NOT NULL AND n_t_name <> '' " +
          `AND UPPER(n_t_name) LIKE '%${likeTerm}%'`,
      }),
    ),
    restQuery.executeQueryJSON(
      `${getHsacMainUrl()}/${layerPlan.villageLayerId}`,
      new Query({
        outFields: ["n_d_code", "n_d_name", "n_t_code", "n_t_name", "n_v_code", "n_v_name"],
        returnDistinctValues: true,
        returnGeometry: false,
        orderByFields: ["n_v_name"],
        num: perLayerCount,
        where:
          "n_d_code IS NOT NULL AND n_d_code <> '' " +
          "AND n_t_code IS NOT NULL AND n_t_code <> '' " +
          "AND n_v_code IS NOT NULL AND n_v_code <> '' " +
          "AND n_v_name IS NOT NULL AND n_v_name <> '' " +
          `AND UPPER(n_v_name) LIKE '%${likeTerm}%'`,
      }),
    ),
  ]);

  const tehsilRows =
    tehsilRes.status === "fulfilled"
      ? mapAdminSuggestionRows("tehsil", tehsilRes.value?.features ?? [], {
          nameKey: "n_t_name",
          dCodeKey: "n_d_code",
          tCodeKey: "n_t_code",
          dNameKey: "n_d_name",
          tNameKey: "n_t_name",
        })
      : [];
  const villageRows =
    villageRes.status === "fulfilled"
      ? mapAdminSuggestionRows("village", villageRes.value?.features ?? [], {
          nameKey: "n_v_name",
          dCodeKey: "n_d_code",
          tCodeKey: "n_t_code",
          vCodeKey: "n_v_code",
          dNameKey: "n_d_name",
          tNameKey: "n_t_name",
        })
      : [];

  return [...districtRows, ...tehsilRows, ...villageRows]
    .map((row) => ({
      ...row,
      _score: scoreNameMatch(row.name, cleanedTerm),
    }))
    .sort((a, b) => {
      if (a._score !== b._score) return a._score - b._score;
      if (typePriority[a.type] !== typePriority[b.type]) {
        return typePriority[a.type] - typePriority[b.type];
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map(({ _score, ...row }) => row);
}

// ─── Boundary geometry ───────────────────────────────────────────────────────
/**
 * Query the boundary geometry for a given administrative level.
 * Migrated from: demo/drawBoundary.js → boundaryOf()
 *
 * Supported types: "district" | "tehsil" | "village" | "murabba" | "khasra"
 *
 * @param {"district"|"tehsil"|"village"|"murabba"|"khasra"} type
 * @param {{ dCode: string, tCode?: string, vCode?: string, murabbaNo?: string, khasraNo?: string }} codes
 * @returns {Promise<{ features: object[] }>}  ArcGIS Feature objects with geometry
 */
export async function getBoundaryGeometry(type, codes) {
  const { dCode, tCode, vCode, murabbaNo, khasraNo } = codes;
  const layerPlan = await getHsacLayerPlan();
  let url;
  let where;

  switch (type) {
    case "district":
      url   = `${getHsacMainUrl()}/${layerPlan.districtLayerId}`;
      where = `n_d_code='${dCode}'`;
      break;

    case "tehsil":
      url   = `${getHsacMainUrl()}/${layerPlan.tehsilLayerId}`;
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}'`;
      break;

    case "village":
      url   = `${getHsacMainUrl()}/${layerPlan.villageLayerId}`;
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}'`;
      break;

    case "murabba":
      url   = await cadastralUrl(dCode);
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}' AND n_murr_no='${murabbaNo}'`;
      break;

    case "khasra":
      url   = await cadastralUrl(dCode);
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}' AND n_murr_no='${murabbaNo}' AND n_khas_no='${khasraNo}'`;
      break;

    default:
      return { features: [] };
  }

  const q = new Query({
    returnGeometry: true,
    outFields: ["*"],
    outSpatialReference: { wkid: 4326 },
    where,
  });

  const res = await restQuery.executeQueryJSON(url, q);
  return { features: res.features };
}

