/**
 * landRecordService.js
 *
 * Wrappers for the HSAC ASMX land-record web services.
 * Migrated from the old project AMD modules:
 *   demo/khewat.js        → getKhewats()
 *   demo/timePeriod.js    → getJamabandiPeriod()
 *   demo/khatoni.js       → getKhatonis()
 *   demo/ownersInPopup.js → getOwnerNames()
 *
 * All endpoints are XML-based ASMX services hosted at:
 *   https://hsac.org.in/LandOwnerAPI/getownername.asmx/
 *
 * CORS: In development the Vite proxy rewrites /LandOwnerAPI → https://hsac.org.in/LandOwnerAPI
 *       so these relative URLs work. In production configure your web-server (Nginx etc.)
 *       to proxy the same path prefix.
 *
 * ASMX response format (double-wrapped XML):
 *   Outer:  <string xmlns="...">INNER_XML_AS_TEXT</string>
 *   Inner:  <NewDataSet><Table><khewat>123</khewat></Table>…</NewDataSet>
 *
 * This matches exactly what the old jQuery $.ajax({ dataType:"xml" }) code did:
 *   result.documentElement.firstChild.textContent  →  inner XML string
 *   new DOMParser().parseFromString(inner, "text/xml")  →  final document
 */

// ─── Base URL (relative — proxied by Vite in dev, Nginx in prod) ─────────────
// Configured via VITE_ASMX_BASE_PATH in .env.
const ASMX_BASE =
  import.meta.env.VITE_ASMX_BASE_PATH ?? "/LandOwnerAPI/getownername.asmx";

// ─── Internal helpers ─────────────────────────────────────────────────────────
/**
 * Extract trimmed text values from every element matching tagName.
 * Used by getKhewats and getKhatonis which share the same extraction pattern.
 */
function extractTagValues(doc, tagName) {
  return Array.from(doc.getElementsByTagName(tagName))
    .map((n) => n.firstChild?.nodeValue?.trim())
    .filter(Boolean);
}


/**
 * Parse the double-wrapped ASMX XML response.
 *
 * Step 1: parse raw text → outer XMLDocument
 * Step 2: read text content of root's first child (= inner XML string)
 * Step 3: parse inner XML string → final XMLDocument
 *
 * @param {string} rawText  Raw response body from fetch()
 * @returns {Document | null}
 */
function parseAsmxXml(rawText) {
  const parser = new DOMParser();
  const outer  = parser.parseFromString(rawText, "text/xml");

  // Check for parse errors in outer document
  if (outer.querySelector("parsererror")) return null;

  const innerText = outer.documentElement?.firstChild?.textContent?.trim();
  if (!innerText) return null;

  const inner = parser.parseFromString(innerText, "text/xml");
  if (inner.querySelector("parsererror")) return null;

  return inner;
}

/**
 * Low-level GET request to an ASMX endpoint.
 *
 * @param {string} method  e.g. "GetKhewats"
 * @param {Record<string, string>} params  Query-string parameters
 * @returns {Promise<Document | null>}  Parsed inner XML document
 * @throws  On non-OK HTTP status
 */
async function asmxGet(method, params) {
  const qs  = new URLSearchParams(params).toString();
  const url = `${ASMX_BASE}/${method}?${qs}`;

  const res = await fetch(url, {
    headers: { Accept: "text/xml, application/xml" },
  });

  if (!res.ok) {
    throw new Error(`ASMX ${method} returned HTTP ${res.status}`);
  }

  const text = await res.text();
  return parseAsmxXml(text);
}

// ─── Khewats ──────────────────────────────────────────────────────────────────
/**
 * Fetch Khewat numbers for a village.
 * Migrated from: demo/khewat.js → Khewatoption()
 *
 * Old endpoint:
 *   https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetKhewats
 *   ?Dcode1=XX&Tcode1=XX&Nvcode1=XX
 *
 * Old XML tag read: a.getElementsByTagName('khewat')[i].childNodes[0].nodeValue
 *
 * @param {string} dCode  District code  e.g. "09"
 * @param {string} tCode  Tehsil code
 * @param {string} vCode  Village code
 * @returns {Promise<string[]>}  Sorted khewat numbers
 */
