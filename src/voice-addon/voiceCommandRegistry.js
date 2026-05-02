export const VOICE_COMMAND_ACTIONS = Object.freeze({
  APPLY_TOPO_BASEMAP: "APPLY_TOPO_BASEMAP",
  APPLY_HYBRID_BASEMAP: "APPLY_HYBRID_BASEMAP",
  APPLY_IMAGERY_BASEMAP: "APPLY_IMAGERY_BASEMAP",
  APPLY_STREETS_BASEMAP: "APPLY_STREETS_BASEMAP",
  SET_LANGUAGE_ENGLISH: "SET_LANGUAGE_ENGLISH",
  SET_LANGUAGE_HINDI: "SET_LANGUAGE_HINDI",
  TURN_ON_DISTRICT_BOUNDARY: "TURN_ON_DISTRICT_BOUNDARY",
  TURN_OFF_DISTRICT_BOUNDARY: "TURN_OFF_DISTRICT_BOUNDARY",
  TURN_ON_TEHSIL_BOUNDARY: "TURN_ON_TEHSIL_BOUNDARY",
  TURN_OFF_TEHSIL_BOUNDARY: "TURN_OFF_TEHSIL_BOUNDARY",
  TURN_ON_VILLAGE_BOUNDARY: "TURN_ON_VILLAGE_BOUNDARY",
  TURN_OFF_VILLAGE_BOUNDARY: "TURN_OFF_VILLAGE_BOUNDARY",
  TURN_ON_ALL_BOUNDARIES: "TURN_ON_ALL_BOUNDARIES",
  TURN_OFF_ALL_BOUNDARIES: "TURN_OFF_ALL_BOUNDARIES",
  APPLY_LAYER_VISIBILITY: "APPLY_LAYER_VISIBILITY",
});

const BOUNDARY_KEYS = ["district", "tehsil", "village"];
const ALL_BOUNDARY_LAYER_KEYS = ["district", "tehsil", "village", "cadastral", "assets", "roads"];
const ALL_LAYER_ON_KEYS = ["district", "tehsil", "village", "cadastral", "assets", "roads"];
const ALL_LAYER_OFF_KEYS = ["district", "tehsil", "village", "cadastral", "assets", "roads", "nhai"];

