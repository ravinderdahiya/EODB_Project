import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BasemapSwitcher from "@/components/BasemapSwitcher";
import LayerPanel from "@/components/LayerPanel";
import MapStage from "@/components/MapStage";
import MapToolbar from "@/components/MapToolbar";
import MeasurementPanel from "@/components/MeasurementPanel";
import ParcelDetailsModal from "@/components/ParcelDetailsModal";
import SidebarNav from "@/components/SidebarNav";
import SaarthiChatbotWidget from "@/components/chatbot/SaarthiChatbotWidget";
import VoiceAssistantPopup from "@/components/voiceAssistant/VoiceAssistantPopup";
import { navigationItems } from "@/data/portalData";
import { useArcGISMap } from "@/hooks/useArcGISMap";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMeasurement } from "@/hooks/useMeasurement";
import { useSelectFeatures } from "@/hooks/useSelectFeatures";
import useDisableDevTools from "@/hooks/useDisableDevTools";
import { useLanguage } from "@/context/LanguageContext";
import { getAllTehsils, getAllVillages, getDistricts, searchAdministrativeAreas } from "@/services/mapQueryService";
import { createEmptyParcelRecord } from "@/services/parcelRecordService";
import { triggerPrint } from "@/utils/printUtils";
import { VOICE_COMMAND_ACTIONS, normalizeVoiceTranscript } from "@/voice-addon/voiceCommandRegistry";
import {
  DISTRICT_VOICE_STOPWORDS,
  TEHSIL_INTENT_TOKENS,
  TEHSIL_VOICE_STOPWORDS,
  VILLAGE_INTENT_TOKENS,
  VILLAGE_VOICE_STOPWORDS,
  buildVoiceCandidatePhrases,
  hasVoiceIntentToken,
  pickBestVoiceNameMatch,
  stripDistrictNameTokens,
} from "@/voice-addon/voiceAdminMatcher";

import { useAnalytics } from "@/services/analyticsService";

const initialLayers = {
  cadastral: true,
  district:  true,
  tehsil:    true,
  village:   true,
  assets:    false, // Government Assets (visible: false — user can toggle on)
  nhai:      false, // NHAI Upcoming (hidden by default, matches old project)
  roads:     false, // HR Road Infra  (hidden by default, matches old project)
};

