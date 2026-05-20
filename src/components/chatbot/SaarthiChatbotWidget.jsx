import { useEffect, useRef, useState } from "react";
import "./SaarthiChatbotWidget.css";

const CHATBOT_LOCALE = {
  en: {
    subtitle: "Assistant + FAQ",
    welcomeMessage: "Welcome! I am EODB Saarthi.\nAsk your question in English or Hinglish.",
    faqTitle: "FAQ Questions (Click to Ask)",
    inputPlaceholder: "Ask in English or Hinglish...",
    questions: [
      "How to search land records?",
      "What fields are required to search?",
      "Khasra number nahi pata, ab kya kare?",
      "Why am I getting no records?",
      "Spelling mismatch kaise thik kare?",
      "Too many results aa rahe hain, refine kaise kare?",
      "Filters reset/clear kaise kare?",
      "Can I search by owner name?",
      "Record details download ya print kaise kare?",
      "Login nahi ho raha, kya kare?",
      "Password bhool gaya, reset kaise kare?",
      "Session expire ho gaya, ab kya kare?",
      "Website ke liye best browser kaunsa hai?",
      "Support se contact kaise kare?",
      "Complaint ke time kaunse details share kare?",
      "Is chatbot me kya-kya puch sakte hain?",
      "Kya main English ya Hinglish me puch sakta hoon?",
      "The map is not loading. What should I do?",
      "I cannot find my village in the dropdown. Why?",
      "Owner name is incorrect. Can I dispute here?",
      "Can I download or save Khasra details?",
      "I am not receiving OTP. What should I do?",
      "Maximum parcels I can select at once?",
      "Can I switch portal language to Hindi?",
      "Is portal data legally valid for transactions?",
      "Which browsers are officially supported?",
      "What is Khasra number?",
      "What is Muraba/Murabba?",
      "District, Tehsil, Village me kya difference hai?",
      "What is Murabba and how is it different from Khasra?",
    ],
  },
  hi: {
    subtitle: "सहायक + सामान्य प्रश्न",
    welcomeMessage: "स्वागत है! मैं EODB सारथी हूँ।\nअपना सवाल हिंदी में पूछें।",
    faqTitle: "सामान्य प्रश्न (पूछने के लिए क्लिक करें)",
    inputPlaceholder: "यहाँ हिंदी में लिखें...",
    questions: [
      "भूमि रिकॉर्ड कैसे खोजें?",
      "खोज के लिए कौन-कौन से फ़ील्ड जरूरी हैं?",
      "अगर खसरा नंबर नहीं पता हो तो क्या करें?",
      "रिकॉर्ड नहीं मिल रहे, क्यों?",
      "स्पेलिंग mismatch कैसे ठीक करें?",
      "बहुत ज़्यादा results आ रहे हैं, refine कैसे करें?",
      "Filters reset/clear कैसे करें?",
      "क्या मैं owner name से search कर सकता/सकती हूँ?",
      "रिकॉर्ड details download या print कैसे करें?",
      "लॉगिन नहीं हो रहा, क्या करें?",
      "पासवर्ड भूल गया/गई, reset कैसे करें?",
      "Session expire हो गया, अब क्या करें?",
      "वेबसाइट के लिए best browser कौन सा है?",
      "Support से contact कैसे करें?",
      "Complaint के समय कौन-सी details share करें?",
      "इस chatbot में क्या-क्या पूछ सकते हैं?",
      "क्या मैं English या Hinglish में पूछ सकता/सकती हूँ?",
      "Map load नहीं हो रहा, क्या करें?",
      "Dropdown में village नहीं मिल रहा, क्यों?",
      "Owner name गलत है, क्या यहाँ dispute कर सकते हैं?",
      "क्या मैं Khasra details download या save कर सकता/सकती हूँ?",
      "OTP नहीं मिल रहा, क्या करें?",
      "एक बार में maximum कितने parcels select कर सकते हैं?",
      "क्या portal language Hindi में switch कर सकते हैं?",
      "क्या portal data transactions के लिए legally valid है?",
      "Officially supported browsers कौन-से हैं?",
      "खसरा नंबर क्या होता है?",
      "मुरब्बा क्या होता है?",
      "District, Tehsil, Village में क्या अंतर है?",
      "Murabba और Khasra में क्या फर्क है?",
    ],
  },
};