export const voiceCommandRegistry = Object.freeze([
  {
    id: "basemap.topo",
    actionId: VOICE_COMMAND_ACTIONS.APPLY_TOPO_BASEMAP,
    phrases: [
      "apply topo map layer",
      "switch to topo map",
      "show topo map",
      "use topo basemap",
      "topo map",
      "topo map dikhao",
      "topo map lagao",
      "topo map kholo",
      "टोपो मैप दिखाओ",
      "तोपो मैप दिखाओ",
      "टोपो नक्शा दिखाओ",
      "तोपो नक्शा दिखाओ",
      "टोपो मैप लगाओ",
      "तोपो मैप लगाओ",
      "टोपोग्राफिक मैप दिखाओ",
    ],
  },
  {
    id: "basemap.hybrid",
    actionId: VOICE_COMMAND_ACTIONS.APPLY_HYBRID_BASEMAP,
    phrases: [
      "apply hybrid map",
      "switch to hybrid map",
      "show hybrid map",
      "hybrid map",
      "hybrid map dikhao",
      "hybrid map lagao",
      "hybrid map kholo",
      "हाइब्रिड मैप दिखाओ",
      "हाइब्रिड नक्शा दिखाओ",
      "हाइब्रिड मैप लगाओ",
    ],
  },
  {
    id: "basemap.imagery",
    actionId: VOICE_COMMAND_ACTIONS.APPLY_IMAGERY_BASEMAP,
    phrases: [
      "apply imagery map",
      "switch to imagery map",
      "show imagery map",
      "switch to satellite map",
      "satellite map",
      "imagery map",
      "imagery map dikhao",
      "imagery map lagao",
      "satellite map dikhao",
      "satellite map lagao",
      "satellite imagery layer show",
      "imagery layer open",
      "सैटेलाइट मैप दिखाओ",
      "इमेजरी मैप दिखाओ",
      "उपग्रह नक्शा दिखाओ",
      "इमेजरी लेयर खोलो",
      "सैटेलाइट लेयर खोलो",
    ],
  },
  {
    id: "basemap.streets",
    actionId: VOICE_COMMAND_ACTIONS.APPLY_STREETS_BASEMAP,
    phrases: [
      "apply streets map",
      "switch to streets map",
      "show streets map",
      "streets map",
      "street map",
      "streets map dikhao",
      "streets map lagao",
      "street map dikhao",
      "street map lagao",
      "स्ट्रीट मैप दिखाओ",
      "सड़क नक्शा दिखाओ",
    ],
  },
  {
    id: "language.english",
    actionId: VOICE_COMMAND_ACTIONS.SET_LANGUAGE_ENGLISH,
    phrases: [
      "switch to english",
      "set language english",
      "english language",
      "change language to english",
      "hindi to english",
      "hindi to english karo",
      "set hindi to english",
      "english bhasha chuniye",
      "angrezi bhasha chuniye",
      "choose english language",
      "select english",
      "english me karo",
      "english mein karo",
      "eng language",
      "अंग्रेजी भाषा चुनिए",
      "हिंदी से अंग्रेजी",
      "भाषा अंग्रेजी करो",
    ],
  },
  {
    id: "language.hindi",
    actionId: VOICE_COMMAND_ACTIONS.SET_LANGUAGE_HINDI,
    phrases: [
      "switch to hindi",
      "set language hindi",
      "hindi language",
      "change language to hindi",
      "english to hindi",
      "english to hindi karo",
      "set english to hindi",
      "hindi bhasha chuniye",
      "hindi bhasa chuniye",
      "choose hindi language",
      "select hindi",
      "hindi me karo",
      "hindi mein karo",
      "हिंदी भाषा चुनिए",
      "अंग्रेजी से हिंदी",
      "भाषा हिंदी करो",
    ],
  },
  {
    id: "boundary.district.on",
    actionId: VOICE_COMMAND_ACTIONS.TURN_ON_DISTRICT_BOUNDARY,
    phrases: [
      "apply district boundary",
      "apply district layer",
      "district boundary on",
      "district layer on",
      "turn on district boundary",
      "turn on district layer",
      "district boundary dikhao",
      "district layer dikhao",
      "district boundary lagao",
      "district layer lagao",
      "जिला बाउंड्री दिखाओ",
      "जिला सीमा दिखाओ",
      "जिला लेयर दिखाओ",
      "जिला परत दिखाओ",
    ],
  },
  {
    id: "boundary.district.off",
    actionId: VOICE_COMMAND_ACTIONS.TURN_OFF_DISTRICT_BOUNDARY,
    phrases: [
      "district boundary off",
      "district layer off",
      "turn off district boundary",
      "turn off district layer",
      "hide district boundary",
      "hide district layer",
      "district boundary band karo",
      "district layer band karo",
      "जिला बाउंड्री बंद करो",
      "जिला सीमा हटाओ",
      "जिला लेयर बंद करो",
      "जिला परत हटाओ",
    ],
  },
  {
    id: "boundary.tehsil.on",
    actionId: VOICE_COMMAND_ACTIONS.TURN_ON_TEHSIL_BOUNDARY,
    phrases: [
      "apply tehsil boundary",
      "apply tehsil layer",
      "apply tahsil boundary",
      "apply tahsil layer",
      "apply thsil boundary",
      "apply thsil layer",
      "tehsil boundary on",
      "tehsil layer on",
      "turn on tehsil boundary",
      "turn on tehsil layer",
      "tehsil boundary dikhao",
      "tehsil layer dikhao",
      "tehsil boundary lagao",
      "tehsil layer lagao",
      "तहसील बाउंड्री दिखाओ",
      "तहसील सीमा दिखाओ",
      "तहसील लेयर दिखाओ",
      "तहसील परत दिखाओ",
    ],
  },
  {
    id: "boundary.tehsil.off",
    actionId: VOICE_COMMAND_ACTIONS.TURN_OFF_TEHSIL_BOUNDARY,
    phrases: [
      "tehsil boundary off",
      "tehsil layer off",
      "turn off tehsil boundary",
      "turn off tehsil layer",
      "hide tehsil boundary",
      "hide tehsil layer",
      "tehsil boundary band karo",
      "tehsil layer band karo",
      "तहसील बाउंड्री बंद करो",
      "तहसील सीमा हटाओ",
      "तहसील लेयर बंद करो",
      "तहसील परत हटाओ",
    ],
  },
  {
    id: "boundary.village.on",
    actionId: VOICE_COMMAND_ACTIONS.TURN_ON_VILLAGE_BOUNDARY,
    phrases: [
      "apply village boundary",
      "apply village layer",
      "village boundary on",
      "village layer on",
      "turn on village boundary",
      "turn on village layer",
      "village boundary dikhao",
      "village layer dikhao",
      "village boundary lagao",
      "village layer lagao",
      "village layer call karo",
      "village boundary on karo",
      "गांव बाउंड्री दिखाओ",
      "गांव सीमा दिखाओ",
      "गांव लेयर दिखाओ",
      "गांव परत दिखाओ",
      "विलेज बाउंड्री ऑन करो",
    ],
  },
  {
    id: "boundary.village.off",
    actionId: VOICE_COMMAND_ACTIONS.TURN_OFF_VILLAGE_BOUNDARY,
    phrases: [
      "village boundary off",
      "village layer off",
      "turn off village boundary",
      "turn off village layer",
      "hide village boundary",
      "hide village layer",
      "village boundary band karo",
      "village layer band karo",
      "village boundary band kro",
      "गांव बाउंड्री बंद करो",
      "गांव सीमा हटाओ",
      "गांव लेयर बंद करो",
      "गांव परत हटाओ",
      "विलेज बाउंड्री बंद करो",
    ],
  },
  {
    id: "boundary.all.on",
    actionId: VOICE_COMMAND_ACTIONS.TURN_ON_ALL_BOUNDARIES,
    phrases: [
      "all boundaries on",
      "show all boundaries",
      "all layer on",
      "all layers on",
      "show all layers",
      "sab boundary on",
      "sab boundaries on",
      "sab layer on",
      "sabhi layer on",
      "shbi layer on",
      "sab boundary dikhao",
      "sari boundary on",
      "saari boundary on",
      "sabhi boundary on",
      "shbi boundary on",
      "saree boundary on",
      "sabhi layer lagao",
      "shbi layer lagao",
      "sabhi layer chalu karo",
      "सभी बाउंड्री चालू करो",
      "सभी सीमा दिखाओ",
      "सभी लेयर चालू करो",
    ],
  },
  {
    id: "boundary.all.off",
    actionId: VOICE_COMMAND_ACTIONS.TURN_OFF_ALL_BOUNDARIES,
    phrases: [
      "all boundaries off",
      "hide all boundaries",
      "all layer off",
      "all layers off",
      "hide all layers",
      "sab boundary off",
      "sab boundaries off",
      "sab layer off",
      "sabhi layer off",
      "shbi layer off",
      "sab boundary band karo",
      "sari boundary band karo",
      "saari boundary band karo",
      "sabhi boundary band karo",
      "shbi boundary band karo",
      "saree boundary band karo",
      "sabhi layer hatao",
      "shbi layer hatao",
      "sabhi layer hato",
      "सभी बाउंड्री बंद करो",
      "सभी सीमा हटाओ",
      "सभी लेयर हटाओ",
    ],
  },
]);

