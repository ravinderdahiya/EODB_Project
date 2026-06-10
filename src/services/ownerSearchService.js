import { getRuntimeConfigValue } from "@/config/runtimeConfig";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickFirstValue(source, keys) {
  if (!source || typeof source !== "object") return "";
  for (const key of keys) {
    const value = String(source[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function unwrapOwnerPayload(payload) {
  let value = payload;
  for (let i = 0; i < 5; i += 1) {
    if (Array.isArray(value) && value.length === 1) {
      value = value[0];
      continue;
    }
    if (!value || typeof value !== "object") break;
    const nested = value.data ?? value.result ?? value.payload ?? value.response;
    if (nested && nested !== value) {
      value = nested;
      continue;
    }
    break;
  }
  return value || {};
}

function extractOwnerQueryField(sourceText, labels, allLabels) {
  const source = cleanText(sourceText);
  if (!source) return "";

  const labelPattern = labels.map(escapeRegex).join("|");
  const boundaryPattern = allLabels.map(escapeRegex).join("|");
  const regex = new RegExp(
    `(?:^|\\s)(?:${labelPattern})\\s*[:\\-]?\\s*(.+?)(?=\\s+(?:${boundaryPattern})(?:\\s*[:\\-]?\\s*|$)|$)`,
    "iu",
  );
  const match = source.match(regex);
  return cleanText(match?.[1] || "");
}

function extractOwnerQueryHints(inputQuery) {
  const baseQuery = cleanText(inputQuery);
  if (!baseQuery) return {};

  const fields = {
    district: ["district", "\u091c\u093f\u0932\u093e"],
    tehsil: ["tehsil", "\u0924\u0939\u0938\u0940\u0932"],
    village: ["village", "gaon", "\u0917\u093e\u0902\u0935", "\u0917\u093e\u0901\u0935"],
    murabba: ["murabba", "muraba", "murraba", "\u092e\u0941\u0930\u092c\u093e", "\u092e\u0941\u0930\u092c\u094d\u092c\u093e"],
    khasra: ["khasra", "\u0916\u0938\u0930\u093e"],
  };
  const allLabels = Object.values(fields).flat();

  return {
    district: extractOwnerQueryField(baseQuery, fields.district, allLabels),
    tehsil: extractOwnerQueryField(baseQuery, fields.tehsil, allLabels),
    village: extractOwnerQueryField(baseQuery, fields.village, allLabels),
    murabba: extractOwnerQueryField(baseQuery, fields.murabba, allLabels),
    khasra: extractOwnerQueryField(baseQuery, fields.khasra, allLabels),
  };
}

export function buildOwnerApiQueryVariants(inputQuery) {
  const baseQuery = cleanText(inputQuery);
  if (!baseQuery) return [];

  const fields = {
    name: ["name", "owner", "\u0928\u093e\u092e"],
    district: ["district", "\u091c\u093f\u0932\u093e"],
    tehsil: ["tehsil", "\u0924\u0939\u0938\u0940\u0932"],
    village: ["village", "gaon", "\u0917\u093e\u0902\u0935", "\u0917\u093e\u0901\u0935"],
    murabba: ["murabba", "muraba", "murraba", "\u092e\u0941\u0930\u092c\u093e", "\u092e\u0941\u0930\u092c\u094d\u092c\u093e"],
    khasra: ["khasra", "\u0916\u0938\u0930\u093e"],
  };
  const allLabels = Object.values(fields).flat();

  const extracted = {
    name: extractOwnerQueryField(baseQuery, fields.name, allLabels),
    district: extractOwnerQueryField(baseQuery, fields.district, allLabels),
    tehsil: extractOwnerQueryField(baseQuery, fields.tehsil, allLabels),
    village: extractOwnerQueryField(baseQuery, fields.village, allLabels),
    murabba: extractOwnerQueryField(baseQuery, fields.murabba, allLabels),
    khasra: extractOwnerQueryField(baseQuery, fields.khasra, allLabels),
  };

  const variants = [baseQuery];
  if (extracted.district && extracted.tehsil && extracted.village && extracted.murabba && extracted.khasra) {
    const englishCore = `district ${extracted.district} tehsil ${extracted.tehsil} village ${extracted.village} murabba ${extracted.murabba} khasra ${extracted.khasra}`;
    const hindiCore = `\u091c\u093f\u0932\u093e ${extracted.district} \u0924\u0939\u0938\u0940\u0932 ${extracted.tehsil} \u0917\u093e\u0902\u0935 ${extracted.village} \u092e\u0941\u0930\u092c\u093e ${extracted.murabba} \u0916\u0938\u0930\u093e ${extracted.khasra}`;
    variants.push(englishCore, hindiCore);
    if (extracted.name) {
      variants.push(`name ${extracted.name} ${englishCore}`);
      variants.push(`\u0928\u093e\u092e ${extracted.name} ${hindiCore}`);
    }
  }

  const deduped = [];
  const seen = new Set();
  variants.forEach((variant) => {
    const normalized = cleanText(variant);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(normalized);
  });
  return deduped.slice(0, 6);
}

function hasOwnerApiResolvedData(payload) {
  if (!payload || typeof payload !== "object") return false;

  const root = unwrapOwnerPayload(payload);
  if (!root || typeof root !== "object") return false;

  const land = root?.land_records && typeof root.land_records === "object"
    ? root.land_records
    : root;
  const spoken = root?.spoken_text && typeof root.spoken_text === "object"
    ? root.spoken_text
    : {};

  const hasCoreFields = [
    "district",
    "tehsil",
    "village",
    "murraba_no",
    "murabba_no",
    "khasra_no",
    "nd_code",
    "nt_code",
    "nv_code",
  ].some((key) => cleanText(land?.[key] ?? spoken?.[key]));

  const hasOwnerList = Array.isArray(land?.available_farmer) && land.available_farmer.length > 0;
  return hasCoreFields || hasOwnerList;
}

export async function parseOwnerApiHttpResponse(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function extractOwnerCadastralSelectionPayload(rawPayload, inputQuery = "") {
  const payload = unwrapOwnerPayload(rawPayload);
  if (!payload || typeof payload !== "object") return null;
  const queryHints = extractOwnerQueryHints(inputQuery);

  const landRecords = payload?.land_records && typeof payload.land_records === "object"
    ? payload.land_records
    : null;
  const spokenText = payload?.spoken_text && typeof payload.spoken_text === "object"
    ? payload.spoken_text
    : null;
  const source = landRecords || payload;

  const districtCode = pickFirstValue(source, ["nd_code", "d_code", "districtCode", "district_code"]);
  const tehsilCode = pickFirstValue(source, ["nt_code", "t_code", "tehsilCode", "tehsil_code"]);
  const villageCode = pickFirstValue(source, ["nv_code", "v_code", "villageCode", "village_code"]);
  const murabbaNo = (
    pickFirstValue(source, ["murraba_no", "murabba_no", "muraba_no", "murabba", "muraba", "murabbaNo", "n_murr_no", "N_MURR_NO"])
    || cleanText(spokenText?.muraba_no)
    || cleanText(spokenText?.murabba_no)
    || cleanText(queryHints.murabba)
  );
  const khasraNo = (
    pickFirstValue(source, ["khasra_no", "khasraNo", "khasra", "n_khas_no", "N_KHAS_NO"])
    || cleanText(spokenText?.khasra_no)
    || cleanText(queryHints.khasra)
  );

  if (!districtCode || !tehsilCode || !villageCode) return null;

  return {
    codes: {
      district: districtCode,
      tehsil: tehsilCode,
      village: villageCode,
      murabba: murabbaNo,
      khasra: khasraNo,
    },
    names: {
      district: pickFirstValue(source, ["district", "district_name"]),
      tehsil: pickFirstValue(source, ["tehsil", "tehsil_name"]),
      village: pickFirstValue(source, ["village", "village_name"]),
      murabba: murabbaNo,
      khasra: khasraNo,
    },
  };
}

export function extractCadastralSelectionFromAnyPayload(rawPayload, inputQuery = "") {
  const ownerSelection = extractOwnerCadastralSelectionPayload(rawPayload, inputQuery);
  if (ownerSelection) return ownerSelection;

  const payload = unwrapOwnerPayload(rawPayload);
  if (!payload || typeof payload !== "object") return null;

  const codesSource = payload?.codes && typeof payload.codes === "object" ? payload.codes : payload;
  const namesSource = payload?.names && typeof payload.names === "object" ? payload.names : payload;

  const districtCode = pickFirstValue(codesSource, ["district", "d_code", "nd_code", "district_code"]);
  const tehsilCode = pickFirstValue(codesSource, ["tehsil", "t_code", "nt_code", "tehsil_code"]);
  const villageCode = pickFirstValue(codesSource, ["village", "v_code", "nv_code", "village_code"]);
  const queryHints = extractOwnerQueryHints(inputQuery);
  const murabbaNo = (
    pickFirstValue(codesSource, ["murabba", "murraba", "murabba_no", "murraba_no", "muraba", "n_murr_no", "N_MURR_NO"])
    || pickFirstValue(namesSource, ["murabba", "murraba", "murabba_no", "murraba_no", "muraba", "n_murr_no", "N_MURR_NO"])
    || cleanText(queryHints.murabba)
  );
  const khasraNo = (
    pickFirstValue(codesSource, ["khasra", "khasra_no", "n_khas_no", "N_KHAS_NO"])
    || pickFirstValue(namesSource, ["khasra", "khasra_no", "n_khas_no", "N_KHAS_NO"])
    || cleanText(queryHints.khasra)
  );

  if (!districtCode || !tehsilCode || !villageCode) return null;

  return {
    codes: {
      district: districtCode,
      tehsil: tehsilCode,
      village: villageCode,
      murabba: murabbaNo,
      khasra: khasraNo,
    },
    names: {
      district: pickFirstValue(namesSource, ["district", "district_name"]),
      tehsil: pickFirstValue(namesSource, ["tehsil", "tehsil_name"]),
      village: pickFirstValue(namesSource, ["village", "village_name"]),
      murabba: murabbaNo,
      khasra: khasraNo,
    },
  };
}

export function isLikelyOwnerDetailQuery(value) {
  const text = cleanText(value);
  const lower = text.toLowerCase();
  if (!text) return false;
  const checks = [
    "\u091c\u093f\u0932\u093e",
    "\u0924\u0939\u0938\u0940\u0932",
    "\u0917\u093e\u0902\u0935",
    "\u0917\u093e\u0901\u0935",
    "\u0917\u094d\u0930\u093e\u092e",
    "\u092e\u0941\u0930\u092c\u093e",
    "\u092e\u0941\u0930\u092c\u094d\u092c\u093e",
    "\u0916\u0938\u0930\u093e",
    "district",
    "jila",
    "zilla",
    "tehsil",
    "gaon",
    "gaav",
    "murabba",
    "muraba",
    "khasra",
  ];
  return checks.some((token) => text.includes(token) || lower.includes(token));
}

export async function requestOwnerApiResult(query) {
  const ownerApiEndpoint = getRuntimeConfigValue("VITE_OWNER_API_ENDPOINT", "/api-url/owner-search");
  const queryVariants = buildOwnerApiQueryVariants(query);

  let lastError = null;
  let lastPayload = null;

  for (const queryVariant of queryVariants) {
    const url = `${ownerApiEndpoint}?query=${encodeURIComponent(queryVariant)}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
        },
        credentials: "include",
      });

      if (response.status === 401) {
        return { ok: false, status: 401, error: "Session expired. Please login again." };
      }

      const payload = await parseOwnerApiHttpResponse(response);
      if (!response.ok) {
        lastError = payload?.error || `Owner lookup failed with status ${response.status}.`;
        continue;
      }

      if (hasOwnerApiResolvedData(payload)) {
        return { ok: true, payload };
      }
      lastPayload = payload;
    } catch (error) {
      lastError = error?.message || "Owner details request failed.";
    }
  }

  if (lastPayload && hasOwnerApiResolvedData(lastPayload)) {
    return { ok: true, payload: lastPayload };
  }

  return { ok: false, error: String(lastError || "Owner details request failed.") };
}

export async function requestCadastralHindiSearch(query) {
  const endpoint = getRuntimeConfigValue(
    "VITE_CADASTRAL_HINDI_SEARCH_ENDPOINT",
    "/api-url/cadastral-hindi-search",
  );
  const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    credentials: "include",
  });

  if (response.status === 401) {
    return { ok: false, status: 401, error: "Session expired. Please login again." };
  }

  const payload = await parseOwnerApiHttpResponse(response);
  if (!response.ok) {
    return {
      ok: false,
      error: payload?.error || `Cadastral lookup failed with status ${response.status}.`,
      payload,
    };
  }

  return { ok: true, payload };
}