const LANGUAGE_SUPPORT_QUESTION = {
  en: "Which language types are supported for search?",
  hi: "खोज के लिए कौन-कौन सी भाषाएँ समर्थित हैं?",
};
const LANGUAGE_SUPPORT_TEXT = {
  en: "I support English, Hinglish, Hindi.",
  hi: "मैं अंग्रेज़ी, हिंग्लिश और हिंदी को सपोर्ट करता हूँ।",
};
const VOICE_SEARCH_HELP_QUESTION = {
  en: "How to use voice search?",
  hi: "वॉइस सर्च कैसे उपयोग करें?",
};
const VOICE_SEARCH_HELP_TEXT = {
  en: `Voice search steps (Top Header Search Bar):
1. Click the voice icon.
2. Speak search terms like District, Tehsil, Village.
3. Your spoken query is filled and search runs.`,
  hi: `वॉइस सर्च के चरण:
1. टॉप हेडर सर्च बार में माइक आइकन पर क्लिक करें।
2. जिला, तहसील, गांव जैसे सर्च शब्द बोलें।
3. बोला गया सर्च टेक्स्ट भर जाएगा और खोज चल जाएगी।`,
};
const PARCEL_NOT_HIGHLIGHTED_QUESTION = {
  en: "Why parcel not highlighted?",
  hi: "पार्सल हाइलाइट क्यों नहीं हो रहा?",
};
const CADASTRAL_LAYER_QUESTION = {
  en: "When does cadastral layer appear?",
  hi: "कैडस्ट्रल लेयर कब दिखाई देती है?",
};
const CADASTRAL_LAYER_ANSWER = {
  en: "Cadastral layer is shown after map zoom reaches 1:4000.",
  hi: "मैप ज़ूम 1:4000 तक पहुँचने पर कैडस्ट्रल लेयर दिखाई देती है।",
};
const OWNER_API_ENDPOINT = "https://hsac.org.in/emissions/extract_land_record";
const OWNER_SEARCH_HELP_TEXT = {
  en: `Live Owner Search enabled.
Currently supported input: Hindi only.
English/Hinglish support will be added in a future update.
Example (Hindi placeholder):
नाम राम जिला रोहतक तहसील रोहतक गांव बोहर मुरबा 00 खसरा 00`,
  hi: `लाइव ओनर सर्च सक्रिय है।
फिलहाल समर्थित इनपुट: केवल हिंदी।
English/Hinglish सपोर्ट भविष्य के अपडेट में जोड़ा जाएगा।
उदाहरण:
नाम राम जिला रोहतक तहसील रोहतक गांव बोहर मुरबा 00 खसरा 00`,
};

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createInjectedId() {
  return `saarthi-inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeText(value, fallback = "N/A") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function getByPath(source, path) {
  if (!source || typeof source !== "object") return undefined;
  const parts = String(path || "").split(".");
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    const value = key.includes(".") ? getByPath(source, key) : source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function unwrapOwnerPayload(payload) {
  let value = payload;
  for (let i = 0; i < 5; i += 1) {
    if (Array.isArray(value) && value.length > 0) {
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

function toMatchLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const normalizedLoose = normalized.replace(/_/g, " ");
  if (
    value === true
    || value === 1
    || normalized === "true"
    || normalized === "yes"
    || normalized === "y"
    || normalized === "matched"
  ) {
    return "Yes";
  }
  if (
    value === false
    || value === 0
    || normalized === "false"
    || normalized === "no"
    || normalized === "n"
    || normalized === "not matched"
    || normalizedLoose === "not matched"
  ) {
    return "No";
  }
  return safeText(value);
}

function toCount(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isHindiLocale(localeLang) {
  return String(localeLang || "").toLowerCase() === "hi";
}

function formatOwnerApiResult(rawPayload, queryHints = null, localeLang = "en") {
  const useHindi = isHindiLocale(localeLang);
  if (typeof rawPayload === "string") {
    const directText = rawPayload.trim();
    if (!directText) return useHindi ? "ओनर विवरण के लिए खाली प्रतिक्रिया मिली।" : "Owner details request returned empty response.";
    try {
      return formatOwnerApiResult(JSON.parse(directText), queryHints, localeLang);
    } catch {
      return directText;
    }
  }

  const payload = unwrapOwnerPayload(rawPayload);
  if (!payload || typeof payload !== "object") {
    return safeText(payload, useHindi ? "ओनर विवरण के लिए खाली प्रतिक्रिया मिली।" : "Owner details request returned empty response.");
  }

  const payloadKeys = Object.keys(payload);
  if (!payloadKeys.length) {
    return useHindi ? "ओनर विवरण के लिए खाली प्रतिक्रिया मिली।" : "Owner details request returned empty response.";
  }

  const landRecords = payload?.land_records && typeof payload.land_records === "object"
    ? payload.land_records
    : null;
  const spokenText = payload?.spoken_text && typeof payload.spoken_text === "object"
    ? payload.spoken_text
    : null;
  const formattedPayload = landRecords || payload;

  const hasOwnerShape = [
    "district",
    "districtName",
    "district_name",
    "tehsil",
    "tehsilName",
    "tehsil_name",
    "village",
    "villageName",
    "village_name",
    "murabba",
    "murabbaNo",
    "murabba_no",
    "khasra",
    "khasraNo",
    "khasra_no",
    "owner",
    "ownerName",
    "owner_name",
    "owners",
    "farmerName",
    "available_farmer",
  ].some((key) => (
    (formattedPayload[key] !== undefined && formattedPayload[key] !== null && String(formattedPayload[key]).trim() !== "")
    || (spokenText?.[key] !== undefined && spokenText?.[key] !== null && String(spokenText[key]).trim() !== "")
  ));

  if (!hasOwnerShape) {
    const freeText = safeText(
      formattedPayload.message ?? formattedPayload.msg ?? formattedPayload.detail ?? formattedPayload.error ?? formattedPayload.resultText ?? formattedPayload.output,
      "",
    );
    if (freeText) return freeText;
    return JSON.stringify(payload, null, 2);
  }

  const ownerPrimary = pickFirstValue(formattedPayload, [
    "owner",
    "ownerName",
    "owner_name",
    "farmerName",
    "name",
  ]);
  const owners = Array.isArray(formattedPayload?.owners) ? formattedPayload.owners.filter(Boolean) : [];
  const availableFarmers = Array.isArray(formattedPayload?.available_farmer)
    ? formattedPayload.available_farmer
      .map((item) => safeText(item?.owner_name ?? item?.ownerName, ""))
      .filter(Boolean)
    : [];
  const spokenOwnerName = safeText(spokenText?.name, "");
  const ownerName = ownerPrimary || availableFarmers[0] || spokenOwnerName || (owners.length ? owners[0] : "");
  const moreCoOwners = Math.max(
    toCount(
      pickFirstValue(formattedPayload, [
        "moreCoOwners",
        "more_co_owners",
        "coOwnersCount",
        "co_owners_count",
        "additionalCoOwners",
        "additional_co_owners",
      ]),
    ),
    availableFarmers.length > 1 ? availableFarmers.length - 1 : (owners.length > 1 ? owners.length - 1 : 0),
  );

  const lines = useHindi
    ? [
      "ओनर विवरण (तुरंत खोज)",
      `जिला: ${safeText(pickFirstValue(formattedPayload, ["district", "districtName", "district_name"]) || spokenText?.district || queryHints?.district)}`,
      `तहसील: ${safeText(pickFirstValue(formattedPayload, ["tehsil", "tehsilName", "tehsil_name"]) || spokenText?.tehsil || queryHints?.tehsil)}`,
      `गांव: ${safeText(pickFirstValue(formattedPayload, ["village", "villageName", "village_name"]) || spokenText?.village || queryHints?.village)}`,
      `मुरबा: ${safeText(pickFirstValue(formattedPayload, ["murabba", "murabbaNo", "murabba_no", "muraba", "murabaNo", "murraba_no"]) || spokenText?.muraba_no || spokenText?.murabba_no || queryHints?.murabba)}`,
      `खसरा: ${safeText(pickFirstValue(formattedPayload, ["khasra", "khasraNo", "khasra_no", "khasra_no"]) || spokenText?.khasra_no || queryHints?.khasra)}`,
      `मालिक: ${safeText(ownerName)}`,
      `भूमि मिलान: ${toMatchLabel(pickFirstValue(formattedPayload, ["landMatch", "land_match", "land_match_status"]))}`,
      `ओनर मिलान: ${toMatchLabel(pickFirstValue(formattedPayload, ["farmerMatch", "farmer_match", "farmer_match_status"]))}`,
    ]
    : [
      "Owner Details (Instant Search)",
      `District: ${safeText(pickFirstValue(formattedPayload, ["district", "districtName", "district_name"]) || spokenText?.district || queryHints?.district)}`,
      `Tehsil: ${safeText(pickFirstValue(formattedPayload, ["tehsil", "tehsilName", "tehsil_name"]) || spokenText?.tehsil || queryHints?.tehsil)}`,
      `Village: ${safeText(pickFirstValue(formattedPayload, ["village", "villageName", "village_name"]) || spokenText?.village || queryHints?.village)}`,
      `Murabba: ${safeText(pickFirstValue(formattedPayload, ["murabba", "murabbaNo", "murabba_no", "muraba", "murabaNo", "murraba_no"]) || spokenText?.muraba_no || spokenText?.murabba_no || queryHints?.murabba)}`,
      `Khasra: ${safeText(pickFirstValue(formattedPayload, ["khasra", "khasraNo", "khasra_no", "khasra_no"]) || spokenText?.khasra_no || queryHints?.khasra)}`,
      `Owner: ${safeText(ownerName)}`,
      `Land Match: ${toMatchLabel(pickFirstValue(formattedPayload, ["landMatch", "land_match", "land_match_status"]))}`,
      `Owner Match: ${toMatchLabel(pickFirstValue(formattedPayload, ["farmerMatch", "farmer_match", "farmer_match_status"]))}`,
    ];

  if (moreCoOwners > 0) {
    lines.push(useHindi ? `अतिरिक्त सह-मालिक: ${moreCoOwners}` : `More co-owners: ${moreCoOwners}`);
  }

  return lines.join("\n");
}

function extractOwnerCadastralSelectionPayload(rawPayload, queryHints = null) {
  const payload = unwrapOwnerPayload(rawPayload);
  if (!payload || typeof payload !== "object") return null;

  const landRecords = payload?.land_records && typeof payload.land_records === "object"
    ? payload.land_records
    : null;
  const spokenText = payload?.spoken_text && typeof payload.spoken_text === "object"
    ? payload.spoken_text
    : null;
  const source = landRecords || payload;

  const districtCode = safeText(
    pickFirstValue(source, ["nd_code", "d_code", "districtCode", "district_code"]),
    "",
  );
  const tehsilCode = safeText(
    pickFirstValue(source, ["nt_code", "t_code", "tehsilCode", "tehsil_code"]),
    "",
  );
  const villageCode = safeText(
    pickFirstValue(source, ["nv_code", "v_code", "villageCode", "village_code"]),
    "",
  );
  const murabbaNo = safeText(
    pickFirstValue(source, ["murraba_no", "murabba_no", "muraba_no", "murabba", "muraba", "murabbaNo"])
      || spokenText?.muraba_no
      || spokenText?.murabba_no
      || queryHints?.murabba,
    "",
  );
  const khasraNo = safeText(
    pickFirstValue(source, ["khasra_no", "khasraNo", "khasra"])
      || spokenText?.khasra_no
      || queryHints?.khasra,
    "",
  );

  if (!districtCode || !tehsilCode || !villageCode) {
    return null;
  }

  return {
    codes: {
      district: districtCode,
      tehsil: tehsilCode,
      village: villageCode,
      murabba: murabbaNo,
      khasra: khasraNo,
    },
    names: {
      district: safeText(pickFirstValue(source, ["district", "district_name"]) || spokenText?.district || queryHints?.district, ""),
      tehsil: safeText(pickFirstValue(source, ["tehsil", "tehsil_name"]) || spokenText?.tehsil || queryHints?.tehsil, ""),
      village: safeText(pickFirstValue(source, ["village", "village_name"]) || spokenText?.village || queryHints?.village, ""),
      murabba: murabbaNo,
      khasra: khasraNo,
    },
  };
}

function resolveOwnerExtractor(frameWindow) {
  const candidates = [
    frameWindow?.extractLandRecordFromSpeech,
    frameWindow?.parent?.extractLandRecordFromSpeech,
    window?.extractLandRecordFromSpeech,
  ];
  const extractor = candidates.find((candidate) => typeof candidate === "function");
  if (!extractor) {
    throw new Error("extractLandRecordFromSpeech is not available.");
  }
  return extractor;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanOwnerQueryValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasDevanagariText(value) {
  return /[\u0900-\u097F]/.test(String(value || ""));
}

function extractOwnerQueryField(sourceText, labels, allLabels) {
  const source = cleanOwnerQueryValue(sourceText);
  if (!source) return "";

  const labelPattern = labels.map(escapeRegex).join("|");
  const boundaryPattern = allLabels.map(escapeRegex).join("|");
  const regex = new RegExp(
    `(?:^|\\s)(?:${labelPattern})\\s*[:\\-]?\\s*(.+?)(?=\\s+(?:${boundaryPattern})(?:\\s*[:\\-]?\\s*|$)|$)`,
    "iu",
  );
  const match = source.match(regex);
  return cleanOwnerQueryValue(match?.[1] || "");
}

function extractOwnerQueryHints(inputQuery) {
  const source = cleanOwnerQueryValue(inputQuery);
  if (!source) return null;

  const labels = {
    name: ["name", "owner", "\u0928\u093e\u092e"],
    district: ["district", "\u091c\u093f\u0932\u093e"],
    tehsil: ["tehsil", "\u0924\u0939\u0938\u0940\u0932"],
    village: ["village", "gaon", "\u0917\u093e\u0902\u0935", "\u0917\u093e\u0901\u0935"],
    murabba: ["murabba", "muraba", "murraba", "\u092e\u0941\u0930\u092c\u093e", "\u092e\u0941\u0930\u092c\u094d\u092c\u093e"],
    khasra: ["khasra", "\u0916\u0938\u0930\u093e"],
  };
  const allLabels = Object.values(labels).flat();

  return {
    name: extractOwnerQueryField(source, labels.name, allLabels),
    district: extractOwnerQueryField(source, labels.district, allLabels),
    tehsil: extractOwnerQueryField(source, labels.tehsil, allLabels),
    village: extractOwnerQueryField(source, labels.village, allLabels),
    murabba: extractOwnerQueryField(source, labels.murabba, allLabels),
    khasra: extractOwnerQueryField(source, labels.khasra, allLabels),
  };
}

function getMissingOwnerQueryFields(queryHints = {}) {
  const required = [
    { key: "name", label: "Name" },
    { key: "district", label: "District" },
    { key: "tehsil", label: "Tehsil" },
    { key: "village", label: "Village" },
    { key: "murabba", label: "Murabba" },
    { key: "khasra", label: "Khasra" },
  ];
  return required
    .filter((field) => !cleanOwnerQueryValue(queryHints?.[field.key]))
    .map((field) => field.label);
}

function buildOwnerApiQueryVariants(inputQuery) {
  const baseQuery = cleanOwnerQueryValue(inputQuery);
  if (!baseQuery) return [];

  const fields = {
    name: ["name", "owner", "à¤¨à¤¾à¤®"],
    district: ["district", "à¤œà¤¿à¤²à¤¾"],
    tehsil: ["tehsil", "à¤¤à¤¹à¤¸à¥€à¤²"],
    village: ["village", "gaon", "à¤—à¤¾à¤‚à¤µ", "à¤—à¤¾à¤à¤µ"],
    murabba: ["murabba", "muraba", "murraba", "à¤®à¥à¤°à¤¬à¤¾", "à¤®à¥à¤°à¤¬à¥à¤¬à¤¾"],
    khasra: ["khasra", "à¤–à¤¸à¤°à¤¾"],
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
    const hindiCore = `à¤œà¤¿à¤²à¤¾ ${extracted.district} à¤¤à¤¹à¤¸à¥€à¤² ${extracted.tehsil} à¤—à¤¾à¤‚à¤µ ${extracted.village} à¤®à¥à¤°à¤¬à¤¾ ${extracted.murabba} à¤–à¤¸à¤°à¤¾ ${extracted.khasra}`;
    variants.push(englishCore);
    variants.push(hindiCore);
    if (extracted.name) {
      variants.push(`name ${extracted.name} ${englishCore}`);
      variants.push(`à¤¨à¤¾à¤® ${extracted.name} ${hindiCore}`);
    }
  }

  const deduped = [];
  const seen = new Set();
  variants.forEach((variant) => {
    const normalized = cleanOwnerQueryValue(variant);
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
  ].some((key) => cleanOwnerQueryValue(land?.[key] ?? spoken?.[key]));

  const hasOwnerList = Array.isArray(land?.available_farmer) && land.available_farmer.length > 0;

  return hasCoreFields || hasOwnerList;
}

async function parseOwnerApiHttpResponse(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestOwnerApiResult(query, frameWindow) {
  const fetchFn = frameWindow?.fetch?.bind(frameWindow) || window.fetch?.bind(window);
  if (typeof fetchFn !== "function") {
    throw new Error("Fetch API is not available.");
  }

  let lastError = null;
  let lastPayload = null;
  const queryVariants = buildOwnerApiQueryVariants(query);

  for (const queryVariant of queryVariants) {
    const attempts = [
      {
        url: OWNER_API_ENDPOINT,
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
          },
          body: JSON.stringify({ speech: queryVariant }),
        },
      },
      {
        url: OWNER_API_ENDPOINT,
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json, text/plain, */*",
          },
          body: `speech=${encodeURIComponent(queryVariant)}`,
        },
      },
      {
        url: `${OWNER_API_ENDPOINT}?query=${encodeURIComponent(queryVariant)}`,
        init: {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
          },
        },
      },
    ];

    for (const attempt of attempts) {
      try {
        const response = await fetchFn(attempt.url, attempt.init);
        if (!response.ok) {
          lastError = new Error(`Live API responded with status ${response.status}.`);
          continue;
        }
        const parsedPayload = await parseOwnerApiHttpResponse(response);
        if (hasOwnerApiResolvedData(parsedPayload)) {
          return parsedPayload;
        }
        lastPayload = parsedPayload;
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastPayload) {
    return lastPayload;
  }

  try {
    const extractor = resolveOwnerExtractor(frameWindow);
    return await Promise.resolve(extractor(query));
  } catch {
    throw new Error(safeText(lastError?.message || lastError, "Owner details request failed."));
  }
}

function resolveWebsiteFaqQuery(localeQuestions, fallbackQueries, containsTokens = []) {
  const questions = Array.isArray(localeQuestions) ? localeQuestions.filter(Boolean) : [];
  const normalizedQuestions = questions.map((question) => ({
    raw: question,
    norm: normalizeText(question),
  }));

  for (const fallback of fallbackQueries) {
    const exact = normalizedQuestions.find((entry) => entry.norm === normalizeText(fallback));
    if (exact) return exact.raw;
  }

  if (containsTokens.length) {
    const normalizedTokens = containsTokens.map((token) => normalizeText(token));
    const fuzzy = normalizedQuestions.find((entry) => (
      normalizedTokens.every((token) => entry.norm.includes(token))
    ));
    if (fuzzy) return fuzzy.raw;
  }

  return fallbackQueries[0] || "";
}

function resolveInlineLocalAnswer(query, localeLang = "en") {
  const useHindi = isHindiLocale(localeLang);
  const q = normalizeText(query);
  if (!q) return "";

  const has = (...tokens) => tokens.every((token) => q.includes(normalizeText(token)));

  const hasKhasraToken = has("khasra") || has("खसरा");
  const hasMurabbaToken = has("murabba") || has("muraba") || has("मुरब्बा") || has("मुरबा");
  const asksDifference = has("difference") || has("difference", "khasra") || has("difference", "murabba")
    || has("फर्क") || has("अंतर");
  const asksPrint = has("print") || has("प्रिंट");
  const asksDownload = has("download") || has("save") || has("डाउनलोड");
  const asksOwnerName = has("owner", "name") || has("मालिक", "नाम");
  const asksParcelHighlight = has("parcel", "highlight")
    || has("parcel", "highting")
    || has("पार्सल", "हाइलाइट");

  if (has("खोज", "फील्ड") || has("required", "field")) {
    return useHindi
      ? "खोज के लिए अनुशंसित फ़ील्ड: जिला + तहसील + गांव + (खसरा या मुरबा) + मालिक नाम।"
      : "Recommended fields: District + Tehsil + Village + (Khasra or Murabba) + Owner name.";
  }
  if (asksOwnerName) {
    return useHindi
      ? "हाँ, मालिक के नाम से खोज संभव है। बेहतर सटीकता के लिए जिला, तहसील और गांव साथ में दें।"
      : "Yes, owner-name search is supported. For better accuracy, include District, Tehsil, and Village.";
  }
  if (has("भूमि रिकॉर्ड", "कैसे") || has("search", "land", "record")) {
    return useHindi
      ? "भूमि रिकॉर्ड खोजने के लिए जिला, तहसील, गांव चुनें और खसरा/मुरबा जैसी जानकारी दर्ज करके खोज करें।"
      : "To search land records, select District, Tehsil, Village and enter details like Khasra/Murabba.";
  }
  if (asksParcelHighlight) {
    return useHindi
      ? "पार्सल हाइलाइट न होने पर दर्ज किए गए फ़ील्ड गलत हो सकते हैं। विवरण दोबारा जांचें, पेज रीफ्रेश करें या कुछ समय बाद फिर कोशिश करें।"
      : "Parcel may not highlight if entered fields are wrong. Recheck details, refresh the page, or wait for some time and try again.";
  }
  if (has("रिकॉर्ड", "नहीं", "मिल") || has("no", "record")) {
    return useHindi
      ? "रिकॉर्ड न मिलने के सामान्य कारण: गलत वर्तनी, गलत गांव/तहसील, या अधूरी जानकारी। कृपया विवरण दोबारा जाँचें।"
      : "Common reasons for no records: spelling mismatch, wrong village/tehsil, or incomplete details. Please recheck inputs.";
  }
  if (has("map", "load") || has("मैप", "नहीं", "हो")) {
    return useHindi
      ? "मैप लोड न होने पर इंटरनेट, ब्राउज़र रीफ्रेश, और ज़ूम स्तर जाँचें। समस्या रहे तो पेज दोबारा खोलें।"
      : "If map is not loading, check internet, refresh browser, and verify zoom level. Reopen page if needed.";
  }
  if (has("results", "refine") || has("ज़्यादा", "results")) {
    return useHindi
      ? "बहुत ज़्यादा परिणाम आने पर अधिक सटीक फ़ील्ड भरें: मुरबा, खसरा, मालिक नाम और सही गांव/तहसील।"
      : "If too many results appear, add more precise fields: Murabba, Khasra, owner name, and correct village/tehsil.";
  }
  if (asksPrint && asksDownload) {
    return useHindi
      ? "रिकॉर्ड प्रिंट/डाउनलोड के लिए पहले रिकॉर्ड खोलें, फिर प्रिंट या डाउनलोड/एक्सपोर्ट विकल्प का उपयोग करें।"
      : "For print/download, open the record first, then use the Print or Download/Export option.";
  }
  if (asksPrint) {
    return useHindi
      ? "रिकॉर्ड प्रिंट करने के लिए रिकॉर्ड खुला रखें और प्रिंट बटन का उपयोग करें।"
      : "To print, keep the record open and use the Print button.";
  }
  if (asksDownload) {
    return useHindi
      ? "विवरण डाउनलोड के लिए उपलब्ध डाउनलोड/एक्सपोर्ट विकल्प का उपयोग करें।"
      : "To download details, use the available Download/Export option.";
  }
  if (has("login") || has("लॉगिन")) {
    return useHindi
      ? "लॉगिन समस्या में यूज़र आईडी/पासवर्ड जाँचें, OTP सत्यापित करें और आवश्यकता हो तो पासवर्ड रीसेट करें।"
      : "For login issues, verify user ID/password, check OTP, and reset password if required.";
  }
  if (has("otp") || has("ओटीपी")) {
    return useHindi
      ? "OTP न मिलने पर नेटवर्क, मोबाइल सिग्नल और DND सेटिंग जाँचें। कुछ समय बाद फिर प्रयास करें।"
      : "If OTP is not received, check network, mobile signal, and DND settings, then retry after some time.";
  }
  if (has("password", "reset") || has("पासवर्ड")) {
    return useHindi
      ? "पासवर्ड रीसेट के लिए 'Forgot Password' विकल्प चुनें और OTP सत्यापन पूरा करें।"
      : "For password reset, use the 'Forgot Password' option and complete OTP verification.";
  }
  if (has("session", "expire") || has("सेशन")) {
    return useHindi
      ? "सेशन समाप्त होने पर दोबारा लॉगिन करें और फिर से प्रयास करें।"
      : "If session expires, log in again and retry.";
  }
  if (hasKhasraToken && hasMurabbaToken && asksDifference) {
    return useHindi
      ? "मुरब्बा बड़े क्षेत्रीय ग्रिड/खंड को दर्शाता है, जबकि खसरा उस ग्रिड के भीतर भूमि के विशिष्ट प्लॉट को दर्शाता है।"
      : "Murabba is a larger land grid/block, while Khasra is a specific plot within that grid.";
  }
  if (hasKhasraToken) {
    return useHindi
      ? "खसरा नंबर भूमि के एक विशिष्ट टुकड़े की पहचान संख्या होती है।"
      : "Khasra number is the identification number of a specific land parcel.";
  }
  if (hasMurabbaToken) {
    return useHindi
      ? "मुरब्बा बड़े क्षेत्रीय ग्रिड/खंड को दर्शाता है, जबकि खसरा उस ग्रिड के भीतर भूमि के प्लॉट को।"
      : "Murabba represents a larger land grid/block, while Khasra refers to plots inside that grid.";
  }
  if ((has("district") && has("tehsil") && has("village")) || (has("जिला") && has("तहसील") && has("गांव"))) {
    return useHindi
      ? "जिला सबसे बड़ा प्रशासनिक स्तर है, उसके अंदर तहसील होती है, और तहसील के अंदर गांव आते हैं।"
      : "District is the largest administrative level, Tehsil is within district, and Village is within tehsil.";
  }
  if (has("legal", "valid") || has("कानूनी", "वैधता")) {
    return useHindi
      ? "पोर्टल जानकारी संदर्भ के लिए है। कानूनी/लेन-देन के लिए संबंधित विभाग के प्रमाणित रिकॉर्ड को प्राथमिकता दें।"
      : "Portal data is for reference. For legal/transactional use, prefer certified department records.";
  }
  if (has("language") || has("भाषा")) {
    return useHindi
      ? "यह सहायक हिंदी, अंग्रेज़ी और हिंग्लिश समझ सकता है।"
      : "This assistant supports Hindi, English, and Hinglish.";
  }
  if (has("voice") || has("वॉइस")) {
    return useHindi
      ? "टॉप हेडर सर्च बार में माइक पर क्लिक करें और जिला, तहसील, गांव जैसे शब्द बोलकर खोज चलाएँ।"
      : "Use the top header search voice icon, then speak terms like District, Tehsil, Village to run search.";
  }
  if (has("cadastral") || has("कैडस्ट्रल")) {
    return useHindi
      ? "कैडस्ट्रल लेयर आमतौर पर 1:4000 ज़ूम स्तर के आसपास दिखाई देती है।"
      : "Cadastral layer usually appears around 1:4000 zoom level.";
  }

  return useHindi
    ? "मैं आपकी मदद भूमि खोज, खसरा/मुरबा जानकारी, मैप सहायता, और लॉगिन/OTP से जुड़े सवालों में कर सकता हूँ।"
    : "I can help with land search, Khasra/Murabba info, map help, and login/OTP-related questions.";
}

function makeMenuConfig(localeQuestions, localeLang = "en") {
  const useHindi = isHindiLocale(localeLang);
  const faqQuestions = Array.isArray(localeQuestions) ? localeQuestions.slice(0, 6) : [];
  const faqOptions = faqQuestions.map((question, index) => ({
    label: `${index + 1} ${question}`,
    action: "ask",
    query: question,
  }));

  const pickLocalizedQuery = (hindiFallback, englishFallback, containsTokens = []) => (
    resolveWebsiteFaqQuery(
      localeQuestions,
      useHindi ? [hindiFallback, englishFallback] : [englishFallback, hindiFallback],
      containsTokens,
    )
  );

  const mappedQueries = {
    requiredFields: pickLocalizedQuery("खोज के लिए कौन-कौन से फ़ील्ड जरूरी हैं?", "What fields are required to search?", ["required", "search", "फील्ड", "खोज"]),
    ownerName: pickLocalizedQuery("क्या मैं owner name से search कर सकता/सकती हूँ?", "Can I search by owner name?", ["owner", "search", "मालिक", "नाम"]),
    searchLandRecords: pickLocalizedQuery("भूमि रिकॉर्ड कैसे खोजें?", "How to search land records?", ["search", "land", "record", "भूमि", "रिकॉर्ड"]),
    noRecords: pickLocalizedQuery("रिकॉर्ड नहीं मिल रहे, क्यों?", "Why am I getting no records?", ["no", "record", "रिकॉर्ड"]),
    mapNotLoading: pickLocalizedQuery("Map load नहीं हो रहा, क्या करें?", "The map is not loading. What should I do?", ["map", "loading", "मैप"]),
    refineResults: pickLocalizedQuery("बहुत ज़्यादा results आ रहे हैं, refine कैसे करें?", "Too many results aa rahe hain, refine kaise kare?", ["too", "many", "result", "results", "refine"]),
    printRecord: pickLocalizedQuery("रिकॉर्ड details download या print कैसे करें?", "Record details download ya print kaise kare?", ["print", "record", "डाउनलोड"]),
    downloadDetails: pickLocalizedQuery("क्या मैं Khasra details download या save कर सकता/सकती हूँ?", "Can I download or save Khasra details?", ["download", "khasra", "save", "डाउनलोड"]),
    loginIssue: pickLocalizedQuery("लॉगिन नहीं हो रहा, क्या करें?", "Login nahi ho raha, kya kare?", ["login", "लॉगिन"]),
    otpIssue: pickLocalizedQuery("OTP नहीं मिल रहा, क्या करें?", "I am not receiving OTP. What should I do?", ["otp", "ओटीपी"]),
    passwordReset: pickLocalizedQuery("पासवर्ड भूल गया/गई, reset कैसे करें?", "Password bhool gaya, reset kaise kare?", ["password", "reset", "पासवर्ड"]),
    sessionExpired: pickLocalizedQuery("Session expire हो गया, अब क्या करें?", "Session expire ho gaya, ab kya kare?", ["session", "expire", "सेशन"]),
    khasraMeaning: pickLocalizedQuery("खसरा नंबर क्या होता है?", "What is Khasra number?", ["khasra", "खसरा"]),
    murabbaMeaning: pickLocalizedQuery("मुरब्बा क्या होता है?", "What is Muraba/Murabba?", ["murabba", "muraba", "मुरब्बा", "मुरबा"]),
    districtTehsilVillage: pickLocalizedQuery("District, Tehsil, Village में क्या अंतर है?", "District, Tehsil, Village me kya difference hai?", ["district", "tehsil", "village", "जिला", "तहसील", "गांव"]),
    legalValidity: pickLocalizedQuery("क्या portal data transactions के लिए legally valid है?", "Is portal data legally valid for transactions?", ["legal", "valid", "कानूनी"]),
  };

  return {
    main: {
      title: useHindi ? "मुख्य मेनू" : "Main Menu",
      options: [
        { label: useHindi ? "1 भूमि रिकॉर्ड खोज" : "1 Search Land Record", action: "menu", target: "search-land-record" },
        { label: useHindi ? "2 मैप और पार्सल सहायता" : "2 Map & Parcel Help", action: "menu", target: "map-parcel-help" },
        { label: useHindi ? "3 प्रिंट / डाउनलोड सहायता" : "3 Print / Download Help", action: "menu", target: "print-download-help" },
        { label: useHindi ? "4 लॉगिन / OTP / पासवर्ड सहायता" : "4 Login / OTP / Password Help", action: "menu", target: "login-otp-password-help" },
        { label: useHindi ? "5 पोर्टल शब्दावली" : "5 Portal Terms", action: "menu", target: "portal-terms" },
        { label: useHindi ? "6 सामान्य प्रश्न" : "6 FAQ", action: "menu", target: "faq" },
      ],
    },
    "search-land-record": {
      title: useHindi ? "भूमि रिकॉर्ड खोज" : "Search Land Record",
      options: [
        { label: useHindi ? "1 ओनर विवरण (तुरंत खोज)" : "1 Owner details (Instant Search)", action: "owner-api", query: mappedQueries.ownerName },
        { label: useHindi ? "2 जिला/तहसील/गांव/खसरा से खोज" : "2 Search by District/Tehsil/Village/Khasra", action: "ask", query: mappedQueries.requiredFields },
        { label: useHindi ? "3 मालिक के नाम से खोज" : "3 Search by Owner Name", action: "ask", query: mappedQueries.ownerName },
        { label: useHindi ? "4 वॉइस सर्च सहायता" : "4 Voice Search Help", action: "voice-help", query: VOICE_SEARCH_HELP_QUESTION[localeLang] || VOICE_SEARCH_HELP_QUESTION.en },
        { label: useHindi ? "5 कौन-कौन सी भाषाएँ समर्थित हैं?" : "5 What languages are supported?", action: "language-help", query: LANGUAGE_SUPPORT_QUESTION[localeLang] || LANGUAGE_SUPPORT_QUESTION.en },
        { label: useHindi ? "9 मुख्य मेनू पर वापस जाएँ" : "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "map-parcel-help": {
      title: useHindi ? "मैप और पार्सल सहायता" : "Map & Parcel Help",
      options: [
        { label: useHindi ? "1 मैप पर पार्सल कैसे चुनें" : "1 How to select parcel on map", action: "ask", query: mappedQueries.searchLandRecords },
        { label: useHindi ? "2 पार्सल हाइलाइट क्यों नहीं हो रहा" : "2 Why parcel not highlighted", action: "ask", query: PARCEL_NOT_HIGHLIGHTED_QUESTION[localeLang] || PARCEL_NOT_HIGHLIGHTED_QUESTION.en },
        { label: useHindi ? "3 मैप ज़ूम / लेयर सहायता" : "3 Map zoom / layer help", action: "ask", query: mappedQueries.mapNotLoading },
        { label: useHindi ? "4 Service linked का मतलब" : "4 Service linked meaning", action: "ask", query: mappedQueries.refineResults },
        { label: useHindi ? "5 कैडस्ट्रल लेयर कब दिखती है?" : "5 When does cadastral layer appear?", action: "cadastral-help", query: CADASTRAL_LAYER_QUESTION[localeLang] || CADASTRAL_LAYER_QUESTION.en },
        { label: useHindi ? "9 मुख्य मेनू पर वापस जाएँ" : "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "print-download-help": {
      title: useHindi ? "प्रिंट / डाउनलोड सहायता" : "Print / Download Help",
      options: [
        { label: useHindi ? "1 वर्तमान रिकॉर्ड प्रिंट करें" : "1 Print current record", action: "ask", query: mappedQueries.printRecord },
        { label: useHindi ? "2 विवरण डाउनलोड करें" : "2 Download details", action: "ask", query: mappedQueries.downloadDetails },
        { label: useHindi ? "9 मुख्य मेनू पर वापस जाएँ" : "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "login-otp-password-help": {
      title: useHindi ? "लॉगिन / OTP / पासवर्ड सहायता" : "Login / OTP / Password Help",
      options: [
        { label: useHindi ? "1 लॉगिन समस्या" : "1 Login issue", action: "ask", query: mappedQueries.loginIssue },
        { label: useHindi ? "2 OTP प्राप्त नहीं हुआ" : "2 OTP not received", action: "ask", query: mappedQueries.otpIssue },
        { label: useHindi ? "3 पासवर्ड रीसेट" : "3 Password reset", action: "ask", query: mappedQueries.passwordReset },
        { label: useHindi ? "4 सेशन समाप्त" : "4 Session expired", action: "ask", query: mappedQueries.sessionExpired },
        { label: useHindi ? "9 मुख्य मेनू पर वापस जाएँ" : "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    "portal-terms": {
      title: useHindi ? "पोर्टल शब्दावली" : "Portal Terms",
      options: [
        { label: useHindi ? "1 खसरा क्या है" : "1 What is Khasra", action: "ask", query: mappedQueries.khasraMeaning },
        { label: useHindi ? "2 मुरब्बा क्या है" : "2 What is Murabba", action: "ask", query: mappedQueries.murabbaMeaning },
        { label: useHindi ? "3 जिला/तहसील/गांव में अंतर" : "3 District/Tehsil/Village difference", action: "ask", query: mappedQueries.districtTehsilVillage },
        { label: useHindi ? "4 पोर्टल की कानूनी वैधता" : "4 Portal legal validity note", action: "ask", query: mappedQueries.legalValidity },
        { label: useHindi ? "9 मुख्य मेनू पर वापस जाएँ" : "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
    faq: {
      title: useHindi ? "सामान्य प्रश्न" : "FAQ",
      options: [
        ...faqOptions,
        { label: useHindi ? "9 मुख्य मेनू पर वापस जाएँ" : "9 Back to Main Menu", action: "menu", target: "main" },
      ],
    },
  };
}

function clearInlineTypingTimers(session) {
  const timerMap = session?.inlineTypingTimers;
  if (!(timerMap instanceof Map)) return;
  timerMap.forEach((timerId) => window.clearInterval(timerId));
  timerMap.clear();
}

function startInlineBotTyping(frameDoc, bubble, message, session) {
  if (!bubble || !message || message.sender !== "bot") return;

  const fullText = String(message.text || "");
  if (!fullText) {
    message.typed = true;
    message.typingIndex = 0;
    return;
  }

  if (message.typed) {
    bubble.textContent = fullText;
    return;
  }

  if (!(session.inlineTypingTimers instanceof Map)) {
    session.inlineTypingTimers = new Map();
  }

  const timerMap = session.inlineTypingTimers;
  if (timerMap.has(message.id)) {
    window.clearInterval(timerMap.get(message.id));
    timerMap.delete(message.id);
  }

  const safeStart = Number.isFinite(message.typingIndex)
    ? Math.max(0, Math.min(fullText.length, message.typingIndex))
    : 0;
  let cursor = safeStart;
  bubble.textContent = fullText.slice(0, cursor);

  if (cursor >= fullText.length) {
    message.typed = true;
    message.typingIndex = fullText.length;
    return;
  }

  const stepSize = fullText.length > 280 ? 4 : fullText.length > 150 ? 3 : fullText.length > 80 ? 2 : 1;
  const intervalMs = 16;
  const timerId = window.setInterval(() => {
    cursor = Math.min(fullText.length, cursor + stepSize);
    message.typingIndex = cursor;
    bubble.textContent = fullText.slice(0, cursor);
    scrollChatToBottom(frameDoc);

    if (cursor >= fullText.length) {
      window.clearInterval(timerId);
      timerMap.delete(message.id);
      message.typed = true;
      message.typingIndex = fullText.length;
    }
  }, intervalMs);

  timerMap.set(message.id, timerId);
}

function createMessageRow(frameDoc, message, iconUrl, session) {
  const row = frameDoc.createElement("div");
  row.className = `message-row ${message.sender === "user" ? "user-row" : "bot-row"} saarthi-menu-qa-row`;
  row.dataset.saarthiSource = "inline-menu";
  row.dataset.inlineMessageId = message.id;

  if (message.sender === "bot") {
    const botAvatar = frameDoc.createElement("div");
    botAvatar.className = "avatar bot-avatar-img";
    const img = frameDoc.createElement("img");
    img.src = iconUrl;
    img.alt = "EODB Saarthi";
    botAvatar.appendChild(img);
    row.appendChild(botAvatar);
  }

  const messageGroup = frameDoc.createElement("div");
  messageGroup.className = "message-group";

  const bubble = frameDoc.createElement("div");
  bubble.className = `message-bubble ${message.sender}`;
  if (message.sender === "bot") {
    const fullText = String(message.text || "");
    const partial = Number.isFinite(message.typingIndex)
      ? fullText.slice(0, Math.max(0, Math.min(fullText.length, message.typingIndex)))
      : "";
    bubble.textContent = message.typed ? fullText : partial;
  } else {
    bubble.textContent = message.text;
  }
  messageGroup.appendChild(bubble);

  if (message.sender === "bot" && message?.action?.kind === "open-cadastral") {
    const actionButton = frameDoc.createElement("button");
    actionButton.type = "button";
    actionButton.className = "saarthi-inline-owner-action";
    actionButton.dataset.inlineMessageId = message.id;
    actionButton.textContent = message.action.label || "Show on Cadastral Map";
    messageGroup.appendChild(actionButton);
  }

  const time = frameDoc.createElement("div");
  time.className = `message-time ${message.sender === "user" ? "user-time" : "bot-time"}`;
  time.textContent = message.time || getCurrentTimeLabel();
  messageGroup.appendChild(time);

  row.appendChild(messageGroup);

  if (message.sender === "user") {
    const userAvatar = frameDoc.createElement("div");
    userAvatar.className = "avatar user-avatar";
    userAvatar.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 12.25a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm0 1.5c-4.56 0-8.25 2.74-8.25 6.12 0 .76.62 1.38 1.38 1.38h13.74c.76 0 1.38-.62 1.38-1.38 0-3.38-3.69-6.12-8.25-6.12Z"/>
      </svg>
    `;
    row.appendChild(userAvatar);
  }

  if (message.sender === "bot") {
    startInlineBotTyping(frameDoc, bubble, message, session);
  }

  return row;
}

