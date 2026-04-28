/**
 * mapQueryService.js
 *
 * Centralised query service for the HSAC MapServer.
 * Replaces the old Dojo AMD modules:
 *   demo/districtNew.js · demo/tehsilNew.js · demo/villageNew.js
 *   demo/murrabaNew.js  · demo/khasraNew.js · demo/drawBoundary.js
 *
 * All queries go against:
 *   https://hsac.org.in/server/rest/services/EODB/EODB_HR21/MapServer
 */

import * as restQuery from "@arcgis/core/rest/query.js";
import Query from "@arcgis/core/rest/support/Query.js";
import { HSAC_MAIN_URL } from "@/config/arcgis";
import { getCadastralLayerId, getHsacLayerPlan } from "@/services/hsacLayerResolver";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// Old logic (murrabaNew.js / khasraNew.js):
//   if (Dcode.startsWith('0')) urlsuffix = Dcode.replace("0", "");
// Maps district code like "09" → sublayer "/9", "10" → sublayer "/10"
// ─────────────────────────────────────────────────────────────────────────────
async function cadastralUrl(dCode) {
  const layerId = await getCadastralLayerId(dCode);
  return `${HSAC_MAIN_URL}/${layerId}`;
}

function cleanText(value) {
  return `${value ?? ""}`.trim();
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
    `${HSAC_MAIN_URL}/${layerPlan.districtLayerId}`,
    q,
  );

  return mapDistinctOptions(res.features, "n_d_code", "n_d_name");
}

// ─── Tehsils (Layer 27) ──────────────────────────────────────────────────────
/**
 * Fetch tehsils for a given district code from HSAC layer 27.
 * Migrated from: demo/tehsilNew.js → getTehsils()
 * @param {string} dCode  e.g. "09"
 * @returns {Promise<{code: string, name: string}[]>}
 */
export async function getTehsils(dCode) {
  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_t_code", "n_t_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_t_name"],
    where: `n_d_code='${dCode}' AND n_t_code IS NOT NULL AND n_t_code <> ''`,
  });

  const res = await restQuery.executeQueryJSON(
    `${HSAC_MAIN_URL}/${layerPlan.tehsilLayerId}`,
    q,
  );

  return mapDistinctOptions(res.features, "n_t_code", "n_t_name");
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
  const layerPlan = await getHsacLayerPlan();
  const q = new Query({
    outFields: ["n_v_code", "n_v_name"],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: ["n_v_name"],
    where: `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code IS NOT NULL AND n_v_code <> ''`,
  });

  const res = await restQuery.executeQueryJSON(
    `${HSAC_MAIN_URL}/${layerPlan.villageLayerId}`,
    q,
  );

  return mapDistinctOptions(res.features, "n_v_code", "n_v_name");
}

// ─── Internal cadastral helper ────────────────────────────────────────────────
/**
 * Query the cadastral sublayer for a district and return distinct text values
 * of a single attribute field. Used by getMurrabas and getKhasras which share
 * the same "distinct single-field" query shape.
 */
async function queryCadastralField(dCode, field, where) {
  const q = new Query({
    outFields: [field],
    returnDistinctValues: true,
    returnGeometry: false,
    orderByFields: [field],
    outSpatialReference: { wkid: 4326 },
    where,
  });
  const res = await restQuery.executeQueryJSON(await cadastralUrl(dCode), q);
  return res.features.map((f) => cleanText(f?.attributes?.[field])).filter(Boolean);
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

  const [districtRes, tehsilRes, villageRes] = await Promise.allSettled([
    restQuery.executeQueryJSON(
      `${HSAC_MAIN_URL}/${layerPlan.districtLayerId}`,
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
    ),
    restQuery.executeQueryJSON(
      `${HSAC_MAIN_URL}/${layerPlan.tehsilLayerId}`,
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
      `${HSAC_MAIN_URL}/${layerPlan.villageLayerId}`,
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

  const districtRows =
    districtRes.status === "fulfilled"
      ? mapAdminSuggestionRows("district", districtRes.value?.features ?? [], {
          nameKey: "n_d_name",
          dCodeKey: "n_d_code",
          dNameKey: "n_d_name",
        })
      : [];
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

  const typePriority = { district: 0, tehsil: 1, village: 2 };

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
      url   = `${HSAC_MAIN_URL}/${layerPlan.districtLayerId}`;
      where = `n_d_code='${dCode}'`;
      break;

    case "tehsil":
      url   = `${HSAC_MAIN_URL}/${layerPlan.tehsilLayerId}`;
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}'`;
      break;

    case "village":
      url   = `${HSAC_MAIN_URL}/${layerPlan.villageLayerId}`;
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