const COMMAND_WORDS = [
  "apply", "switch", "show", "use", "set", "change", "turn", "enable", "disable", "hide",
  "on", "off", "open", "dikhao", "dikha do", "dikhado", "lagao", "lgao", "laga do", "karo",
  "chuniye", "sath sath", "saath saath", "band", "hatao", "hata do", "hato", "chalu", "kholo", "khol do", "badlo",
  "दिखाओ", "लगाओ", "करो", "खोलो", "बदलो", "चालू", "बंद", "हटाओ",
];

const MAP_WORDS = [
  "map", "layer", "basemap", "base map", "naksha", "manchitra",
  "मैप", "लेयर", "परत", "बेसमैप", "नक्शा", "मानचित्र",
];

const LANGUAGE_HINTS = [
  "language", "bhasha", "bhasa", "lang", "english", "eng", "hindi", "angrezi", "inglish",
  "भाषा", "हिंदी", "हिन्दी", "अंग्रेजी", "इंग्लिश",
];

const LAYER_TOKENS = {
  district: ["district", "districts", "zila", "जिला"],
  tehsil: ["tehsil", "tehsils", "tahsil", "thsil", "तहसील"],
  village: [
    "village", "villages", "villag", "villagee", "vilege", "vilage", "vllage",
    "gaon", "gram",
    "गांव", "गाँव", "विलेज", "विलेज़", "विलेज्",
  ],
  cadastral: [
    "cadastral", "khasra", "land record", "land records", "land info", "bhumi", "bhu naksha",
    "cadstral", "cadastal", "cadaster", "pedastral", "pedastal", "pedestal",
    "कैडस्ट्रल", "खसरा", "भू अभिलेख",
  ],
  roads: [
    "road", "roads", "road infra", "road network", "haryana road", "hr road", "haryana road infra", "haryana road network",
    "रोड", "सड़क", "नेटवर्क", "हरियाणा रोड नेटवर्क", "हरियाणा रोड इन्फ्रा",
  ],
  assets: [
    "asset", "assets", "government asset", "government assets", "govt asset", "govt assets", "goverment asset", "goverment assets",
    "सरकारी संपत्ति", "सरकारी एसेट", "गवर्नमेंट एसेट",
  ],
  nhai: [
    "nhai", "national highway", "national highways", "nhai upcoming",
    "एनएचएआई", "राष्ट्रीय राजमार्ग",
  ],
};