function renderInjectedMessages(frameDoc, session, iconUrl) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;

  clearInlineTypingTimers(session);
  chatContainer.querySelectorAll(".saarthi-menu-qa-row").forEach((node) => node.remove());

  if (!Array.isArray(session.injectedMessages) || !session.injectedMessages.length) {
    return;
  }

  const typingRow = chatContainer.querySelector(".typing-bubble")?.closest(".message-row");
  session.injectedMessages.forEach((message) => {
    const row = createMessageRow(frameDoc, message, iconUrl, session);
    if (typingRow && typingRow.parentElement === chatContainer) {
      chatContainer.insertBefore(row, typingRow);
    } else {
      chatContainer.appendChild(row);
    }
  });
}

function scrollChatToBottom(frameDoc) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function pushInlineMessage(session, sender, text) {
  if (!session.injectedMessages) session.injectedMessages = [];
  session.injectedMessages.push({
    id: createInjectedId(),
    sender,
    text,
    time: getCurrentTimeLabel(),
    typed: sender === "user",
    typingIndex: sender === "user" ? String(text || "").length : 0,
  });
}

function upsertOwnerStatus(frameDoc, session, localeLang = "en") {
  const useHindi = isHindiLocale(localeLang);
  const menuRoot = frameDoc.querySelector(".saarthi-inline-menu");
  if (!menuRoot) return;

  let statusNode = menuRoot.querySelector(".saarthi-inline-status");
  if (!session.ownerApiMode) {
    statusNode?.remove();
    return;
  }

  if (!statusNode) {
    statusNode = frameDoc.createElement("div");
    statusNode.className = "saarthi-inline-status";
    menuRoot.appendChild(statusNode);
  }

  statusNode.textContent = session.ownerApiBusy
    ? (useHindi ? "लाइव ओनर सर्च मोड सक्रिय है (प्रोसेसिंग...)." : "Live Owner Search mode is active (processing...).")
    : (useHindi ? "लाइव ओनर सर्च मोड सक्रिय है।" : "Live Owner Search mode is active.");
}