function normalizeSearchTerm(value) {
  return `${value ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatAdminSuggestionDescription(match) {
  if (match.type === "district") {
    return "District boundary";
  }

  if (match.type === "tehsil") {
    return `Tehsil boundary | District ${match.dName || match.dCode}`;
  }

  return `Village boundary | District ${match.dName || match.dCode} | Tehsil ${match.tName || match.tCode}`;
}

export default function App() {
  const navigate = useNavigate();
  const { trackPageView, trackUserInteraction, trackMapInteraction, trackSearch, trackFeatureUsage } = useAnalytics();

  // Disable developer tools in production
  useDisableDevTools();
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useDashboardPreferences();

  const { t, setLang } = useLanguage();
  const [activeNav, setActiveNav] = useState(navigationItems[0]?.id ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);
  // single active-panel state — only one floating panel open at a time
  const [activeMapPanel, setActiveMapPanel] = useState(null); // 'layers' | 'basemap' | null
  const toggleMapPanel = (name) => setActiveMapPanel((p) => (p === name ? null : name));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [parcelTableOpen, setParcelTableOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const [activeBasemap, setActiveBasemap] = useState("cadastral");
  const [layerVisibility, setLayerVisibility] = useState(initialLayers);
  const [selectedParcel, setSelectedParcel] = useState(createEmptyParcelRecord);
  const [parcelHistory, setParcelHistory] = useState([]);
  const [systemMessage, setSystemMessage] = useState(
    "ArcGIS map is active with highlighted Haryana state and district boundaries.",
  );
  const [measurementMode, setMeasurementMode] = useState(null);
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [voiceDistricts, setVoiceDistricts] = useState([]);
  const [voiceTehsils, setVoiceTehsils] = useState([]);
  const [voiceVillages, setVoiceVillages] = useState([]);
  const hasSelectedParcel = selectedParcel.registryRef !== "DLR-UNAVAILABLE";
  const adminSuggestionRequestIdRef = useRef(0);

  // Track initial page load
  useEffect(() => {
    trackPageView('/', 'Digital Land Record Haryana - Home');
  }, [trackPageView]);

  // Track search interactions
  useEffect(() => {
    if (searchValue.trim().length > 2) {
      trackSearch(searchValue, 'map_search');
    }
  }, [searchValue, trackSearch]);

  // Track layer visibility changes
  useEffect(() => {
    const visibleLayers = Object.entries(layerVisibility)
      .filter(([_, visible]) => visible)
      .map(([layer]) => layer);
    trackFeatureUsage('layer_visibility', { visibleLayers });
  }, [layerVisibility, trackFeatureUsage]);

  // Track basemap changes
  useEffect(() => {
    trackMapInteraction('basemap_change', { basemap: activeBasemap });
  }, [activeBasemap, trackMapInteraction]);

  const parcelHistorySuggestions =
    deferredSearch.trim().length < 2
      ? []
      : parcelHistory
          .filter((parcel) =>
            [
              parcel.khasraNo,
              parcel.ownerName,
              parcel.village,
              parcel.tehsil,
              parcel.district,
            ]
              .join(" ")
              .toLowerCase()
              .includes(deferredSearch.toLowerCase()),
          )
          .slice(0, 3)
          .map((parcel) => ({
            ...parcel,
            kind: "parcel",
            title: `Khasra ${parcel.khasraNo}`,
            description: [parcel.ownerName, parcel.village, parcel.tehsil]
              .filter(Boolean)
              .join(" | "),
          }));

  const searchSuggestions =
    deferredSearch.trim().length < 2
      ? []
      : [...adminSuggestions, ...parcelHistorySuggestions].slice(0, 8);

  const rememberParcel = (parcel) => {
    if (!parcel || parcel.registryRef === "DLR-UNAVAILABLE") {
      return;
    }

    setParcelHistory((current) => {
      const next = current.filter((entry) => entry.registryRef !== parcel.registryRef);
      return [parcel, ...next].slice(0, 8);
    });
  };

  const sfClearRef = useRef(null);

  const resetParcelSelection = () => {
    sfClearRef.current?.();
    setSelectedParcel(createEmptyParcelRecord());
    layersRef.current?.boundaryLayer?.removeAll?.();
    layersRef.current?.selectionLayer?.removeAll?.();
    closePopup();
  };

  const applyParcelSelection = (parcel, options = {}) => {
    if (!parcel) {
      return;
    }

    sfClearRef.current?.();

    const { openDetails = false, openTable = true, statusMessage } = options;

    startTransition(() => {
      setSelectedParcel(parcel);
      setActiveNav("search");
    });

    rememberParcel(parcel);
    if (openTable) {
      setParcelTableOpen(true);
    }
    if (openDetails) {
      setDetailsOpen(true);
    }
    setSearchValue("");
    setSystemMessage(
      statusMessage || `Loaded ${parcel.recordType || "land record"} ${parcel.registryRef}.`,
    );
  };

  const {
    containerRef,
    viewRef,
    layersRef,
    mapReady,
    mapStatus,
    mapScale,
    serviceHealth,
    zoomIn,
    zoomOut,
    resetView,
    refreshOperationalLayers,
    goToCurrentLocation,
    searchPlace,
    drawBoundary,
    closePopup,
    zoomForPrint,
    restoreExtentAfterPrint,
  } = useArcGISMap({
    activeBasemap,
    layerVisibility,
    selectedParcel,
    onParcelSelect: (parcel, options = {}) => {
      applyParcelSelection(parcel, {
        openTable: options.openTable ?? false,
        statusMessage: `Khasra ${parcel.khasraNo} highlighted on the ESRI map.`,
      });
    },
    onPreviewFullDetails: (preview) => {
      applyParcelSelection(preview, {
        openDetails: true,
        openTable: false,
        statusMessage: `Opened land information details for ${preview.registryRef}.`,
      });
    },
  });

  // ── Select Features ──────────────────────────────────────────────────────────
  const sf = useSelectFeatures({ viewRef, layersRef });
  useEffect(() => { sfClearRef.current = sf.clearSelection; }, [sf.clearSelection]);

  // ── Measurement ──────────────────────────────────────────────────────────────
  const measurement = useMeasurement({ viewRef, layersRef });

  // Auto-open the bottom table when selection rows arrive
  useEffect(() => {
    if (sf.rows.length > 0) {
      setParcelTableOpen(true);
    }
  }, [sf.rows.length]);

  // Forward selection status messages to the system message bar
  useEffect(() => {
    if (sf.statusMessage) {
      setSystemMessage(sf.statusMessage);
    }
  }, [sf.statusMessage]);

  useEffect(() => {
    if (isTablet) {
      setSidebarOpen(false);
    }
  }, [isTablet]);

  useEffect(() => {
    if (isMobile) setActiveMapPanel(null);
  }, [isMobile]);

  useEffect(() => {
    setSystemMessage(mapStatus);
  }, [mapStatus]);

  useEffect(() => {
    const query = deferredSearch.trim();

    if (query.length < 2) {
      setAdminSuggestions([]);
      return;
    }

    const requestId = adminSuggestionRequestIdRef.current + 1;
    adminSuggestionRequestIdRef.current = requestId;

    searchAdministrativeAreas(query, { limit: 6 })
      .then((matches) => {
        if (adminSuggestionRequestIdRef.current !== requestId) {
          return;
        }

        setAdminSuggestions(
          matches.map((match) => ({
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
          })),
        );
      })
      .catch(() => {
        if (adminSuggestionRequestIdRef.current === requestId) {
          setAdminSuggestions([]);
        }
      });
  }, [deferredSearch]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getDistricts(), getAllTehsils(), getAllVillages()])
      .then(([districtResult, tehsilResult, villageResult]) => {
        if (!active) return;

        setVoiceDistricts(
          districtResult.status === "fulfilled" && Array.isArray(districtResult.value)
            ? districtResult.value
            : [],
        );
        setVoiceTehsils(
          tehsilResult.status === "fulfilled" && Array.isArray(tehsilResult.value)
            ? tehsilResult.value
            : [],
        );
        setVoiceVillages(
          villageResult.status === "fulfilled" && Array.isArray(villageResult.value)
            ? villageResult.value
            : [],
        );
      })
      .catch(() => {
        if (!active) return;
        setVoiceDistricts([]);
        setVoiceTehsils([]);
        setVoiceVillages([]);
      });

    return () => {
      active = false;
    };
  }, []);

  // Resolve search text into the best matching administrative boundary target.
  const resolveAdminBoundarySearch = async (rawQuery) => {
    const matches = await searchAdministrativeAreas(rawQuery, { limit: 10 });
    if (!matches.length) return null;

    const normalizedQuery = normalizeSearchTerm(rawQuery);
    const exact = matches.find(
      (match) => normalizeSearchTerm(match.name) === normalizedQuery,
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
  };

  // Draw and zoom to selected administrative boundary from search/voice target.
  const highlightAdminBoundary = async (target, options = {}) => {
    const { exactMatch = true } = options;
    const result = await drawBoundary(target.type, target.codes);

    if (!result.ok) {
      setSystemMessage(result.message);
      return false;
    }

    setSearchValue("");
    setSystemMessage(
      exactMatch
        ? `Highlighted ${target.type} boundary for ${target.label}.`
        : `Showing closest ${target.type} match: ${target.label}.`,
    );
    return true;
  };

  // Direct admin-boundary resolver for deterministic UI chips.
  const runNamedAdminBoundaryFocus = async ({ command, transcript }) => {
    const boundaryType = command?.boundaryType;
    const boundaryName = `${command?.boundaryName || transcript || ""}`.trim();
    if (!boundaryType || !boundaryName) {
      return { ok: false };
    }

    try {
      const matches = await searchAdministrativeAreas(boundaryName, { limit: 12 });
      const normalizedTarget = normalizeSearchTerm(boundaryName);
      const typedExact = matches.find(
        (match) =>
          match.type === boundaryType
          && normalizeSearchTerm(match.name) === normalizedTarget,
      );
      const typedFallback = matches.find((match) => match.type === boundaryType);
      const chosen = typedExact || typedFallback;

      if (!chosen) {
        setSystemMessage(`Could not find ${boundaryType} "${boundaryName}". Try again.`);
        return { ok: false };
      }

      const handled = await highlightAdminBoundary(
        {
          type: chosen.type,
          label: chosen.name,
          codes: {
            dCode: chosen.dCode,
            ...(chosen.tCode ? { tCode: chosen.tCode } : {}),
            ...(chosen.vCode ? { vCode: chosen.vCode } : {}),
          },
        },
        { exactMatch: Boolean(typedExact) },
      );
      return { ok: Boolean(handled) };
    } catch {
      setSystemMessage("Could not resolve boundary right now. Try again.");
      return { ok: false };
    }
  };

  // Voice district resolver: exact + fuzzy + phonetic against cached district list.
  const matchDistrictFromNormalizedTranscript = (normalizedText) =>
    pickBestVoiceNameMatch(
      normalizedText,
      voiceDistricts,
      (district) => district?.name || "",
      { minSimilarity: 0.7 },
    );

  // Resolve district name from transcript by direct + stopword-stripped matching.
  const resolveDistrictFromVoiceTranscript = (transcript, normalizedTranscript) => {
    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    if (!normalizedText) {
      return null;
    }

    const directMatch = matchDistrictFromNormalizedTranscript(normalizedText);
    if (directMatch) {
      return directMatch;
    }

    const strippedTokens = normalizedText
      .split(" ")
      .filter(Boolean)
      .filter((token) => !DISTRICT_VOICE_STOPWORDS.has(token));

    if (!strippedTokens.length) {
      return null;
    }

    return matchDistrictFromNormalizedTranscript(strippedTokens.join(" "));
  };

  // Execute district focus flow and fallback to child intent when user also speaks tehsil/village.
  const runDistrictVoiceFocus = async ({ transcript, normalizedTranscript, strictIntent }) => {
    if (!voiceDistricts.length) {
      if (strictIntent) {
        setSystemMessage("District list is loading. Please try district command again.");
        return { ok: false };
      }
      return { ok: false };
    }

    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    const matchedDistrict = resolveDistrictFromVoiceTranscript(transcript, normalizedText);
    if (!matchedDistrict?.code) {
      if (strictIntent) {
        setSystemMessage(`District name not recognized in "${transcript}". Try saying "Panipat district dikhao".`);
        return { ok: false };
      }
      return { ok: false };
    }

    // If user explicitly said tehsil/village with district context, try child boundary first.
    if (hasVoiceIntentToken(normalizedText, VILLAGE_INTENT_TOKENS)) {
      const villageOutcome = await runVillageVoiceFocus({
        transcript,
        normalizedTranscript: normalizedText,
        strictIntent,
      });
      if (villageOutcome?.ok) {
        return villageOutcome;
      }
      return { ok: false };
    }

    if (hasVoiceIntentToken(normalizedText, TEHSIL_INTENT_TOKENS)) {
      const tehsilOutcome = await runTehsilVoiceFocus({
        transcript,
        normalizedTranscript: normalizedText,
        strictIntent,
      });
      if (tehsilOutcome?.ok) {
        return tehsilOutcome;
      }
      return { ok: false };
    }

    // If district is spoken with extra place words, try tehsil/village before district.
    const districtNameTokens = normalizeVoiceTranscript(matchedDistrict.name || "")
      .split(" ")
      .filter(Boolean);
    const districtExtraTokens = normalizedText
      .split(" ")
      .filter(Boolean)
      .filter((token) => !DISTRICT_VOICE_STOPWORDS.has(token))
      .filter((token) => !districtNameTokens.includes(token));
    const hasDistrictChildHint = districtExtraTokens.length > 0;
    if (hasDistrictChildHint) {
      const tehsilOutcome = await runTehsilVoiceFocus({
        transcript,
        normalizedTranscript: normalizedText,
        strictIntent,
      });
      if (tehsilOutcome?.ok) {
        return tehsilOutcome;
      }

      const villageOutcome = await runVillageVoiceFocus({
        transcript,
        normalizedTranscript: normalizedText,
        strictIntent,
      });
      if (villageOutcome?.ok) {
        return villageOutcome;
      }

      // Strict mode: if user said district + extra place words, do not fallback to district only.
      if (strictIntent) {
        setSystemMessage(
          `Could not find tehsil/village inside district ${matchedDistrict.name}. Try full order: "${matchedDistrict.name} district <tehsil> tehsil <village> village dikhao".`,
        );
        return { ok: false };
      }
    }

    const result = await drawBoundary(
      "district",
      { dCode: matchedDistrict.code },
      { expandFactor: 1.28 },
    );
    if (!result?.ok) {
      setSystemMessage(result?.message || "Failed to highlight district boundary.");
      return { ok: false };
    }

    setSearchValue("");
    setSystemMessage(`Highlighted district boundary for ${matchedDistrict.name}.`);
    return { ok: true };
  };

  // Voice tehsil resolver: exact + fuzzy + phonetic against cached tehsil list.
  const matchTehsilFromNormalizedTranscript = (normalizedText, options = {}) =>
    pickBestVoiceNameMatch(
      normalizedText,
      options?.districtCode
        ? voiceTehsils.filter((tehsil) => tehsil?.dCode === options.districtCode)
        : voiceTehsils,
      (tehsil) => tehsil?.tName || "",
      { minSimilarity: 0.7 },
    );

  // Resolve tehsil from transcript, optionally constrained inside a spoken district.
  const resolveTehsilFromVoiceTranscript = (transcript, normalizedTranscript, options = {}) => {
    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    if (!normalizedText) {
      return null;
    }

    const matchedDistrict = options?.districtCode
      ? voiceDistricts.find((district) => district?.code === options.districtCode)
      : null;

    const strippedTokens = normalizedText
      .split(" ")
      .filter(Boolean)
      .filter((token) => !TEHSIL_VOICE_STOPWORDS.has(token));

    const districtStrippedTokens = stripDistrictNameTokens(strippedTokens, matchedDistrict?.name || "");
    if (!districtStrippedTokens.length) {
      return null;
    }

    const candidatePhrases = buildVoiceCandidatePhrases(districtStrippedTokens);
    for (const candidate of candidatePhrases) {
      const match = matchTehsilFromNormalizedTranscript(candidate, {
        districtCode: options?.districtCode,
      });
      if (match) {
        return match;
      }
    }

    // Fallback: try full transcript only after context-stripped matching.
    // This avoids false matches like choosing "Jhajjar" tehsil from
    // "Jhajjar district me Beri tehsil dikhao".
    const directMatch = matchTehsilFromNormalizedTranscript(normalizedText, {
      districtCode: options?.districtCode,
    });
    if (directMatch) {
      const districtName = normalizeVoiceTranscript(matchedDistrict?.name || "");
      const tehsilName = normalizeVoiceTranscript(directMatch?.tName || "");
      const hasExplicitChildWords = districtStrippedTokens.length > 0;

      if (hasExplicitChildWords && districtName && tehsilName === districtName) {
        return null;
      }
      return directMatch;
    }

    return null;
  };

  // Execute tehsil focus flow and highlight the matched tehsil boundary.
  const runTehsilVoiceFocus = async ({ transcript, normalizedTranscript, strictIntent }) => {
    if (!voiceTehsils.length) {
      if (strictIntent) {
        setSystemMessage("Tehsil list is loading. Please try tehsil command again.");
        return { ok: false };
      }
      return { ok: false };
    }

    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    const matchedDistrict = resolveDistrictFromVoiceTranscript(transcript, normalizedText);
    const matchedTehsil = resolveTehsilFromVoiceTranscript(transcript, normalizedText, {
      districtCode: matchedDistrict?.code,
    });

    if (!matchedTehsil?.dCode || !matchedTehsil?.tCode) {
      if (strictIntent) {
        if (matchedDistrict?.name) {
          setSystemMessage(`Tehsil not recognized in district ${matchedDistrict.name}. Try saying "Beri tehsil in Jhajjar".`);
        } else {
          setSystemMessage(`Tehsil name not recognized in "${transcript}". Try saying "Ganaur tehsil dikhao".`);
        }
        return { ok: false };
      }
      return { ok: false };
    }

    const result = await drawBoundary(
      "tehsil",
      { dCode: matchedTehsil.dCode, tCode: matchedTehsil.tCode },
      { expandFactor: 1.28 },
    );
    if (!result?.ok) {
      setSystemMessage(result?.message || "Failed to highlight tehsil boundary.");
      return { ok: false };
    }

    setSearchValue("");
    const districtName = matchedTehsil.dName ? ` (${matchedTehsil.dName})` : "";
    setSystemMessage(`Highlighted tehsil boundary for ${matchedTehsil.tName}${districtName}.`);
    return { ok: true };
  };

  // Narrow village candidates by spoken district/tehsil to avoid same-name conflicts.
  const getVillageCandidatesByContext = (context = {}) => {
    const { districtCode, tehsilCode } = context;
    if (!voiceVillages.length) {
      return [];
    }

    if (tehsilCode) {
      const byTehsil = voiceVillages.filter((village) =>
        village?.tCode === tehsilCode
        && (!districtCode || village?.dCode === districtCode),
      );
      if (byTehsil.length) {
        return byTehsil;
      }
    }

    if (districtCode) {
      const byDistrict = voiceVillages.filter((village) => village?.dCode === districtCode);
      if (byDistrict.length) {
        return byDistrict;
      }
    }

    return voiceVillages;
  };

  // Voice village resolver: exact + fuzzy + phonetic; if district/tehsil is spoken,
  // we filter candidates inside that context to avoid same-name village conflicts.
  const matchVillageFromNormalizedTranscript = (normalizedText, context = {}) =>
    pickBestVoiceNameMatch(
      normalizedText,
      getVillageCandidatesByContext(context),
      (village) => village?.vName || "",
      { minSimilarity: 0.68 },
    );

  // Extract district/tehsil context from transcript so village matching stays local.
  const extractVillageVoiceContext = (transcript, normalizedTranscript) => {
    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    const matchedDistrict = resolveDistrictFromVoiceTranscript(transcript, normalizedText);
    const matchedTehsil = resolveTehsilFromVoiceTranscript(transcript, normalizedText, {
      districtCode: matchedDistrict?.code,
    });

    // Tehsil implies district. Use tehsil context only if it matches the spoken district.
    if (
      matchedTehsil?.tCode
      && matchedTehsil?.dCode
      && (!matchedDistrict?.code || matchedTehsil.dCode === matchedDistrict.code)
    ) {
      return {
        districtCode: matchedTehsil.dCode,
        tehsilCode: matchedTehsil.tCode,
      };
    }

    if (matchedDistrict?.code) {
      return { districtCode: matchedDistrict.code };
    }

    return {};
  };

  // Remove context words (district/tehsil names) from village transcript tokens so
  // phrases like "Jhajjar district main Beri Khas village dikhao" keep only village terms.
  const stripVillageContextTokens = (tokens, context = {}) => {
    if (!tokens?.length) {
      return [];
    }

    const blockedTokens = new Set();
    const district = context?.districtCode
      ? voiceDistricts.find((item) => item?.code === context.districtCode)
      : null;
    const tehsil = context?.tehsilCode
      ? voiceTehsils.find((item) =>
        item?.tCode === context.tehsilCode
        && (!context?.districtCode || item?.dCode === context.districtCode),
      )
      : null;

    for (const name of [district?.name, tehsil?.tName]) {
      const normalizedName = normalizeVoiceTranscript(name);
      if (!normalizedName) continue;
      normalizedName
        .split(" ")
        .filter(Boolean)
        .forEach((part) => blockedTokens.add(part));
    }

    return tokens.filter((token) => !blockedTokens.has(token));
  };

  // Resolve village from transcript using context-aware exact/fuzzy phrase candidates.
  const resolveVillageFromVoiceTranscript = (transcript, normalizedTranscript) => {
    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    if (!normalizedText) {
      return null;
    }

    const context = extractVillageVoiceContext(transcript, normalizedText);

    const strippedTokens = normalizedText
      .split(" ")
      .filter(Boolean)
      .filter((token) => !VILLAGE_VOICE_STOPWORDS.has(token));

    const contextStrippedTokens = stripVillageContextTokens(strippedTokens, context);

    const contextCandidatePhrases = buildVoiceCandidatePhrases(contextStrippedTokens);
    for (const candidate of contextCandidatePhrases) {
      const contextStrippedMatch = matchVillageFromNormalizedTranscript(candidate, context);
      if (contextStrippedMatch) {
        return contextStrippedMatch;
      }
    }

    const directMatch = matchVillageFromNormalizedTranscript(normalizedText, context);
    if (directMatch) {
      return directMatch;
    }

    if (!strippedTokens.length) {
      return null;
    }

    const strippedCandidatePhrases = buildVoiceCandidatePhrases(strippedTokens);
    for (const candidate of strippedCandidatePhrases) {
      const strippedMatch = matchVillageFromNormalizedTranscript(candidate, context);
      if (strippedMatch) {
        return strippedMatch;
      }
    }

    // If district/tehsil context was spoken, do not jump to another district.
    if (context?.districtCode || context?.tehsilCode) {
      return null;
    }

    // Final fallback without context filter only when no context was spoken.
    return matchVillageFromNormalizedTranscript(strippedCandidatePhrases[0] || "");
  };

  // Execute village focus flow and highlight the matched village boundary.
  const runVillageVoiceFocus = async ({ transcript, normalizedTranscript, strictIntent }) => {
    if (!voiceVillages.length) {
      if (strictIntent) {
        setSystemMessage("Village list is loading. Please try village command again.");
        return { ok: false };
      }
      return { ok: false };
    }

    const matchedVillage = resolveVillageFromVoiceTranscript(transcript, normalizedTranscript);

    if (!matchedVillage?.dCode || !matchedVillage?.tCode || !matchedVillage?.vCode) {
      if (strictIntent) {
        setSystemMessage(`Village name not recognized in "${transcript}". Try saying "Sisana village dikhao".`);
        return { ok: false };
      }
      return { ok: false };
    }

    const result = await drawBoundary(
      "village",
      {
        dCode: matchedVillage.dCode,
        tCode: matchedVillage.tCode,
        vCode: matchedVillage.vCode,
      },
      { expandFactor: 1.28 },
    );
    if (!result?.ok) {
      setSystemMessage(result?.message || "Failed to highlight village boundary.");
      return { ok: false };
    }

    setSearchValue("");
    const contextParts = [matchedVillage.tName, matchedVillage.dName].filter(Boolean);
    const contextText = contextParts.length ? ` (${contextParts.join(", ")})` : "";
    setSystemMessage(`Highlighted village boundary for ${matchedVillage.vName}${contextText}.`);
    return { ok: true };
  };

  // Fallback router when command is generic: picks district/tehsil/village handler by intent clues.
  const runAdministrativeVoiceFallback = async ({ transcript, normalizedTranscript }) => {
    const normalizedText = normalizeVoiceTranscript(normalizedTranscript || transcript);
    const hasVillageIntent = hasVoiceIntentToken(normalizedText, VILLAGE_INTENT_TOKENS);
    const hasTehsilIntent = hasVoiceIntentToken(normalizedText, TEHSIL_INTENT_TOKENS);
    const matchedDistrict = resolveDistrictFromVoiceTranscript(transcript, normalizedText);
    const districtNameTokens = normalizeVoiceTranscript(matchedDistrict?.name || "")
      .split(" ")
      .filter(Boolean);

    // Combo hint: user said a district + extra place words (often village name).
    const districtComboTokens = normalizedText
      .split(" ")
      .filter(Boolean)
      .filter((token) => !DISTRICT_VOICE_STOPWORDS.has(token))
      .filter((token) => !districtNameTokens.includes(token));
    const hasDistrictPlaceCombo = Boolean(matchedDistrict?.code) && districtComboTokens.length > 0;
    const hasDistrictContext = Boolean(matchedDistrict?.code);

    // Strict hierarchy routing:
    // 1) If user says district + tehsil/village context, do NOT fallback to district-only highlight.
    // 2) Prefer village when village token is spoken; otherwise prefer tehsil for district+place combo.
    // 3) Keep legacy broad fallback only when no child context was spoken.
    const fallbackHandlers = hasVillageIntent
      ? (hasDistrictContext
        ? [runVillageVoiceFocus, runTehsilVoiceFocus]
        : [runVillageVoiceFocus, runTehsilVoiceFocus, runDistrictVoiceFocus])
      : hasTehsilIntent
        ? (hasDistrictContext
          ? [runTehsilVoiceFocus, runVillageVoiceFocus]
          : [runTehsilVoiceFocus, runVillageVoiceFocus, runDistrictVoiceFocus])
        : hasDistrictPlaceCombo
          ? [runTehsilVoiceFocus, runVillageVoiceFocus]
          : [runDistrictVoiceFocus, runTehsilVoiceFocus, runVillageVoiceFocus];

    const useStrictHierarchy =
      (hasDistrictContext && (hasTehsilIntent || hasVillageIntent))
      || hasDistrictPlaceCombo;

    for (const handler of fallbackHandlers) {
      const outcome = await handler({
        transcript,
        normalizedTranscript: normalizedText,
        strictIntent: useStrictHierarchy,
      });
      if (outcome?.ok) {
        return outcome;
      }
    }

    return { ok: false };
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const query = searchValue.trim();
    const normalized = query.toLowerCase();

    if (!normalized) {
      setSystemMessage("Enter a Khasra number, owner, village or place to search.");
      return;
    }

    // Track search submission
    trackUserInteraction('search_submit', query);

    try {
      const adminSearchResult = await resolveAdminBoundarySearch(query);

      if (adminSearchResult?.target) {
        const handled = await highlightAdminBoundary(adminSearchResult.target, {
          exactMatch: adminSearchResult.exactMatch,
        });
        if (handled) {
          return;
        }
        return;
      }
    } catch {
      // Fall through to location geocoding if boundary lookup fails unexpectedly.
    }

    const parcelMatch = parcelHistory.find((parcel) =>
      [
        parcel.khasraNo,
        parcel.ownerName,
        parcel.village,
        parcel.tehsil,
        parcel.district,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );

    if (parcelMatch) {
      applyParcelSelection(parcelMatch, {
        statusMessage: `Loaded land information ${parcelMatch.registryRef} from recent selections.`,
      });
      return;
    }

    const result = await searchPlace(query);
    setSystemMessage(result.message);
  };

  const handleSuggestionSelect = async (suggestion) => {
    if (!suggestion) return;

    if (suggestion.kind === "admin") {
      await highlightAdminBoundary(
        {
          type: suggestion.boundaryType,
          label: suggestion.title,
          codes: suggestion.codes,
        },
        { exactMatch: true },
      );
      return;
    }

    applyParcelSelection(suggestion, {
      statusMessage: `Loaded land information ${suggestion.registryRef} from recent selections.`,
    });
  };

  const handleBasemapChange = (nextPreset) => {
    setActiveBasemap(nextPreset);
    setSystemMessage(`${nextPreset[0].toUpperCase()}${nextPreset.slice(1)} map preset applied.`);
  };

  const handleToolbarAction = async (actionId) => {
    if (actionId === "search") {
      document.getElementById("portal-search")?.focus();
      setSystemMessage("Search bar focused for land information or place lookup.");
      return;
    }

    if (actionId === "zoom-in") {
      const result = await zoomIn();
      setSystemMessage(result.message);
      return;
    }

    if (actionId === "zoom-out") {
      const result = await zoomOut();
      setSystemMessage(result.message);
      return;
    }

    if (actionId === "layers") {
      // Close measurement so the panels don't overlap
      if (measurementMode !== null) {
        measurement.clearMeasure();
        setMeasurementMode(null);
      }
      toggleMapPanel("layers");
      return;
    }
    if (actionId === "basemap") {
      if (measurementMode !== null) {
        measurement.clearMeasure();
        setMeasurementMode(null);
      }
      toggleMapPanel("basemap");
      return;
    }

    if (actionId === "reset" || actionId === "target") {
      const result = await resetView();
      setSystemMessage(result.message);
      return;
    }

    if (actionId === "locate") {
      const result = await goToCurrentLocation();
      setSystemMessage(result.message);
      return;
    }

    if (actionId === "measurement") {
      if (!mapReady) {
        setSystemMessage("Map is still initializing. Please wait a moment before using measurement tools.");
        return;
      }
      setActiveMapPanel(null); // close layers / basemap panels
      if (measurementMode !== null) {
        measurement.clearMeasure();
        setMeasurementMode(null);
        setSystemMessage("Measurement tool closed.");
      } else {
        sf.clearSelection();
        setMeasurementMode("panel");
        setSystemMessage("Select Measure Distance or Measure Area, then draw on the map.");
      }
    }
  };

  const handleToggleLayer = (layerKey) => {
    setLayerVisibility((current) => ({
      ...current,
      [layerKey]: !current[layerKey],
    }));
  };

  // Apply voice-driven layer visibility changes in one consistent update path.
  const applyLayerVisibilityPatchFromVoice = (layerPatch = {}, message) => {
    const nextEntries = Object.entries(layerPatch).filter(([key]) => key in initialLayers);
    if (!nextEntries.length) {
      return { ok: false };
    }

    setLayerVisibility((current) => {
      const next = { ...current };
      nextEntries.forEach(([key, value]) => {
        next[key] = Boolean(value);
      });
      return next;
    });
    setSystemMessage(message || "Layer visibility updated from voice command.");
    return { ok: true };
  };

  const handleRefresh = () => {
    const result = refreshOperationalLayers();
    setSystemMessage(result.message);
  };

  const handleMapPrint = async () => {
    document.body.classList.add("print-parcel-view");
    const savedExtent = await zoomForPrint();
    // Allow zoom animation + tile rendering to settle before print dialog
    await new Promise((resolve) => setTimeout(resolve, 1400));
    triggerPrint();
    window.addEventListener(
      "afterprint",
      async () => {
        document.body.classList.remove("print-parcel-view");
        await restoreExtentAfterPrint(savedExtent);
      },
      { once: true },
    );
  };

  // App-side execution map for parsed voice actions from voiceCommandRegistry.
  const voiceActionHandlers = {
    [VOICE_COMMAND_ACTIONS.APPLY_TOPO_BASEMAP]: () => {
      handleBasemapChange("topo");
      return { ok: true };
    },
    [VOICE_COMMAND_ACTIONS.APPLY_HYBRID_BASEMAP]: () => {
      handleBasemapChange("cadastral");
      return { ok: true };
    },
    [VOICE_COMMAND_ACTIONS.APPLY_IMAGERY_BASEMAP]: () => {
      handleBasemapChange("satellite");
      return { ok: true };
    },
    [VOICE_COMMAND_ACTIONS.APPLY_STREETS_BASEMAP]: () => {
      handleBasemapChange("streets");
      return { ok: true };
    },
    [VOICE_COMMAND_ACTIONS.SET_LANGUAGE_ENGLISH]: () => {
      setLang("en");
      setSystemMessage("Language changed to English via voice command.");
      return { ok: true };
    },
    [VOICE_COMMAND_ACTIONS.SET_LANGUAGE_HINDI]: () => {
      setLang("hi");
      setSystemMessage("Language changed to Hindi via voice command.");
      return { ok: true };
    },
    [VOICE_COMMAND_ACTIONS.TURN_ON_DISTRICT_BOUNDARY]: () =>
      applyLayerVisibilityPatchFromVoice({ district: true }, "District boundary enabled."),
    [VOICE_COMMAND_ACTIONS.TURN_OFF_DISTRICT_BOUNDARY]: () =>
      applyLayerVisibilityPatchFromVoice({ district: false }, "District boundary disabled."),
    [VOICE_COMMAND_ACTIONS.TURN_ON_TEHSIL_BOUNDARY]: () =>
      applyLayerVisibilityPatchFromVoice({ tehsil: true }, "Tehsil boundary enabled."),
    [VOICE_COMMAND_ACTIONS.TURN_OFF_TEHSIL_BOUNDARY]: () =>
      applyLayerVisibilityPatchFromVoice({ tehsil: false }, "Tehsil boundary disabled."),
    [VOICE_COMMAND_ACTIONS.TURN_ON_VILLAGE_BOUNDARY]: () =>
      applyLayerVisibilityPatchFromVoice({ village: true }, "Village boundary enabled."),
    [VOICE_COMMAND_ACTIONS.TURN_OFF_VILLAGE_BOUNDARY]: () =>
      applyLayerVisibilityPatchFromVoice({ village: false }, "Village boundary disabled."),
    [VOICE_COMMAND_ACTIONS.TURN_ON_ALL_BOUNDARIES]: () =>
      applyLayerVisibilityPatchFromVoice(
        { district: true, tehsil: true, village: true },
        "All boundaries enabled.",
      ),
    [VOICE_COMMAND_ACTIONS.TURN_OFF_ALL_BOUNDARIES]: () =>
      applyLayerVisibilityPatchFromVoice(
        { district: false, tehsil: false, village: false },
        "All boundaries disabled.",
      ),
    [VOICE_COMMAND_ACTIONS.APPLY_LAYER_VISIBILITY]: ({ command }) =>
      applyLayerVisibilityPatchFromVoice(command?.layerPatch, "Layer visibility updated."),
    [VOICE_COMMAND_ACTIONS.GO_TO_DISTRICT_BOUNDARY]: ({ transcript, normalizedTranscript }) =>
      runDistrictVoiceFocus({ transcript, normalizedTranscript, strictIntent: true }),
    [VOICE_COMMAND_ACTIONS.GO_TO_TEHSIL_BOUNDARY]: ({ transcript, normalizedTranscript }) =>
      runTehsilVoiceFocus({ transcript, normalizedTranscript, strictIntent: true }),
    [VOICE_COMMAND_ACTIONS.GO_TO_VILLAGE_BOUNDARY]: ({ transcript, normalizedTranscript }) =>
      runVillageVoiceFocus({ transcript, normalizedTranscript, strictIntent: true }),
    [VOICE_COMMAND_ACTIONS.GO_TO_ADMIN_BOUNDARY_BY_NAME]: ({ command, transcript }) =>
      runNamedAdminBoundaryFocus({ command, transcript }),
    [VOICE_COMMAND_ACTIONS.HANDLE_FALLBACK_TRANSCRIPT]: ({ transcript, normalizedTranscript }) =>
      runAdministrativeVoiceFallback({ transcript, normalizedTranscript }),
  };

  return (
    <div className="app-shell">
      <AppHeader
        searchPlaceholder={
          hasSelectedParcel
            ? selectedParcel.breadcrumb
            : t("header.searchPlaceholderDefault")
        }
        sidebarOpen={sidebarOpen}
        theme={theme}
        onSidebarToggle={() => setSidebarOpen((current) => !current)}
        onToggleTheme={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("isAdmin");
          sessionStorage.removeItem("isAuthenticated");
          navigate("/login");
        }}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={handleSearchSubmit}
        searchSuggestions={searchSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
      />
      <VoiceAssistantPopup
        actionHandlers={voiceActionHandlers}
        onStatusChange={setSystemMessage}
      />

      {isTablet && sidebarOpen ? (
        <button
          type="button"
          className="app-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={`dashboard-shell ${
          !sidebarOpen && !isTablet ? "dashboard-shell--sidebar-closed" : ""
        }`}
      >
        <SidebarNav
          activeId={activeNav}
          items={navigationItems}
          isOpen={sidebarOpen}
          onBoundaryDraw={drawBoundary}
          onSelectionStart={resetParcelSelection}
          onRecordSelect={(parcel) =>
            applyParcelSelection(parcel, {
              statusMessage: `Loaded ${parcel.recordType || "land record"} from sidebar search.`,
            })
          }
          onStatusChange={setSystemMessage}
          onSelect={(id) => {
            setActiveNav(id);
            if (id === "layers") toggleMapPanel("layers");
            if (id === "measurement") handleToolbarAction("measurement");
          }}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          mapReady={mapReady}
          sfActiveTool={sf.activeTool}
          sfIsActive={sf.isActive}
          sfProgress={sf.progress}
          sfRows={sf.rows}
          sfStatusMessage={sf.statusMessage}
          onSfStart={(tool) => {
            if (measurementMode !== null) {
              measurement.clearMeasure();
              setMeasurementMode(null);
            }
            resetParcelSelection();
            sf.startSelect(tool);
          }}
          onSfClear={sf.clearSelection}
        />

        <main className="workspace">
          <MapStage
            mapStatus={isPending ? "Updating selection..." : systemMessage}
            mapReady={mapReady}
            mapRef={containerRef}
            parcel={selectedParcel}
            tableOpen={parcelTableOpen}
            onToggleTable={() => setParcelTableOpen((current) => !current)}
            onCloseTable={() => setParcelTableOpen(false)}
            selectionRows={sf.isActive ? sf.rows : null}
            selectionProgress={sf.isActive ? sf.progress : null}
            mapScale={mapScale}
            onPrint={handleMapPrint}
          >
            <MapToolbar
              activeLayerPanel={activeMapPanel === "layers"}
              activeBasemapPanel={activeMapPanel === "basemap"}
              activeMeasurement={Boolean(measurementMode)}
              onAction={handleToolbarAction}
            />

            <LayerPanel
              isOpen={activeMapPanel === "layers"}
              layerVisibility={layerVisibility}
              onToggleLayer={handleToggleLayer}
              onRefresh={handleRefresh}
              serviceHealth={serviceHealth}
            />

            {activeMapPanel === "basemap" ? (
              <BasemapSwitcher
                activeBasemap={activeBasemap}
                onChange={handleBasemapChange}
              />
            ) : null}

            <MeasurementPanel
              isOpen={measurementMode !== null}
              activeMode={measurementMode === "panel" ? null : measurementMode}
              isDrawing={measurement.isDrawing}
              result={measurement.result}
              onMeasureDistance={() => {
                if (!mapReady) {
                  setSystemMessage("Map is still initializing. Please wait a moment before using measurement tools.");
                  return;
                }
                sf.clearSelection();
                setMeasurementMode("distance");
                measurement.startMeasure("distance");
                setSystemMessage("Click on the map to place points. Double-click to finish the line.");
              }}
              onMeasureArea={() => {
                if (!mapReady) {
                  setSystemMessage("Map is still initializing. Please wait a moment before using measurement tools.");
                  return;
                }
                sf.clearSelection();
                setMeasurementMode("area");
                measurement.startMeasure("area");
                setSystemMessage("Click on the map to place vertices. Double-click to close the polygon.");
              }}
              onClear={() => {
                measurement.clearMeasure();
                setMeasurementMode("panel");
                setSystemMessage("Measurement cleared. Select a tool to draw again.");
              }}
              onClose={() => {
                measurement.clearMeasure();
                setMeasurementMode(null);
                setSystemMessage("Measurement tool closed.");
              }}
            />
          </MapStage>
        </main>
      </div>

      <ParcelDetailsModal
        open={detailsOpen}
        parcel={selectedParcel}
        onClose={() => setDetailsOpen(false)}
      />
      <SaarthiChatbotWidget blurred={detailsOpen} />
    </div>
  );
}