const BOUNDARY_HINTS = [
  "boundary", "boundaries", "boundry", "seema", "sheema", "sima", "shima",
  "borders", "border", "layer", "layers", "सीमा", "बाउंड्री", "सरहद", "लेयर", "परत",
];
const ALL_BOUNDARY_HINTS = [
  "all boundary", "all boundaries", "sab boundary", "sab boundaries", "boundary all", "boundaries all",
  "sari boundary", "saari boundary", "sabhi boundary", "sbhi boundary", "shbi boundary", "saree boundary",
  "all layer", "all layers", "sab layer", "sabhi layer", "shbi layer", "sbhi layer",
  "all parat", "sab parat", "sabhi parat", "shbi parat",
  "all seema", "all sima", "all shima", "sab seema", "sabhi seema", "shbi seema",
  "सभी बाउंड्री", "सभी सीमा", "सारी बाउंड्री", "सभी लेयर", "सारी लेयर", "सभी परत",
];

const ON_TOGGLE_WORDS = [
  "on", "on karo", "on kro", "enable", "show", "apply", "use", "start", "open",
  "chalu", "chalu karo", "chalu kro",
  "dikhao", "dikha do", "lagao", "lgao", "laga do",
  "ऑन", "ऑन करो", "चालू", "चालू करो", "दिखाओ", "लगाओ",
];

const OFF_TOGGLE_WORDS = [
  "off", "off karo", "off kro", "disable", "hide", "remove", "stop", "close",
  "band", "band karo", "band kro", "hatao", "hata do", "hato",
  "ऑफ", "ऑफ करो", "बंद", "बंद करो", "हटाओ",
];
const TOGGLE_INTENT_WORDS = [...ON_TOGGLE_WORDS, ...OFF_TOGGLE_WORDS];

const ENGLISH_WORDS = ["english", "eng", "angrezi", "inglish", "अंग्रेजी", "इंग्लिश"];
const HINDI_WORDS = ["hindi", "hindee", "hindustani", "हिंदी", "हिन्दी"];