function renderInlineMenu(frameDoc, session, localeQuestions, localeLang = "en") {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;

  const menuConfig = makeMenuConfig(localeQuestions, localeLang);
  const activeMenu = menuConfig[session.menuState] || menuConfig.main;

  let menuNode = frameDoc.querySelector(".saarthi-inline-menu");
  if (!menuNode) {
    menuNode = frameDoc.createElement("section");
    menuNode.className = "saarthi-inline-menu";
  }

  const existingHeader = menuNode.querySelector(".saarthi-inline-menu__title");
  if (existingHeader) {
    existingHeader.textContent = activeMenu.title;
  } else {
    const titleNode = frameDoc.createElement("div");
    titleNode.className = "saarthi-inline-menu__title";
    titleNode.textContent = activeMenu.title;
    menuNode.appendChild(titleNode);
  }

  let optionsNode = menuNode.querySelector(".saarthi-inline-menu__options");
  if (!optionsNode) {
    optionsNode = frameDoc.createElement("div");
    optionsNode.className = "saarthi-inline-menu__options";
    menuNode.appendChild(optionsNode);
  }

  optionsNode.innerHTML = "";
  activeMenu.options.forEach((option) => {
    const button = frameDoc.createElement("button");
    button.type = "button";
    button.className = "saarthi-inline-menu__option";
    button.textContent = option.label;
    button.dataset.action = option.action || "";
    button.dataset.target = option.target || "";
    button.dataset.query = option.query || "";
    optionsNode.appendChild(button);
  });

  const firstMessageNode = chatContainer.querySelector(".message-row");
  if (firstMessageNode) {
    chatContainer.insertBefore(menuNode, firstMessageNode);
  } else if (chatContainer.firstChild !== menuNode) {
    chatContainer.insertBefore(menuNode, chatContainer.firstChild);
  }

  upsertOwnerStatus(frameDoc, session, localeLang);
}