export async function getKhewats(dCode, tCode, vCode) {
  const doc = await asmxGet("GetKhewats", {
    Dcode1:  dCode,
    Tcode1:  tCode,
    Nvcode1: vCode,
  });
  if (!doc) return [];

  return extractTagValues(doc, "khewat");
}

// ─── Jamabandi Period ─────────────────────────────────────────────────────────
/**
 * Fetch the current Jamabandi period string for a village.
 * Migrated from: demo/timePeriod.js → TimePeriodOption()
 *
 * Old endpoint:
 *   https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetJamabandiPeriod
 *   ?Dcode1=XX&Tcode1=XX&Nvcode1=XX
 *
 * Old code extracted with: xmlText.slice(52, -51)
 * New: reads textContent of root element after double-parse.
 *
 * @param {string} dCode
 * @param {string} tCode
 * @param {string} vCode
 * @returns {Promise<string>}  e.g. "2023-24"
 */
export async function getJamabandiPeriod(dCode, tCode, vCode) {
  const doc = await asmxGet("GetJamabandiPeriod", {
    Dcode1:  dCode,
    Tcode1:  tCode,
    Nvcode1: vCode,
  });
  if (!doc) return "";

  // After double-parse the root element's text content is the period string
  return doc.documentElement?.textContent?.trim() ?? "";
}

// ─── Khatonis ─────────────────────────────────────────────────────────────────
/**
 * Fetch Khatoni numbers for a Khewat + period combination.
 * Migrated from: demo/khatoni.js → getkhatoni()
 *
 * Old endpoint:
 *   https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetKhatonis
 *   ?Dcode1=XX&Tcode1=XX&Nvcode1=XX&period1=XX&khewat1=XX
 *
 * Old XML tag read: a.getElementsByTagName('khatoni')[i].childNodes[0].nodeValue
 *
 * @param {string} dCode
 * @param {string} tCode
 * @param {string} vCode
 * @param {string} period  Jamabandi period from getJamabandiPeriod()
 * @param {string} khewat  Selected Khewat number
 * @returns {Promise<string[]>}  Khatoni numbers
 */
export async function getKhatonis(dCode, tCode, vCode, period, khewat) {
  const doc = await asmxGet("GetKhatonis", {
    Dcode1:  dCode,
    Tcode1:  tCode,
    Nvcode1: vCode,
    period1: period,
    khewat1: khewat,
  });
  if (!doc) return [];

  return extractTagValues(doc, "khatoni");
}

// ─── Owner Names ──────────────────────────────────────────────────────────────
/**
 * Fetch owner names for a Khasra parcel.
 * Migrated from: demo/ownersInPopup.js → Owners_name()
 *
 * Old endpoint:
 *   https://hsac.org.in/LandOwnerAPI/getownername.asmx/Owner_name
 *   ?Dcode1=XX&Tcode1=XX&Nvcode1=XX&Mustno1=XX&Khasra1=XX
 *
 * Old XML tag read:
 *   a.getElementsByTagName('OWNER')[i].childNodes[0].nodeValue.split(",")
 *
 * @param {string} dCode
 * @param {string} tCode
 * @param {string} vCode
 * @param {string} murabbaNo
 * @param {string} khasraNo
 * @returns {Promise<string[]>}  One entry per owner
 */
export async function getOwnerNames(dCode, tCode, vCode, murabbaNo, khasraNo) {
  const doc = await asmxGet("Owner_name", {
    Dcode1:  dCode,
    Tcode1:  tCode,
    Nvcode1: vCode,
    Mustno1: murabbaNo,
    Khasra1: khasraNo,
  });
  if (!doc) return [];

  const nodes  = doc.getElementsByTagName("OWNER");
  const owners = [];

  Array.from(nodes).forEach((node) => {
    const val = node.firstChild?.nodeValue;
    if (!val || !val.trim()) {
      owners.push("No Owner Name");
      return;
    }
    // Old code split comma-separated owners within a single <OWNER> element
    val.split(",").forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) owners.push(trimmed);
    });
  });

  return owners;
}