export function normalizeVoiceTranscript(value) {
  return `${value ?? ""}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveVoiceCommand(rawTranscript) {
  const normalizedTranscript = normalizeVoiceTranscript(rawTranscript);
  if (!normalizedTranscript) return null;

  const command = voiceCommandRegistry.find((entry) =>
    entry.phrases.some((phrase) => normalizedTranscript.includes(normalizeVoiceTranscript(phrase))),
  );

  const resolvedCommand = matchVariantCommand(normalizedTranscript) || command;
  if (!resolvedCommand) return null;

  return {
    ...resolvedCommand,
    normalizedTranscript,
  };
}

function matchVariantCommand(normalizedTranscript) {
  const hasActionWord = containsAny(normalizedTranscript, COMMAND_WORDS);
  const hasMapWord = containsAny(normalizedTranscript, MAP_WORDS);

  if (hasActionWord && hasMapWord) {
    if (containsAny(normalizedTranscript, ["hybrid", "हाइब्रिड"])) {
      return findByAction(VOICE_COMMAND_ACTIONS.APPLY_HYBRID_BASEMAP);
    }

    if (containsAny(normalizedTranscript, ["imagery", "satellite", "इमेजरी", "सैटेलाइट", "उपग्रह"])) {
      return findByAction(VOICE_COMMAND_ACTIONS.APPLY_IMAGERY_BASEMAP);
    }

    if (containsAny(normalizedTranscript, ["streets", "street", "स्ट्रीट", "सड़क"])) {
      return findByAction(VOICE_COMMAND_ACTIONS.APPLY_STREETS_BASEMAP);
    }

    if (containsAny(normalizedTranscript, ["topo", "topographic", "टोपो", "तोपो", "टोपोग्राफिक"])) {
      return findByAction(VOICE_COMMAND_ACTIONS.APPLY_TOPO_BASEMAP);
    }

  }

  if (
    matchesLayerTerms(normalizedTranscript, "cadastral")
    && !containsAny(normalizedTranscript, OFF_TOGGLE_WORDS)
  ) {
    return {
      id: "layer.visibility.cadastral.on",
      actionId: VOICE_COMMAND_ACTIONS.APPLY_LAYER_VISIBILITY,
      layerPatch: { cadastral: true },
    };
  }

  const languageCommand = resolveLanguageCommand(normalizedTranscript);
  if (languageCommand) {
    return languageCommand;
  }

  const layerCommand = resolveLayerVisibilityCommand(normalizedTranscript);
  if (layerCommand) {
    return layerCommand;
  }

  return null;
}

function resolveLanguageCommand(normalizedTranscript) {
  const hasLanguageWord = containsAny(normalizedTranscript, LANGUAGE_HINTS);
  const hasEnglish = containsAny(normalizedTranscript, ENGLISH_WORDS);
  const hasHindi = containsAny(normalizedTranscript, HINDI_WORDS);

  if (!hasLanguageWord && !hasEnglish && !hasHindi) {
    return null;
  }

  if (hasEnglish && !hasHindi) {
    return findByAction(VOICE_COMMAND_ACTIONS.SET_LANGUAGE_ENGLISH);
  }

  if (hasHindi && !hasEnglish) {
    return findByAction(VOICE_COMMAND_ACTIONS.SET_LANGUAGE_HINDI);
  }

  if (containsAny(normalizedTranscript, ["hindi to english", "hindi se english", "हिंदी से अंग्रेजी", "हिन्दी से अंग्रेजी"])) {
    return findByAction(VOICE_COMMAND_ACTIONS.SET_LANGUAGE_ENGLISH);
  }

  if (containsAny(normalizedTranscript, ["english to hindi", "english se hindi", "अंग्रेजी से हिंदी", "अंग्रेजी से हिन्दी"])) {
    return findByAction(VOICE_COMMAND_ACTIONS.SET_LANGUAGE_HINDI);
  }

  const englishIndex = lastIndexOfAny(normalizedTranscript, ENGLISH_WORDS);
  const hindiIndex = lastIndexOfAny(normalizedTranscript, HINDI_WORDS);

  if (englishIndex === -1 && hindiIndex === -1) {
    return null;
  }

  return englishIndex >= hindiIndex
    ? findByAction(VOICE_COMMAND_ACTIONS.SET_LANGUAGE_ENGLISH)
    : findByAction(VOICE_COMMAND_ACTIONS.SET_LANGUAGE_HINDI);
}

function resolveLayerVisibilityCommand(normalizedTranscript) {
  const targetLayerKeys = detectLayerTargets(normalizedTranscript);
  if (!targetLayerKeys.length) {
    return null;
  }

  if (!containsAny(normalizedTranscript, TOGGLE_INTENT_WORDS)) {
    return null;
  }

  const shouldEnable = detectToggleIntent(normalizedTranscript);
  const explicitAllBoundary = isExplicitAllBoundaryCommand(normalizedTranscript);
  const layerKeys = explicitAllBoundary
    ? (shouldEnable ? ALL_LAYER_ON_KEYS : ALL_LAYER_OFF_KEYS)
    : targetLayerKeys;

  const layerPatch = layerKeys.reduce((patch, layerKey) => {
    patch[layerKey] = shouldEnable;
    return patch;
  }, {});

  if (explicitAllBoundary && shouldEnable) {
    // Keep NHAI off for "all layers on" commands until data is available.
    layerPatch.nhai = false;
  }

  return {
    id: `layer.visibility.${shouldEnable ? "on" : "off"}`,
    actionId: VOICE_COMMAND_ACTIONS.APPLY_LAYER_VISIBILITY,
    layerPatch,
  };
}

function detectLayerTargets(normalizedTranscript) {
  const layerKeys = [];

  const hasBoundaryHint = containsAny(normalizedTranscript, BOUNDARY_HINTS);
  const hasAllBoundaryHint = containsAny(normalizedTranscript, ALL_BOUNDARY_HINTS);

  if (hasAllBoundaryHint) {
    layerKeys.push(...ALL_BOUNDARY_LAYER_KEYS);
  } else {
    if (matchesLayerTerms(normalizedTranscript, "district") && hasBoundaryHint) {
      layerKeys.push("district");
    }
    if (matchesLayerTerms(normalizedTranscript, "tehsil") && hasBoundaryHint) {
      layerKeys.push("tehsil");
    }
    if (matchesLayerTerms(normalizedTranscript, "village") && hasBoundaryHint) {
      layerKeys.push("village");
    }

    // Safety rule: do not infer "all boundaries" from unclear speech.
    // Only apply all boundaries when explicit "all/sab" phrasing is present.
  }

  if (matchesLayerTerms(normalizedTranscript, "cadastral")) {
    layerKeys.push("cadastral");
  }

  if (matchesLayerTerms(normalizedTranscript, "roads")) {
    layerKeys.push("roads");
  }

  if (matchesLayerTerms(normalizedTranscript, "assets")) {
    layerKeys.push("assets");
  }

  if (matchesLayerTerms(normalizedTranscript, "nhai")) {
    layerKeys.push("nhai");
  }

  return Array.from(new Set(layerKeys));
}

function isExplicitAllBoundaryCommand(normalizedTranscript) {
  return (
    containsAny(normalizedTranscript, BOUNDARY_HINTS) &&
    containsAny(normalizedTranscript, ALL_BOUNDARY_HINTS)
  );
}

function matchesLayerTerms(normalizedTranscript, layerKey) {
  return containsAny(normalizedTranscript, LAYER_TOKENS[layerKey] ?? []);
}

function detectToggleIntent(normalizedTranscript) {
  const lastOnIndex = lastIndexOfAny(normalizedTranscript, ON_TOGGLE_WORDS);
  const lastOffIndex = lastIndexOfAny(normalizedTranscript, OFF_TOGGLE_WORDS);

  if (lastOnIndex === -1 && lastOffIndex === -1) {
    return true;
  }

  if (lastOffIndex > lastOnIndex) {
    return false;
  }

  return true;
}

function findByAction(actionId) {
  return voiceCommandRegistry.find((entry) => entry.actionId === actionId) || null;
}

function containsAny(value, terms) {
  return terms.some((term) => value.includes(normalizeVoiceTranscript(term)));
}

function lastIndexOfAny(value, terms) {
  let maxIndex = -1;

  for (const term of terms) {
    const index = value.lastIndexOf(normalizeVoiceTranscript(term));
    if (index > maxIndex) {
      maxIndex = index;
    }
  }

  return maxIndex;
}

export function executeVoiceCommand(command, actionHandlers, context = {}) {
  const handler = actionHandlers?.[command?.actionId];
  if (typeof handler !== "function") {
    return { ok: false };
  }

  const result = handler({
    command,
    ...context,
  });

  return result ?? { ok: true };
}
