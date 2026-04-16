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
import { HSAC_MAIN_URL, HSAC_LAYER } from "@/config/arcgis";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// Old logic (murrabaNew.js / khasraNew.js):
//   if (Dcode.startsWith('0')) urlsuffix = Dcode.replace("0", "");
// Maps district code like "09" → sublayer "/9", "10" → sublayer "/10"
// ─────────────────────────────────────────────────────────────────────────────
function cadastralUrl(dCode) {
  const suffix = dCode.startsWith("0") ? dCode.replace(/^0/, "") : dCode;
  return `${HSAC_MAIN_URL}/${suffix}`;
}

// ─── Districts (Layer 26) ────────────────────────────────────────────────────
/**
 * Fetch all Haryana districts from HSAC layer 26.
 * Migrated from: demo/districtNew.js → getDistricts()
 * @returns {Promise<{code: string, name: string}[]>}
 */
export async function getDistricts() {
  const q = new Query({
    outFields: ["n_d_code", "n_d_name"],
    returnDistinctValues: true,
    orderByFields: ["n_d_name"],
    where: `NOT "n_d_code"=' ' AND NOT "n_d_name"=' '`,
    outSpatialReference: { wkid: 4326 },
  });

  const res = await restQuery.executeQueryJSON(
    `${HSAC_MAIN_URL}/${HSAC_LAYER.DISTRICT}`,
    q,
  );

  return res.features.map((f) => ({
    code: f.attributes.n_d_code,
    name: f.attributes.n_d_name,
  }));
}

// ─── Tehsils (Layer 27) ──────────────────────────────────────────────────────
/**
 * Fetch tehsils for a given district code from HSAC layer 27.
 * Migrated from: demo/tehsilNew.js → getTehsils()
 * @param {string} dCode  e.g. "09"
 * @returns {Promise<{code: string, name: string}[]>}
 */
export async function getTehsils(dCode) {
  const q = new Query({
    outFields: ["n_t_code", "n_t_name"],
    returnDistinctValues: true,
    orderByFields: ["n_t_name"],
    where: `n_d_code='${dCode}' AND NOT n_t_code=' '`,
  });

  const res = await restQuery.executeQueryJSON(
    `${HSAC_MAIN_URL}/${HSAC_LAYER.TEHSIL}`,
    q,
  );

  return res.features.map((f) => ({
    code: f.attributes.n_t_code,
    name: f.attributes.n_t_name,
  }));
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
  const q = new Query({
    outFields: ["n_v_code", "n_v_name"],
    returnDistinctValues: true,
    orderByFields: ["n_v_name"],
    where: `n_d_code='${dCode}' AND n_t_code='${tCode}'`,
  });

  const res = await restQuery.executeQueryJSON(
    `${HSAC_MAIN_URL}/${HSAC_LAYER.VILLAGE}`,
    q,
  );

  return res.features.map((f) => ({
    code: f.attributes.n_v_code,
    name: f.attributes.n_v_name,
  }));
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
  const q = new Query({
    outFields: ["n_murr_no"],
    returnDistinctValues: true,
    orderByFields: ["n_murr_no"],
    outSpatialReference: { wkid: 4326 },
    where: `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}'`,
  });

  const res = await restQuery.executeQueryJSON(cadastralUrl(dCode), q);
  return res.features.map((f) => f.attributes.n_murr_no).filter(Boolean);
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
  const q = new Query({
    outFields: ["n_khas_no"],
    returnDistinctValues: true,
    orderByFields: ["n_khas_no"],
    where: `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}' AND n_murr_no='${murabbaNo}'`,
  });

  const res = await restQuery.executeQueryJSON(cadastralUrl(dCode), q);
  return res.features.map((f) => f.attributes.n_khas_no).filter(Boolean);
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
  let url;
  let where;

  switch (type) {
    case "district":
      url   = `${HSAC_MAIN_URL}/${HSAC_LAYER.DISTRICT}`;
      where = `n_d_code='${dCode}'`;
      break;

    case "tehsil":
      url   = `${HSAC_MAIN_URL}/${HSAC_LAYER.TEHSIL}`;
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}'`;
      break;

    case "village":
      url   = `${HSAC_MAIN_URL}/${HSAC_LAYER.VILLAGE}`;
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}'`;
      break;

    case "murabba":
      url   = cadastralUrl(dCode);
      where = `n_d_code='${dCode}' AND n_t_code='${tCode}' AND n_v_code='${vCode}' AND n_murr_no='${murabbaNo}'`;
      break;

    case "khasra":
      url   = cadastralUrl(dCode);
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