function ensureJumpToMenuButton(frameDoc, session, localeLang = "en") {
  const useHindi = isHindiLocale(localeLang);
  const chatBox = frameDoc.querySelector(".chat-box");
  const chatContainer = frameDoc.querySelector(".chat-container");
  const menuNode = frameDoc.querySelector(".saarthi-inline-menu");
  if (!(chatBox && chatContainer && menuNode)) return;

  let jumpButton = frameDoc.querySelector(".saarthi-inline-menu__jump");
  if (!jumpButton) {
    jumpButton = frameDoc.createElement("button");
    jumpButton.type = "button";
    jumpButton.className = "saarthi-inline-menu__jump";
    jumpButton.textContent = useHindi ? "मेनू पर जाएँ" : "Jump to Menu";
    chatBox.appendChild(jumpButton);
  } else if (jumpButton.parentElement !== chatBox) {
    chatBox.appendChild(jumpButton);
  } else {
    jumpButton.textContent = useHindi ? "मेनू पर जाएँ" : "Jump to Menu";
  }

  jumpButton.onclick = () => {
    menuNode.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateVisibility = () => {
    const inputAreaNode = frameDoc.querySelector(".input-area");
    const inputHeight = Math.ceil(inputAreaNode?.getBoundingClientRect?.().height || 62);
    const shouldShow = chatContainer.scrollTop > 120;
    const bottomOffset = Math.max(6, inputHeight + 6);

    jumpButton.style.setProperty("bottom", `${bottomOffset}px`, "important");
    jumpButton.style.display = shouldShow ? "inline-flex" : "none";

    if (shouldShow) {
      chatContainer.style.setProperty("padding-bottom", "52px", "important");
    } else {
      chatContainer.style.setProperty("padding-bottom", "8px", "important");
    }
  };

  if (session.jumpContainer !== chatContainer) {
    if (session.jumpContainer && session.onJumpScroll) {
      session.jumpContainer.removeEventListener("scroll", session.onJumpScroll);
    }
    session.jumpContainer = chatContainer;
    session.onJumpScroll = updateVisibility;
    chatContainer.addEventListener("scroll", updateVisibility, { passive: true });
  }

  updateVisibility();
}

function buildInlineRenderKey(lang, session) {
  const injectedMessages = Array.isArray(session?.injectedMessages) ? session.injectedMessages : [];
  const messageSignature = injectedMessages
    .map((message) => `${message.id}:${message.sender}:${message.text}:${message?.action?.kind || ""}:${message?.action?.label || ""}`)
    .join("|");
  return [
    lang,
    session?.menuState || "main",
    session?.ownerApiMode ? "1" : "0",
    session?.ownerApiBusy ? "1" : "0",
    messageSignature,
  ].join("::");
}

function resetInlineMenuSession(frameDoc, session, localeQuestions, iconUrl, localeLang = "en") {
  session.ownerApiMode = false;
  session.ownerApiBusy = false;
  session.menuState = "main";
  session.injectedMessages = [];
  clearInlineTypingTimers(session);
  session.pendingCadastralStatusMessageId = null;
  session.bypassOwnerModeOnce = false;
  session.askLockKey = "";
  session.askLockUntil = 0;
  session.lastInlineRenderKey = "";
  if (session.pendingAskTimer) {
    clearTimeout(session.pendingAskTimer);
    session.pendingAskTimer = null;
  }
  if (session.clearResetTimer) {
    clearTimeout(session.clearResetTimer);
    session.clearResetTimer = null;
  }

  frameDoc.querySelector(".saarthi-inline-status")?.remove();
  frameDoc.querySelectorAll(".saarthi-menu-qa-row").forEach((row) => row.remove());

  renderInlineMenu(frameDoc, session, localeQuestions, localeLang);
  renderInjectedMessages(frameDoc, session, iconUrl);
  ensureJumpToMenuButton(frameDoc, session, localeLang);
}

function clearChatHistoryRows(frameDoc) {
  const chatContainer = frameDoc.querySelector(".chat-container");
  if (!chatContainer) return;
  const rows = Array.from(chatContainer.querySelectorAll(".message-row"));
  if (!rows.length) return;

  const isWelcomeRow = (row) => {
    const text = normalizeText(row.querySelector(".message-bubble")?.textContent || "");
    return (
      (text.includes("welcome") && text.includes("eodb saarthi"))
      || (text.includes("saarthi") && text.includes("ask your question"))
    );
  };

  const keepRow = rows.find((row) => isWelcomeRow(row)) || rows[0];
  rows.forEach((row) => {
    if (row !== keepRow) {
      row.remove();
    }
  });
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function readToken(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function buildBridgeStyles({
  surface,
  surfaceStrong,
  bgSecondary,
  ink,
  inkSoft,
  border,
  shadowSoft,
  green,
  mint,
}) {
  const gradient = `linear-gradient(135deg, ${green}, ${mint})`;

  return `
html, body, #root {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}
body {
  overflow: hidden;
}
.app {
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}
.header-actions .icon-btn:nth-of-type(2) {
  display: none !important;
}
.app, .app.dark {
  --bg-main: ${surface} !important;
  --bg-secondary: ${bgSecondary} !important;
  --text-main: ${ink} !important;
  --text-soft: ${inkSoft} !important;
  --border: ${border} !important;
  --shadow: ${shadowSoft} !important;
  --user-gradient: ${gradient} !important;
  --bot-bg: ${surfaceStrong} !important;
  --input-bg: ${surface} !important;
  --header-gradient: ${gradient} !important;
}
.floating-wrapper {
  right: 14px !important;
  bottom: 8px !important;
  gap: 6px !important;
  background: transparent !important;
  background-color: transparent !important;
}
.app.dark .floating-wrapper {
  background: transparent !important;
  background-color: transparent !important;
}
.notify-dot {
  background: #17b26a !important;
  border: 1px solid rgba(15, 23, 42, 0.18) !important;
  box-shadow: none !important;
}
.helper-bubble {
  display: none !important;
}
.saarthi-inline-owner-action {
  margin-top: 8px !important;
  border: 1px solid rgba(47, 141, 93, 0.32) !important;
  border-radius: 10px !important;
  background: rgba(47, 141, 93, 0.1) !important;
  color: ${green} !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  padding: 8px 10px !important;
  cursor: pointer !important;
}
.saarthi-inline-owner-action:hover {
  background: rgba(47, 141, 93, 0.16) !important;
}
.saarthi-inline-owner-action:disabled {
  opacity: 0.65 !important;
  cursor: not-allowed !important;
}
.input-area button[type='submit'] {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  border-radius: 50% !important;
  padding: 0 !important;
  background: ${gradient} !important;
  color: #ffffff !important;
  border: none !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
}
.input-area .saarthi-owner-mic-btn {
  position: relative !important;
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  border: none !important;
  border-radius: 50% !important;
  background: ${gradient} !important;
  color: #ffffff !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-right: 8px !important;
  padding: 0 !important;
  cursor: pointer !important;
  box-shadow: none !important;
  transition: transform 160ms ease, opacity 160ms ease !important;
}
.input-area .saarthi-owner-mic-btn svg {
  width: 16px !important;
  height: 16px !important;
  fill: currentColor !important;
}
.input-area .saarthi-owner-mic-btn .mic-slash {
  display: none !important;
}
.input-area .saarthi-owner-mic-btn.is-listening .mic-slash {
  display: block !important;
}
.input-area .saarthi-owner-mic-btn:hover {
  opacity: 0.92 !important;
}
.input-area .saarthi-owner-mic-btn.is-listening {
  background: ${gradient} !important;
  color: #ffffff !important;
  box-shadow: 0 0 0 2px rgba(47, 141, 93, 0.22) !important;
}
.input-area .saarthi-owner-mic-btn.is-listening::before {
  content: "" !important;
  position: absolute !important;
  inset: -8px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(47, 141, 93, 0.36) !important;
  pointer-events: none !important;
  animation: saarthiOwnerMicWave 1.35s ease-out infinite !important;
}
.input-area .saarthi-owner-mic-btn.is-listening::after {
  content: "" !important;
  position: absolute !important;
  inset: -4px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(167, 243, 208, 0.86) !important;
  pointer-events: none !important;
  animation: saarthiOwnerMicPulse 1.35s ease-in-out infinite !important;
}
.input-area .saarthi-owner-mic-btn:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
}
.app.dark .helper-bubble {
  display: none !important;
}
.floating-btn {
  width: 52px !important;
  height: 52px !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 50% !important;
  background: transparent !important;
  background-color: transparent !important;
  color: ${green} !important;
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: visible !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.app.dark .floating-btn {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.floating-btn > svg,
.floating-btn > i {
  display: none !important;
}
.floating-btn::before {
  content: "" !important;
  position: absolute !important;
  inset: -6px !important;
  border-radius: 50% !important;
  border: 3px solid currentColor !important;
  background: transparent !important;
  opacity: 0.64 !important;
  animation: saarthiPulse 1.95s ease-out infinite !important;
  pointer-events: none !important;
}
.floating-btn::after {
  content: "" !important;
  position: absolute !important;
  inset: -2px !important;
  border-radius: 50% !important;
  border: 2px solid currentColor !important;
  background: transparent !important;
  opacity: 0.42 !important;
  box-shadow: 0 0 0 2px rgba(47, 141, 93, 0.16) !important;
  pointer-events: none !important;
}
.floating-btn:hover,
.floating-btn:focus-visible {
  transform: none !important;
  box-shadow: none !important;
}
.ping-ring {
  display: none !important;
}
.floating-bot-img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  background: transparent !important;
}
.app.dark .floating-bot-img {
  background: transparent !important;
}
.floating-bot-img img,
.bot-logo-img img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  object-fit: contain !important;
  object-position: center center !important;
  transform: scale(0.98) !important;
  transform-origin: center center !important;
  background: transparent !important;
  display: block !important;
}
.chat-box {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  max-height: none !important;
  margin: 0 !important;
  border-radius: 14px !important;
}
.chat-container {
  padding: 8px !important;
}
.saarthi-inline-menu {
  margin: 2px 0 10px !important;
  padding: 8px !important;
  border: 1px solid rgba(21, 128, 61, 0.24) !important;
  border-radius: 12px !important;
  background: rgba(240, 253, 244, 0.88) !important;
  pointer-events: auto !important;
}
.app.dark .saarthi-inline-menu {
  background: rgba(15, 23, 42, 0.72) !important;
  border-color: rgba(167, 243, 208, 0.28) !important;
}
.saarthi-inline-menu__title {
  font-size: 12px !important;
  font-weight: 800 !important;
  color: var(--text-main) !important;
  margin-bottom: 6px !important;
}
.saarthi-inline-menu__options {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  pointer-events: auto !important;
}
.saarthi-inline-menu__option {
  border: 1px solid rgba(21, 128, 61, 0.24) !important;
  background: #ffffff !important;
  color: #14532d !important;
  border-radius: 10px !important;
  padding: 7px 9px !important;
  text-align: left !important;
  font-size: 11.5px !important;
  line-height: 1.35 !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  touch-action: manipulation !important;
  -webkit-tap-highlight-color: transparent !important;
}
.app.dark .saarthi-inline-menu__option {
  background: rgba(15, 23, 42, 0.82) !important;
  color: #dcfce7 !important;
}
.saarthi-inline-menu__option:hover {
  transform: translateY(-1px) !important;
}
.saarthi-inline-status {
  margin-top: 7px !important;
  border-left: 3px solid #15803d !important;
  padding: 5px 7px !important;
  background: rgba(22, 101, 52, 0.08) !important;
  border-radius: 6px !important;
  font-size: 11px !important;
  color: var(--text-main) !important;
}
.saarthi-inline-menu__jump {
  position: absolute !important;
  right: 84px !important;
  bottom: 78px !important;
  z-index: 4 !important;
  border: none !important;
  border-radius: 999px !important;
  padding: 7px 10px !important;
  font-size: 10.5px !important;
  line-height: 1.2 !important;
  font-weight: 800 !important;
  display: none;
  align-items: center !important;
  color: #fff !important;
  background: linear-gradient(135deg, #166534, #0f766e) !important;
  box-shadow: 0 8px 18px rgba(20, 184, 166, 0.24) !important;
  cursor: pointer !important;
  max-width: 120px !important;
  transform: translateY(2px) !important;
}
.message-bubble {
  font-size: 11.5px !important;
}
.user-avatar {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.user-avatar svg {
  width: 14px !important;
  height: 14px !important;
  fill: #ffffff !important;
}
.header-text p {
  display: block !important;
  opacity: 1 !important;
}
.faq-suggestions-panel {
  display: none !important;
}
.faq-suggestions-list {
  max-height: 68px !important;
}
@keyframes saarthiPulse {
  0% {
    transform: scale(0.92);
    opacity: 0.66;
  }
  70% {
    transform: scale(1.27);
    opacity: 0;
  }
  100% {
    transform: scale(1.27);
    opacity: 0;
  }
}
@keyframes saarthiOwnerMicPulse {
  0% {
    transform: scale(0.92);
    opacity: 0.82;
  }
  60% {
    transform: scale(1.06);
    opacity: 0.26;
  }
  100% {
    transform: scale(1.12);
    opacity: 0;
  }
}
@keyframes saarthiOwnerMicWave {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.28);
    opacity: 0;
  }
}
@media (max-width: 640px) {
  .floating-btn {
    width: 46px !important;
    height: 46px !important;
  }
  .chat-box {
    border-radius: 11px !important;
  }
}
`;
}

export default function SaarthiChatbotWidget({ lang = "en", blurred = false, hidden = false }) {
  const iframeRef = useRef(null);
  const observerRef = useRef(null);
  const layoutObserverRef = useRef(null);
  const hostLayoutObserverRef = useRef(null);
  const syncSchedulerRef = useRef({
    pending: false,
    timer: null,
    destroyed: false,
    lastRunAt: 0,
  });
  const menuSessionRef = useRef({
    menuState: "main",
    ownerApiMode: false,
    ownerApiBusy: false,
    injectedMessages: [],
    bypassOwnerModeOnce: false,
    jumpContainer: null,
    onJumpScroll: null,
    boundDoc: null,
    docCleanup: null,
    lastInlineRenderKey: "",
    pendingAskTimer: null,
    clearResetTimer: null,
    askLockKey: "",
    askLockUntil: 0,
    lastMenuDispatchKey: "",
    lastMenuDispatchAt: 0,
    menuActionHandler: null,
    inlineTypingTimers: new Map(),
    pendingCadastralStatusMessageId: null,
    speechRecognition: null,
    speechListening: false,
    speechAutoSubmitTimer: null,
    micPermissionState: "unknown",
    lastVoicePermissionNotice: "",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(28);
  const chatbotCssPath = `${import.meta.env.BASE_URL}chatbot/assets/index-CleebXl6.css`;
  const chatbotJsPath = `${import.meta.env.BASE_URL}chatbot/assets/index-h95SWGsY.js`;
  const chatbotIconPath = `${import.meta.env.BASE_URL}chatbot/assets/eodb-saarthi-_EV4f2aO.png`;
  const activeLocale = CHATBOT_LOCALE[lang] || CHATBOT_LOCALE.en;

  const closeBottomPanelIfOpen = () => {
    const tableOpen = Boolean(document.querySelector(".map-stage__viewport--table-open"));
    if (!tableOpen) return false;
    const toggleButton = document.querySelector(".parcel-table-toggle");
    if (toggleButton && typeof toggleButton.click === "function") {
      toggleButton.click();
      return true;
    }
    return false;
  };

  const openChatFromHost = () => {
    const panelWasOpen = closeBottomPanelIfOpen();
    const frameDoc = iframeRef.current?.contentDocument;
    const floatingButton = frameDoc?.querySelector(".floating-btn");
    if (!(floatingButton && typeof floatingButton.click === "function")) return;

    const clearInlineInput = () => {
      const inputNode = frameDoc?.querySelector(".input-area input");
      if (!inputNode) return;
      inputNode.value = "";
      inputNode.dispatchEvent(new Event("input", { bubbles: true }));
      inputNode.dispatchEvent(new Event("change", { bubbles: true }));
    };

    if (panelWasOpen) {
      window.setTimeout(() => {
        clearInlineInput();
        floatingButton.click();
        window.setTimeout(clearInlineInput, 80);
      }, 100);
      return;
    }
    clearInlineInput();
    floatingButton.click();
    window.setTimeout(clearInlineInput, 80);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    syncSchedulerRef.current.destroyed = false;
    const iconUrl = new URL(
      chatbotIconPath,
      window.location.origin,
    ).toString();

    const closeChatIfOpen = () => {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;
      if (!frameDoc.querySelector(".chat-box")) return;
      const closeButton = frameDoc.querySelector(".chat-box .close-btn");
      if (closeButton && typeof closeButton.click === "function") {
        closeButton.click();
      }
      window.setTimeout(() => {
        const stillOpen = frameDoc.querySelector(".chat-box");
        if (!stillOpen) return;
        frameDoc.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      }, 0);
    };

    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.width > 0;
    };

    const syncBottomOffset = () => {
      const disclaimer = document.querySelector(".map-disclaimer");
      const tablePanel = document.querySelector(".parcel-table-panel");
      const panelActionRow = document.querySelector(".parcel-table-panel__actions");
      const tableOpenViewport = document.querySelector(".map-stage__viewport--table-open");
      const frameDoc = iframe.contentDocument;
      const chatOpen = Boolean(frameDoc?.querySelector(".chat-box"));
      const onMapPage = Boolean(document.querySelector(".map-stage"));
      const isBottomPanelOpen = isVisible(tablePanel) || isVisible(panelActionRow) || isVisible(tableOpenViewport);
      let nextOffset = onMapPage ? (isBottomPanelOpen ? 96 : 62) : 32;
      if (chatOpen) {
        nextOffset += 18;
      }

      if (isVisible(disclaimer)) {
        nextOffset = Math.max(nextOffset, Math.ceil(disclaimer.getBoundingClientRect().height) + 14);
      }

      if (isVisible(tablePanel)) {
        nextOffset = Math.max(nextOffset, Math.ceil(tablePanel.getBoundingClientRect().height) + 52);
      }

      if (isVisible(panelActionRow)) {
        nextOffset = Math.max(nextOffset, Math.ceil(panelActionRow.getBoundingClientRect().height) + 130);
      }

      if (isVisible(tableOpenViewport)) {
        nextOffset = Math.max(nextOffset, 126);
      }

      setBottomOffset(nextOffset);
    };

    const runAskQuery = (frameDoc, session, query) => {
      const inputNode = frameDoc.querySelector(".input-area input");
      const queryText = String(query || "").trim();
      if (!(inputNode && queryText)) return;

      if (session.pendingAskTimer) {
        clearTimeout(session.pendingAskTimer);
        session.pendingAskTimer = null;
      }
      if (session.clearResetTimer) {
        clearTimeout(session.clearResetTimer);
        session.clearResetTimer = null;
      }

      const normalizedQuery = normalizeText(queryText);
      const getUserRows = () => (
        Array.from(frameDoc.querySelectorAll(".chat-container .message-row.user-row"))
          .filter((row) => !row.classList.contains("saarthi-menu-qa-row"))
      );
      const initialUserCount = getUserRows().length;

      const wasQueryPosted = () => {
        const rows = getUserRows();
        if (rows.length <= initialUserCount) return false;
        const latestRow = rows[rows.length - 1];
        const bubble = latestRow?.querySelector(".message-bubble.user");
        const text = normalizeText(bubble?.textContent || "");
        return text === normalizedQuery;
      };

      const getSendButton = () => {
        const buttons = Array.from(frameDoc.querySelectorAll(".input-area button"));
        if (!buttons.length) return null;
        const submitButton = buttons.find((button) => String(button.getAttribute("type") || "").toLowerCase() === "submit");
        if (submitButton) return submitButton;
        const labeledButton = buttons.find((button) => {
          const hint = normalizeText(
            button.getAttribute("aria-label")
            || button.getAttribute("title")
            || button.getAttribute("name")
            || "",
          );
          return hint.includes("send") || hint.includes("submit") || hint.includes("ask");
        });
        return labeledButton || buttons[buttons.length - 1];
      };

      const attemptSend = (remainingTries = 30) => {
        if (!inputNode.isConnected) return;
        if (wasQueryPosted()) return;

        const sendButton = getSendButton();
        if (sendButton && sendButton.disabled) {
          if (remainingTries <= 0) return;
          session.pendingAskTimer = window.setTimeout(() => attemptSend(remainingTries - 1), 120);
          return;
        }

        inputNode.focus();
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (typeof nativeValueSetter === "function") {
          nativeValueSetter.call(inputNode, queryText);
        } else {
          inputNode.value = queryText;
        }
        inputNode.dispatchEvent(new Event("input", { bubbles: true }));
        inputNode.dispatchEvent(new Event("change", { bubbles: true }));

        // Give React state one tick to sync before triggering send.
        session.pendingAskTimer = window.setTimeout(() => {
          if (!inputNode.isConnected) return;
          if (wasQueryPosted()) return;

          session.bypassOwnerModeOnce = true;
          const form = inputNode.closest("form");
          if (form && typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else if (form) {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          } else {
            const sendButtonNode = getSendButton();
            if (sendButtonNode && !sendButtonNode.disabled) {
              sendButtonNode.click();
            } else {
              const enterEventInit = {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
              };
              inputNode.dispatchEvent(new KeyboardEvent("keydown", enterEventInit));
              inputNode.dispatchEvent(new KeyboardEvent("keypress", enterEventInit));
              inputNode.dispatchEvent(new KeyboardEvent("keyup", enterEventInit));
            }
          }
          window.setTimeout(() => {
            session.bypassOwnerModeOnce = false;
            const pendingInput = normalizeText(inputNode.value || "");
            const shouldRetry =
              !wasQueryPosted()
              && pendingInput === normalizedQuery
              && remainingTries > 0;
            if (shouldRetry) {
              attemptSend(remainingTries - 1);
            }
          }, 420);
        }, 40);
      };

      attemptSend();
    };

    const addSpecialQAPair = (frameDoc, session, question, answer) => {
      pushInlineMessage(session, "user", question);
      pushInlineMessage(session, "bot", answer);
      renderInjectedMessages(frameDoc, session, iconUrl);
      scrollChatToBottom(frameDoc);
    };

    const setInputNodeValue = (frameWindow, inputNode, nextValue) => {
      if (!inputNode) return;
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        frameWindow.HTMLInputElement?.prototype || HTMLInputElement.prototype,
        "value",
      )?.set;
      if (typeof nativeValueSetter === "function") {
        nativeValueSetter.call(inputNode, nextValue);
      } else {
        inputNode.value = nextValue;
      }
      inputNode.dispatchEvent(new Event("input", { bubbles: true }));
      inputNode.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const stopOwnerSpeechRecognition = (session) => {
      const recognition = session.speechRecognition;
      session.speechListening = false;
      if (!recognition) return;
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {
        // no-op
      }
      session.speechRecognition = null;
    };

    const queryOwnerMicPermissionState = async (targetNavigator) => {
      if (!targetNavigator?.permissions?.query) return "unknown";
      try {
        const permission = await targetNavigator.permissions.query({ name: "microphone" });
        return permission?.state || "unknown";
      } catch {
        return "unknown";
      }
    };

    const showOwnerVoicePermissionNotice = (frameDoc, session, noticeText) => {
      const text = String(noticeText || "").trim();
      if (!text) return;
      if (session.lastVoicePermissionNotice === text) return;
      session.lastVoicePermissionNotice = text;
      pushInlineMessage(session, "bot", text);
      renderInjectedMessages(frameDoc, session, iconUrl);
      session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
      scrollChatToBottom(frameDoc);
    };

    const ensureOwnerMicPermission = async (frameDoc, session) => {
      const frameWindow = frameDoc.defaultView || iframe.contentWindow || window;
      const targetNavigator = frameWindow.navigator || window.navigator;
      if (!targetNavigator?.mediaDevices?.getUserMedia) {
        session.micPermissionState = "unsupported";
        return { ok: false, reason: "unsupported" };
      }

      try {
        // Always invoke browser-level mic access flow on tap.
        // If permission is prompt, browser will show permission popup.
        const stream = await targetNavigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        session.micPermissionState = "granted";
        return { ok: true, reason: "granted" };
      } catch (error) {
        const latestPermission = await queryOwnerMicPermissionState(targetNavigator);
        if (latestPermission && latestPermission !== "unknown") {
          session.micPermissionState = latestPermission;
        }
        if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
          const refreshed = await queryOwnerMicPermissionState(targetNavigator);
          session.micPermissionState = refreshed && refreshed !== "unknown" ? refreshed : "prompt";
          return { ok: false, reason: session.micPermissionState === "denied" ? "denied" : "prompt" };
        }
        if (error?.name === "NotFoundError") {
          session.micPermissionState = "unavailable";
          return { ok: false, reason: "unavailable" };
        }
        return { ok: false, reason: "failed" };
      }
    };

    const ensureOwnerVoiceButton = (frameDoc, session) => {
      const frameWindow = frameDoc.defaultView || iframe.contentWindow || window;
      const inputArea = frameDoc.querySelector(".input-area");
      const inputNode = frameDoc.querySelector(".input-area input");
      if (!(inputArea && inputNode)) return;

      let micButton = inputArea.querySelector(".saarthi-owner-mic-btn");
      if (!micButton) {
        micButton = frameDoc.createElement("button");
        micButton.type = "button";
        micButton.className = "saarthi-owner-mic-btn";
        micButton.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.07A7 7 0 0 1 5 12a1 1 0 1 1 2 0 5 5 0 1 0 10 0z"></path>
            <path class="mic-slash" d="M4.5 4.5a1 1 0 0 1 1.4 0l13.6 13.6a1 1 0 1 1-1.4 1.4L4.5 5.9a1 1 0 0 1 0-1.4z"></path>
          </svg>
        `;
        const submitButton = inputArea.querySelector("button[type='submit']");
        if (submitButton && submitButton.parentElement === inputArea) {
          inputArea.insertBefore(micButton, submitButton);
        } else {
          inputArea.appendChild(micButton);
        }
      }

      const getPrimarySendButton = () => {
        const buttons = Array.from(inputArea.querySelectorAll("button"))
          .filter((button) => !button.classList.contains("saarthi-owner-mic-btn"));
        if (!buttons.length) return null;
        const submit = buttons.find((button) => String(button.getAttribute("type") || "").toLowerCase() === "submit");
        return submit || buttons[buttons.length - 1];
      };

      const syncMicAppearanceToSend = () => {
        const sendButton = getPrimarySendButton();
        if (!sendButton) return;

        // Keep requested order: mic first, then send.
        if (micButton.nextElementSibling !== sendButton) {
          inputArea.insertBefore(micButton, sendButton);
        }

        const styles = frameWindow.getComputedStyle(sendButton);
        const applyStyle = (prop, value) => {
          if (!value) return;
          micButton.style.setProperty(prop, value, "important");
        };

        applyStyle("width", styles.width);
        applyStyle("height", styles.height);
        applyStyle("min-width", styles.minWidth);
        applyStyle("border-radius", styles.borderRadius);
        applyStyle("border", styles.border);
        applyStyle("padding", styles.padding);
        applyStyle("background", styles.background);
        applyStyle("background-color", styles.backgroundColor);
        applyStyle("color", styles.color);
        applyStyle("box-shadow", styles.boxShadow);
      };

      syncMicAppearanceToSend();

      const SpeechRecognitionCtor =
        frameWindow.SpeechRecognition
        || frameWindow.webkitSpeechRecognition
        || window.SpeechRecognition
        || window.webkitSpeechRecognition;
      const speechSupported = typeof SpeechRecognitionCtor === "function";

      if (!speechSupported && session.speechListening) {
        stopOwnerSpeechRecognition(session);
      }

      micButton.disabled = !speechSupported || session.ownerApiBusy;
      micButton.classList.toggle("is-listening", Boolean(session.speechListening));
      const buttonHint = !speechSupported
        ? "Voice input is not supported in this browser."
        : (session.speechListening ? "Stop Hindi voice input" : "Start Hindi voice input");
      micButton.setAttribute("title", buttonHint);
      micButton.setAttribute("aria-label", buttonHint);

      if (micButton.dataset.bound === "1") return;
      micButton.dataset.bound = "1";
      micButton.addEventListener("click", async () => {
        if (!speechSupported) return;
        if (session.ownerApiBusy) return;

        if (session.speechListening) {
          stopOwnerSpeechRecognition(session);
          ensureOwnerVoiceButton(frameDoc, session);
          return;
        }

        const permission = await ensureOwnerMicPermission(frameDoc, session);
        if (!permission.ok) {
          if (permission.reason === "denied") {
            showOwnerVoicePermissionNotice(frameDoc, session, "Microphone blocked. Please allow microphone in browser site settings.");
          } else if (permission.reason === "unsupported") {
            showOwnerVoicePermissionNotice(frameDoc, session, "Voice input needs HTTPS and microphone support in this browser.");
          } else if (permission.reason === "unavailable") {
            showOwnerVoicePermissionNotice(frameDoc, session, "No microphone device found.");
          } else {
            showOwnerVoicePermissionNotice(frameDoc, session, "Please allow microphone access when the browser asks for permission.");
          }
          ensureOwnerVoiceButton(frameDoc, session);
          return;
        }
        session.lastVoicePermissionNotice = "";

        const recognition = new SpeechRecognitionCtor();
        let finalText = "";
        session.speechRecognition = recognition;
        session.speechListening = false;

        recognition.lang = "hi-IN";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          session.speechListening = true;
          ensureOwnerVoiceButton(frameDoc, session);
        };

        recognition.onresult = (event) => {
          let interimText = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            const transcript = String(result?.[0]?.transcript || "");
            if (!transcript) continue;
            if (result.isFinal) {
              finalText = `${finalText} ${transcript}`.trim();
            } else {
              interimText += transcript;
            }
          }
          const combinedText = `${finalText} ${interimText}`.trim();
          const liveInputNode = frameDoc.querySelector(".input-area input");
          setInputNodeValue(frameWindow, liveInputNode, combinedText);
        };

        recognition.onerror = () => {
          session.speechListening = false;
          session.speechRecognition = null;
          ensureOwnerVoiceButton(frameDoc, session);
        };

        recognition.onend = () => {
          session.speechListening = false;
          session.speechRecognition = null;
          ensureOwnerVoiceButton(frameDoc, session);
        };

        try {
          recognition.start();
        } catch (error) {
          if (error?.name === "InvalidStateError") {
            try {
              recognition.stop();
            } catch {
              // no-op
            }
            window.setTimeout(() => {
              try {
                recognition.start();
              } catch {
                session.speechListening = false;
                session.speechRecognition = null;
                ensureOwnerVoiceButton(frameDoc, session);
              }
            }, 120);
          } else {
            session.speechListening = false;
            session.speechRecognition = null;
          }
        }
        ensureOwnerVoiceButton(frameDoc, session);
      });
    };

      const handleOwnerApiSubmit = async (frameDoc, session) => {
      const useHindi = isHindiLocale(lang);
      if (!session.ownerApiMode || session.ownerApiBusy) return;
      const inputNode = frameDoc.querySelector(".input-area input");
      if (!inputNode) return;
    const query = String(inputNode.value || "").trim();
    if (!query) return;

    inputNode.value = "";
    inputNode.dispatchEvent(new Event("input", { bubbles: true }));

    pushInlineMessage(session, "user", query);
    const loadingMessageId = createInjectedId();
      session.injectedMessages.push({
        id: loadingMessageId,
        sender: "bot",
        text: useHindi ? "तुरंत खोज अनुरोध प्रोसेस हो रहा है..." : "Processing Instant Search request...",
        time: getCurrentTimeLabel(),
        typed: false,
        typingIndex: 0,
      });
    session.ownerApiBusy = true;
    ensureOwnerVoiceButton(frameDoc, session);

    upsertOwnerStatus(frameDoc, session, lang);
    renderInjectedMessages(frameDoc, session, iconUrl);
    session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
    scrollChatToBottom(frameDoc);

    try {
      if (!hasDevanagariText(query)) {
        session.injectedMessages = session.injectedMessages.map((message) => (
          message.id === loadingMessageId
            ? {
              ...message,
              text: useHindi
                ? "लाइव ओनर सर्च फिलहाल केवल हिंदी इनपुट सपोर्ट करता है।\nकृपया अपना पूरा प्रश्न हिंदी में लिखें।"
                : "Live Owner Search currently supports Hindi query input only.\nPlease type your full query in Hindi.\nEnglish support will be added in a future update.",
              typed: false,
              typingIndex: 0,
            }
            : message
        ));
        return;
      }

      const queryHints = extractOwnerQueryHints(query);
      const missingFields = getMissingOwnerQueryFields(queryHints);
      if (missingFields.length > 0) {
        session.injectedMessages = session.injectedMessages.map((message) => (
          message.id === loadingMessageId
            ? {
              ...message,
              text: useHindi
                ? `कृपया सभी आवश्यक फ़ील्ड शामिल करें।\nछूटे हुए फ़ील्ड: ${missingFields.join(", ")}\nउदाहरण: नाम XYZ जिला XYZ तहसील XYZ गांव XYZ मुरबा 00 खसरा 00`
                : `Please include all required fields.\nMissing: ${missingFields.join(", ")}\nExample: नाम XYZ जिला XYZ तहसील XYZ गांव XYZ मुरबा 00 खसरा 00`,
              typed: false,
              typingIndex: 0,
            }
            : message
        ));
        return;
      }

      const response = await requestOwnerApiResult(query, iframe.contentWindow);
      const resultText = formatOwnerApiResult(response, queryHints, lang);
      const selectionPayload = extractOwnerCadastralSelectionPayload(response, queryHints);
        session.injectedMessages = session.injectedMessages.map((message) => (
          message.id === loadingMessageId
            ? {
              ...message,
              text: resultText,
              typed: false,
              typingIndex: 0,
              action: selectionPayload
                ? {
                  kind: "open-cadastral",
                  label: useHindi ? "कैडस्ट्रल मैप पर दिखाएँ" : "Show on Cadastral Map",
                  payload: selectionPayload,
                }
                : null,
            }
            : message
        ));
      } catch (error) {
        const errorMessage = safeText(error?.message || error, "Unexpected error.");
        session.injectedMessages = session.injectedMessages.map((message) => (
          message.id === loadingMessageId
            ? {
              ...message,
              text: useHindi ? `ओनर विवरण अनुरोध असफल रहा।\n${errorMessage}` : `Owner details request failed.\n${errorMessage}`,
              typed: false,
              typingIndex: 0,
            }
            : message
        ));
      } finally {
        session.ownerApiBusy = false;
        ensureOwnerVoiceButton(frameDoc, session);
        upsertOwnerStatus(frameDoc, session, lang);
        renderInjectedMessages(frameDoc, session, iconUrl);
        session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
        scrollChatToBottom(frameDoc);
      }
    };

    const installFrameHandlers = (frameDoc) => {
      const session = menuSessionRef.current;
      if (session.boundDoc === frameDoc) return;

      if (session.docCleanup) {
        session.docCleanup();
        session.docCleanup = null;
      }

      const frameWindow = frameDoc.defaultView || iframe.contentWindow || window;
      const FrameElement = frameWindow.Element || Element;
      const FrameHTMLElement = frameWindow.HTMLElement || HTMLElement;
      const isFrameElement = (node) => node instanceof FrameElement;
      const isFrameHTMLElement = (node) => node instanceof FrameHTMLElement;

      const getTargetElement = (event) => {
        const target = event.target;
        if (isFrameElement(target)) return target;
        if (target && typeof target === "object" && "parentElement" in target) {
          return target.parentElement;
        }
        return null;
      };

      const forceClearInlineInput = () => {
        const inputNode = frameDoc.querySelector(".input-area input");
        if (!inputNode) return;
        setInputNodeValue(frameWindow, inputNode, "");
      };

      const shouldSkipDuplicateMenuDispatch = (dispatchKey) => {
        const now = Date.now();
        const isDuplicate = (
          session.lastMenuDispatchKey === dispatchKey
          && (now - session.lastMenuDispatchAt) < 320
        );
        session.lastMenuDispatchKey = dispatchKey;
        session.lastMenuDispatchAt = now;
        return isDuplicate;
      };

      const handleMenuAction = (action, targetMenu, query, event) => {
        const dispatchKey = `${action}|${targetMenu}|${query}`;
        if (shouldSkipDuplicateMenuDispatch(dispatchKey)) {
          event.preventDefault();
          event.stopPropagation();
          return true;
        }

        if (action === "menu") {
          stopOwnerSpeechRecognition(session);
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          session.menuState = targetMenu || "main";
        } else if (action === "ask") {
          const now = Date.now();
          const askKey = normalizeText(query || "");
          if (askKey && session.askLockKey === askKey && now < session.askLockUntil) {
            event.preventDefault();
            event.stopPropagation();
            return true;
          }
          session.askLockKey = askKey;
          session.askLockUntil = now + 1800;
          stopOwnerSpeechRecognition(session);
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          const localAnswer = resolveInlineLocalAnswer(query, lang);
          if (localAnswer) {
            addSpecialQAPair(frameDoc, session, query, localAnswer);
          } else {
            runAskQuery(frameDoc, session, query);
          }
        } else if (action === "language-help") {
          stopOwnerSpeechRecognition(session);
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          addSpecialQAPair(
            frameDoc,
            session,
            LANGUAGE_SUPPORT_QUESTION[lang] || LANGUAGE_SUPPORT_QUESTION.en,
            LANGUAGE_SUPPORT_TEXT[lang] || LANGUAGE_SUPPORT_TEXT.en,
          );
        } else if (action === "voice-help") {
          stopOwnerSpeechRecognition(session);
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          addSpecialQAPair(
            frameDoc,
            session,
            VOICE_SEARCH_HELP_QUESTION[lang] || VOICE_SEARCH_HELP_QUESTION.en,
            VOICE_SEARCH_HELP_TEXT[lang] || VOICE_SEARCH_HELP_TEXT.en,
          );
        } else if (action === "cadastral-help") {
          stopOwnerSpeechRecognition(session);
          session.ownerApiMode = false;
          session.ownerApiBusy = false;
          addSpecialQAPair(
            frameDoc,
            session,
            CADASTRAL_LAYER_QUESTION[lang] || CADASTRAL_LAYER_QUESTION.en,
            CADASTRAL_LAYER_ANSWER[lang] || CADASTRAL_LAYER_ANSWER.en,
          );
        } else if (action === "owner-api") {
          session.ownerApiMode = true;
          session.ownerApiBusy = false;
          addSpecialQAPair(
            frameDoc,
            session,
            query || (isHindiLocale(lang) ? "क्या मैं मालिक के नाम से खोज कर सकता/सकती हूँ?" : "Can I search by owner name?"),
            OWNER_SEARCH_HELP_TEXT[lang] || OWNER_SEARCH_HELP_TEXT.en,
          );
        }

        renderInlineMenu(frameDoc, session, activeLocale.questions, lang);
        ensureJumpToMenuButton(frameDoc, session, lang);
        ensureOwnerVoiceButton(frameDoc, session);
        session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
        event.preventDefault();
        event.stopPropagation();
        return true;
      };

      const handleMenuSelection = (menuButton, event) => {
        const action = menuButton.dataset.action || "";
        const targetMenu = menuButton.dataset.target || "";
        const query = menuButton.dataset.query || "";
        return handleMenuAction(action, targetMenu, query, event);
      };

      session.menuActionHandler = handleMenuAction;

      const isClearChatAction = (target) => {
        if (!isFrameElement(target)) return false;
        const button = target.closest(".chat-box .header-actions .icon-btn, .chat-box .header-actions button, .chat-box [data-action='clear-chat']");
        if (!isFrameHTMLElement(button)) return false;

        const titleText = normalizeText(
          button.getAttribute("title")
          || button.getAttribute("aria-label")
          || button.getAttribute("name")
          || "",
        );
        if (
          titleText.includes("clear")
          || titleText.includes("reset")
          || titleText.includes("delete")
          || titleText.includes("trash")
        ) return true;

        const headerActions = button.closest(".chat-box .header-actions");
        if (!isFrameHTMLElement(headerActions)) return false;
        const buttons = Array.from(
          headerActions.querySelectorAll(".icon-btn, button"),
        ).filter((node) => isFrameHTMLElement(node));
        return buttons.length >= 1 && buttons[0] === button;
      };

      const queueInlineResetAfterClear = () => {
        if (session.clearResetTimer) {
          clearTimeout(session.clearResetTimer);
          session.clearResetTimer = null;
        }
        session.clearResetTimer = window.setTimeout(() => {
          resetInlineMenuSession(frameDoc, session, activeLocale.questions, iconUrl, lang);
          clearChatHistoryRows(frameDoc);
          forceClearInlineInput();
          window.setTimeout(forceClearInlineInput, 140);
          window.setTimeout(forceClearInlineInput, 360);
          session.clearResetTimer = window.setTimeout(() => {
            session.clearResetTimer = null;
            resetInlineMenuSession(frameDoc, session, activeLocale.questions, iconUrl, lang);
            clearChatHistoryRows(frameDoc);
            forceClearInlineInput();
          }, 240);
        }, 120);
      };

      const onFramePointerDownCapture = (event) => {
        const target = getTargetElement(event);
        if (!isFrameElement(target)) return;
        if (isClearChatAction(target)) {
          queueInlineResetAfterClear();
          return;
        }
      };

      const onFrameClickCapture = (event) => {
        const target = getTargetElement(event);
        if (!isFrameElement(target)) return;

        const menuButton = target.closest(".saarthi-inline-menu__option");
        if (isFrameHTMLElement(menuButton)) {
          handleMenuSelection(menuButton, event);
          return;
        }

        const ownerActionButton = target.closest(".saarthi-inline-owner-action");
        if (isFrameHTMLElement(ownerActionButton)) {
          const messageId = ownerActionButton.dataset.inlineMessageId || "";
          const linkedMessage = Array.isArray(session.injectedMessages)
            ? session.injectedMessages.find((message) => message.id === messageId)
            : null;
          const actionPayload = linkedMessage?.action?.payload;
          if (!actionPayload) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          ownerActionButton.disabled = true;
          try {
            const pendingMessageId = createInjectedId();
            session.pendingCadastralStatusMessageId = pendingMessageId;
            session.injectedMessages.push({
              id: pendingMessageId,
              sender: "bot",
              text: isHindiLocale(lang) ? "मैप पर कैडस्ट्रल पार्सल खोला जा रहा है..." : "Opening cadastral parcel on map...",
              time: getCurrentTimeLabel(),
              typed: false,
              typingIndex: 0,
            });
            renderInjectedMessages(frameDoc, session, iconUrl);
            scrollChatToBottom(frameDoc);

            window.dispatchEvent(
              new CustomEvent("eodb-chatbot-open-cadastral", {
                detail: actionPayload,
              }),
            );
          } finally {
            window.setTimeout(() => {
              ownerActionButton.disabled = false;
            }, 600);
          }
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (isClearChatAction(target)) {
          queueInlineResetAfterClear();
          return;
        }

        const sendButton = target.closest(".input-area button");
        if (sendButton && session.ownerApiMode) {
          const micButton = target.closest(".saarthi-owner-mic-btn");
          if (micButton) {
            return;
          }
          if (session.bypassOwnerModeOnce) {
            session.bypassOwnerModeOnce = false;
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          void handleOwnerApiSubmit(frameDoc, session);
        }
      };

      const onFrameKeyDownCapture = (event) => {
        const target = getTargetElement(event);
        if (!isFrameElement(target)) return;
        if (event.key !== "Enter") return;
        if (!target.closest(".input-area input")) return;
        if (!session.ownerApiMode) return;
        if (session.bypassOwnerModeOnce) {
          session.bypassOwnerModeOnce = false;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        void handleOwnerApiSubmit(frameDoc, session);
      };

      frameDoc.addEventListener("pointerdown", onFramePointerDownCapture, true);
      frameDoc.addEventListener("click", onFrameClickCapture, true);
      frameDoc.addEventListener("keydown", onFrameKeyDownCapture, true);
      session.boundDoc = frameDoc;
      session.docCleanup = () => {
        session.menuActionHandler = null;
        if (session.clearResetTimer) {
          clearTimeout(session.clearResetTimer);
          session.clearResetTimer = null;
        }
        frameDoc.removeEventListener("pointerdown", onFramePointerDownCapture, true);
        frameDoc.removeEventListener("click", onFrameClickCapture, true);
        frameDoc.removeEventListener("keydown", onFrameKeyDownCapture, true);
      };
    };

    const syncWidget = () => {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc?.documentElement || !frameDoc.head || !frameDoc.body) return;
      frameDoc.documentElement.lang = lang === "hi" ? "hi" : "en";

      const appNode = frameDoc.querySelector(".app");
      const isDark = document.documentElement.dataset.theme === "dark";
      if (appNode) {
        appNode.classList.toggle("dark", isDark);
      }

      frameDoc.querySelectorAll(".floating-bot-img img, .bot-logo-img img, .bot-avatar-img img").forEach((img) => {
        if (img.getAttribute("src") !== iconUrl) {
          img.setAttribute("src", iconUrl);
        }
      });

      const subtitleNode = frameDoc.querySelector(".header-text p");
      if (subtitleNode && subtitleNode.textContent?.trim() !== activeLocale.subtitle) {
        subtitleNode.textContent = activeLocale.subtitle;
      }

      const faqTitleNode = frameDoc.querySelector(".faq-suggestions-title");
      if (faqTitleNode && faqTitleNode.textContent?.trim() !== activeLocale.faqTitle) {
        faqTitleNode.textContent = activeLocale.faqTitle;
      }

      const inputNode = frameDoc.querySelector(".input-area input");
      if (inputNode && inputNode.getAttribute("placeholder") !== activeLocale.inputPlaceholder) {
        inputNode.setAttribute("placeholder", activeLocale.inputPlaceholder);
      }
      ensureOwnerVoiceButton(frameDoc, menuSessionRef.current);

      frameDoc.querySelectorAll(".faq-suggestion-item").forEach((node, index) => {
        if (!(node instanceof HTMLElement)) return;
        const nextText = activeLocale.questions[index];
        if (!nextText) return;
        if (node.textContent?.trim() !== nextText) {
          node.textContent = nextText;
        }
      });

      const welcomeNode = frameDoc.querySelector(".message-row.bot-row .message-bubble.bot");
      if (welcomeNode) {
        const current = normalizeText(welcomeNode.textContent);
        const englishWelcome = normalizeText(CHATBOT_LOCALE.en.welcomeMessage);
        const hindiWelcome = normalizeText(CHATBOT_LOCALE.hi.welcomeMessage);
        const looksLikeWelcome =
          current === englishWelcome
          || current === hindiWelcome
          || (
            current.includes("welcome! i am eodb saarthi")
            && current.includes("ask your question in english or hinglish")
          )
          || (
            current.includes("à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆ")
            && current.includes("eodb saarthi")
          );
        if (looksLikeWelcome && welcomeNode.textContent?.trim() !== activeLocale.welcomeMessage) {
          welcomeNode.textContent = activeLocale.welcomeMessage;
        }
      }

      const hostStyles = getComputedStyle(document.documentElement);
      const css = buildBridgeStyles({
        surface: readToken(hostStyles, "--surface", "rgba(255, 255, 255, 0.92)"),
        surfaceStrong: readToken(hostStyles, "--surface-strong", "#ffffff"),
        bgSecondary: readToken(hostStyles, "--bg-secondary", "#f6faf7"),
        ink: readToken(hostStyles, "--ink", "#173248"),
        inkSoft: readToken(hostStyles, "--ink-soft", "#466075"),
        border: readToken(hostStyles, "--border", "rgba(23, 50, 72, 0.11)"),
        shadowSoft: readToken(hostStyles, "--shadow-soft", "0 14px 30px rgba(25, 54, 74, 0.09)"),
        green: readToken(hostStyles, "--green", "#2f8d5d"),
        mint: readToken(hostStyles, "--mint", "#1b9b8b"),
      });

      let bridgeStyle = frameDoc.getElementById("chatbot-theme-bridge");
      if (!bridgeStyle) {
        bridgeStyle = frameDoc.createElement("style");
        bridgeStyle.id = "chatbot-theme-bridge";
        frameDoc.head.appendChild(bridgeStyle);
      }
      bridgeStyle.textContent = css;

      const session = menuSessionRef.current;
      installFrameHandlers(frameDoc);

      const inlineRenderKey = buildInlineRenderKey(lang, session);
      const menuNodeMissing = !frameDoc.querySelector(".saarthi-inline-menu");
      const jumpButtonMissing = !frameDoc.querySelector(".saarthi-inline-menu__jump");
      const renderedRows = frameDoc.querySelectorAll(".saarthi-menu-qa-row").length;
      const expectedRows = Array.isArray(session.injectedMessages) ? session.injectedMessages.length : 0;
      const needsInlineRender =
        menuNodeMissing
        || jumpButtonMissing
        || renderedRows !== expectedRows
        || session.lastInlineRenderKey !== inlineRenderKey;

      if (needsInlineRender) {
        renderInlineMenu(frameDoc, session, activeLocale.questions, lang);
        renderInjectedMessages(frameDoc, session, iconUrl);
        ensureJumpToMenuButton(frameDoc, session, lang);
        session.lastInlineRenderKey = inlineRenderKey;
      }

      setIsOpen(Boolean(frameDoc.querySelector(".chat-box")));
      syncBottomOffset();
    };

    const runScheduledSync = () => {
      const scheduler = syncSchedulerRef.current;
      scheduler.pending = false;
      scheduler.timer = null;
      if (scheduler.destroyed) return;
      scheduler.lastRunAt = Date.now();
      syncWidget();
    };

    const scheduleSyncWidget = () => {
      const scheduler = syncSchedulerRef.current;
      if (scheduler.destroyed || scheduler.pending) return;

      const now = Date.now();
      const minGapMs = 120;
      const elapsed = now - scheduler.lastRunAt;
      const delay = elapsed >= minGapMs ? 0 : (minGapMs - elapsed);

      scheduler.pending = true;
      scheduler.timer = window.setTimeout(runScheduledSync, delay);
    };

    const setupObservers = () => {
      scheduleSyncWidget();

      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;

      layoutObserverRef.current?.disconnect();
      layoutObserverRef.current = new MutationObserver(() => {
        scheduleSyncWidget();
      });
      layoutObserverRef.current.observe(frameDoc.body, {
        childList: true,
        subtree: true,
      });
    };

    iframe.addEventListener("load", setupObservers);
    if (iframe.contentDocument?.readyState === "complete") {
      setupObservers();
    }

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      scheduleSyncWidget();
    });
    observerRef.current.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    hostLayoutObserverRef.current?.disconnect();
    hostLayoutObserverRef.current = new MutationObserver(() => {
      syncBottomOffset();
    });
    hostLayoutObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const onHostClickCapture = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".parcel-table-toggle, .parcel-table-panel__close")) {
        closeChatIfOpen();
      }
      window.setTimeout(syncBottomOffset, 0);
    };

    const onHostPointerDownCapture = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".parcel-table-toggle, .parcel-table-panel__close")) {
        closeChatIfOpen();
      }
    };

    document.addEventListener("click", onHostClickCapture, true);
    document.addEventListener("pointerdown", onHostPointerDownCapture, true);

    const onCadastralOpenResult = (event) => {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc) return;

      const session = menuSessionRef.current;
      const detail = event?.detail || {};
      const resultText = safeText(
        detail?.message,
        detail?.ok
          ? (isHindiLocale(lang) ? "कैडस्ट्रल पार्सल मैप पर खोल दिया गया है।" : "Opened cadastral parcel on map.")
          : (isHindiLocale(lang) ? "कैडस्ट्रल पार्सल मैप पर नहीं खोला जा सका।" : "Could not open cadastral parcel on map."),
      );
      const pendingId = session.pendingCadastralStatusMessageId;
      session.pendingCadastralStatusMessageId = null;

      if (pendingId) {
        let replaced = false;
        session.injectedMessages = (session.injectedMessages || []).map((message) => {
          if (message.id !== pendingId) return message;
          replaced = true;
          return {
            ...message,
            text: resultText,
            typed: false,
            typingIndex: 0,
          };
        });
        if (!replaced) {
          pushInlineMessage(session, "bot", resultText);
        }
      } else {
        pushInlineMessage(session, "bot", resultText);
      }

      renderInjectedMessages(frameDoc, session, iconUrl);
      session.lastInlineRenderKey = buildInlineRenderKey(lang, session);
      scrollChatToBottom(frameDoc);
    };
    window.addEventListener("eodb-chatbot-cadastral-open-result", onCadastralOpenResult);

    syncBottomOffset();

    return () => {
      const scheduler = syncSchedulerRef.current;
      scheduler.destroyed = true;
      if (scheduler.timer) {
        clearTimeout(scheduler.timer);
        scheduler.timer = null;
      }
      scheduler.pending = false;

      const session = menuSessionRef.current;
      clearInlineTypingTimers(session);
      if (session.docCleanup) {
        session.docCleanup();
        session.docCleanup = null;
      }
      if (session.jumpContainer && session.onJumpScroll) {
        session.jumpContainer.removeEventListener("scroll", session.onJumpScroll);
      }
      session.jumpContainer = null;
      session.onJumpScroll = null;
      session.boundDoc = null;
      if (session.pendingAskTimer) {
        clearTimeout(session.pendingAskTimer);
        session.pendingAskTimer = null;
      }
      if (session.speechAutoSubmitTimer) {
        clearTimeout(session.speechAutoSubmitTimer);
        session.speechAutoSubmitTimer = null;
      }
      stopOwnerSpeechRecognition(session);
      if (session.clearResetTimer) {
        clearTimeout(session.clearResetTimer);
        session.clearResetTimer = null;
      }

      iframe.removeEventListener("load", setupObservers);
      observerRef.current?.disconnect();
      layoutObserverRef.current?.disconnect();
      hostLayoutObserverRef.current?.disconnect();
      window.removeEventListener("eodb-chatbot-cadastral-open-result", onCadastralOpenResult);
      document.removeEventListener("click", onHostClickCapture, true);
      document.removeEventListener("pointerdown", onHostPointerDownCapture, true);
    };
  }, [activeLocale, chatbotIconPath, chatbotCssPath, chatbotJsPath, lang]);

  return (
    <div
      className={`saarthi-chatbot-widget ${isOpen ? "saarthi-chatbot-widget--open" : ""} ${blurred ? "saarthi-chatbot-widget--blurred" : ""} ${hidden ? "saarthi-chatbot-widget--hidden" : ""}`}
      style={{
        "--chatbot-bottom-offset": `${bottomOffset}px`,
      }}
    >
      {!isOpen ? (
        <button
          type="button"
          className="saarthi-chatbot-widget__launcher"
          onClick={openChatFromHost}
          aria-label="Open EODB Saarthi chatbot"
        >
          <img src={chatbotIconPath} alt="EODB Saarthi" />
        </button>
      ) : null}
      <iframe
        ref={iframeRef}
        className="saarthi-chatbot-widget__frame"
        src="about:blank"
        srcDoc={`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EODB Saarthi Chatbot</title>
    <style>
      html, body, #root {
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: 0;
        background: transparent !important;
      }
      body {
        overflow: hidden;
      }
    </style>
    <link rel="stylesheet" crossorigin href="${chatbotCssPath}">
    <script type="module" crossorigin src="${chatbotJsPath}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`}
        title="EODB Saarthi Chatbot"
        loading="lazy"
      />
    </div>
  );
}



