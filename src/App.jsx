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
import ZoomWheelSlider from "@/components/map/ZoomWheelSlider";
import { navigationItems } from "@/data/portalData";
import { useArcGISMap } from "@/hooks/useArcGISMap";
import { DISTRICT_SUBLAYERS } from "@/config/arcgis";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMeasurement } from "@/hooks/useMeasurement";
import useMandatoryLocationPermission from "@/hooks/useMandatoryLocationPermission";
import { useSelectFeatures } from "@/hooks/useSelectFeatures";
import useDisableDevTools from "@/hooks/useDisableDevTools";
import { useLanguage } from "@/context/LanguageContext";
import {
  getAllTehsils,
  getAllVillages,
  getDistricts,
  resolveAdminBoundarySearchTarget,
  searchAdministrativeAreas,
  toAdminSuggestionItem,
} from "@/services/mapQueryService";
import {
  createEmptyParcelRecord,
  createParcelRecordFromSelection,
} from "@/services/parcelRecordService";
import {
  runPrintViewLifecycle,
  takeMapScreenshotWithRetry,
  waitForMapToSettle,
} from "@/utils/printUtils";
import {
  extractCadastralSelectionFromAnyPayload,
  isLikelyOwnerDetailQuery,
  requestCadastralHindiSearch,
  requestOwnerApiResult,
} from "@/services/ownerSearchService";
import { VOICE_COMMAND_ACTIONS } from "@/voice-addon/voiceCommandRegistry";
import {
  createVoiceAdminHandlers,
} from "@/voice-addon/voiceAdminMatcher";

import { useAnalytics } from "@/services/analyticsService";
import { removeSplash } from "./splash";

const cadastralLayerVisibility = Object.fromEntries(
  DISTRICT_SUBLAYERS.map((entry) => [`cadastral_${entry.id}`, true]),
);

const initialLayers = {
  cadastral: true,
  ...cadastralLayerVisibility,
  nearbyPlaces: false,
  poi: false,
  boundariesGroup: true,
  district:  true,
  tehsil:    true,
  village:   true,
  murrabaGrid: true,
  murabba: true,
  stateBoundary: true,
  assets:    false, // Government Assets (visible: false — user can toggle on)
  nhai:      false, // NHAI Upcoming (hidden by default, matches old project)
  roads:     false, // HR Road Infra  (hidden by default, matches old project)
};

export default function App() {
  const navigate = useNavigate();
  const { trackPageView, trackUserInteraction, trackMapInteraction, trackSearch, trackFeatureUsage } = useAnalytics();

  useMandatoryLocationPermission();

  // Disable developer tools in production
  useDisableDevTools();
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useDashboardPreferences();

  const { lang, t, setLang } = useLanguage();
  const [activeNav, setActiveNav] = useState(navigationItems[0]?.id ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);
  // single active-panel state â€” only one floating panel open at a time
  const [activeMapPanel, setActiveMapPanel] = useState(null); // 'layers' | 'basemap' | null
  const toggleMapPanel = (name) => setActiveMapPanel((p) => (p === name ? null : name));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [parcelTableOpen, setParcelTableOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [forceSearchSuggestionsOpen, setForceSearchSuggestionsOpen] = useState(false);
  const deferredSearch = useDeferredValue(searchValue);
  const [activeBasemap, setActiveBasemap] = useState("satellite");
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

  useEffect(() => {
    // If the map route mounted a splash screen, remove it once the app has painted.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        removeSplash();
      });
    });
  }, []);

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
    setForceSearchSuggestionsOpen(false);
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
    goToLatLong,
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

  // â”€â”€ Select Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sf = useSelectFeatures({ viewRef, layersRef });
  useEffect(() => { sfClearRef.current = sf.clearSelection; }, [sf.clearSelection]);

  // â”€â”€ Measurement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          matches.map((match) => toAdminSuggestionItem(match)),
        );
      })
      .catch(() => {
        if (adminSuggestionRequestIdRef.current === requestId) {
          setAdminSuggestions([]);
        }
      });
  }, [deferredSearch]);

  useEffect(() => {
    if (!mapReady) return undefined;

    let active = true;
    let timeoutId = 0;

    const loadVoiceBoundaryLists = () => {
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
    };

    // Defer heavy voice-dataset fetch until map is painted and interactive.
    timeoutId = window.setTimeout(loadVoiceBoundaryLists, 1200);

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [mapReady]);

  // Draw and zoom to selected administrative boundary from search/voice target.
  const highlightAdminBoundary = async (target, options = {}) => {
    const { exactMatch = true } = options;
    const result = await drawBoundary(target.type, target.codes);

    if (!result.ok) {
      setSystemMessage(result.message);
      return false;
    }

    setSearchValue("");
    setForceSearchSuggestionsOpen(false);
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
      const normalize = (value) =>
        `${value ?? ""}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
          .replace(/\s+/g, " ");
      const normalizedTarget = normalize(boundaryName);
      const typedExact = matches.find(
        (match) =>
          match.type === boundaryType
          && normalize(match.name) === normalizedTarget,
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

  const {
    runDistrictVoiceFocus,
    runTehsilVoiceFocus,
    runVillageVoiceFocus,
    runAdministrativeVoiceFallback,
  } = createVoiceAdminHandlers({
    voiceDistricts,
    voiceTehsils,
    voiceVillages,
    drawBoundary,
    setSearchValue,
    setSystemMessage,
  });

  const openSuggestionsFromVoiceQuery = (rawText) => {
    const value = `${rawText ?? ""}`.trim();
    if (!value) return;

    setSearchValue(value);
    setForceSearchSuggestionsOpen(true);
    setActiveNav("search");
    setSystemMessage(`Multiple matches found for "${value}". Please select one from suggestions.`);
    window.setTimeout(() => {
      document.getElementById("portal-search")?.focus();
    }, 30);
  };

  const resolveHindiLandRecordFromBackend = async (queryText) => {
    const ownerLookup = await requestOwnerApiResult(queryText);
    if (ownerLookup?.ok) {
      const ownerSelection = extractCadastralSelectionFromAnyPayload(ownerLookup.payload, queryText);
      if (ownerSelection) {
        const openResult = await openCadastralFromChatbot(ownerSelection);
        return {
          ok: Boolean(openResult?.ok),
          error: openResult?.message || "",
          handled: true,
        };
      }
    } else if (ownerLookup?.status === 401) {
      return {
        ok: false,
        error: ownerLookup.error || "Session expired. Please login again.",
        handled: true,
      };
    }

    const cadastralLookup = await requestCadastralHindiSearch(queryText);
    if (!cadastralLookup?.ok) {
      const missing = Array.isArray(cadastralLookup?.payload?.missingFields)
        ? cadastralLookup.payload.missingFields
        : [];
      if (missing.length) {
        return {
          ok: false,
          error: `कृपया पूरा विवरण दें। छूटे हुए फ़ील्ड: ${missing.join(", ")}`,
          handled: true,
        };
      }
      return {
        ok: false,
        error: cadastralLookup?.error || "Hindi cadastral query could not be resolved.",
        handled: Boolean(cadastralLookup?.status === 401),
      };
    }

    const selection = extractCadastralSelectionFromAnyPayload(cadastralLookup.payload, queryText);
    if (!selection?.codes?.district || !selection?.codes?.tehsil || !selection?.codes?.village) {
      return {
        ok: false,
        error: "Hindi cadastral query response is incomplete.",
        handled: false,
      };
    }

    const openResult = await openCadastralFromChatbot(selection);
    return {
      ok: Boolean(openResult?.ok),
      error: openResult?.message || "",
      handled: true,
    };
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    setForceSearchSuggestionsOpen(false);

    const query = searchValue.trim();
    const normalized = query.toLowerCase();

    if (!normalized) {
      setSystemMessage("Enter a Khasra number, owner, village or place to search.");
      return;
    }

    if (isLikelyOwnerDetailQuery(query)) {
      try {
        const hindiResult = await resolveHindiLandRecordFromBackend(query);
        if (hindiResult?.ok) {
          return;
        }
        if (hindiResult?.handled && hindiResult?.error) {
          setSystemMessage(hindiResult.error);
          return;
        }
      } catch {
        // Continue to regular search fallbacks.
      }
    }

    // Track search submission
    trackUserInteraction('search_submit', query);

    try {
      const adminSearchResult = await resolveAdminBoundarySearchTarget(query, { limit: 10 });

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
    setForceSearchSuggestionsOpen(false);

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

  const normalizeAdminName = (value) => (
    `${value ?? ""}`
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ")
  );

  const resolveCadastralCodesFromNames = async ({ districtName, tehsilName, villageName }) => {
    const districtText = `${districtName ?? ""}`.trim();
    const tehsilText = `${tehsilName ?? ""}`.trim();
    const villageText = `${villageName ?? ""}`.trim();
    if (!districtText || !tehsilText || !villageText) return null;

    const query = `${villageText} ${tehsilText} ${districtText}`.trim();
    const matches = await searchAdministrativeAreas(query, { limit: 60 });
    if (!Array.isArray(matches) || !matches.length) return null;

    const nd = normalizeAdminName(districtText);
    const nt = normalizeAdminName(tehsilText);
    const nv = normalizeAdminName(villageText);

    const districtMatch = matches.find((item) => (
      item?.type === "district" && normalizeAdminName(item?.name) === nd
    ));
    const tehsilMatch = matches.find((item) => (
      item?.type === "tehsil"
      && normalizeAdminName(item?.name) === nt
      && (!districtMatch?.dCode || `${item?.dCode ?? ""}`.trim() === `${districtMatch?.dCode ?? ""}`.trim())
    ));
    const villageMatch = matches.find((item) => (
      item?.type === "village"
      && normalizeAdminName(item?.name) === nv
      && (!districtMatch?.dCode || `${item?.dCode ?? ""}`.trim() === `${districtMatch?.dCode ?? ""}`.trim())
      && (!tehsilMatch?.tCode || `${item?.tCode ?? ""}`.trim() === `${tehsilMatch?.tCode ?? ""}`.trim())
    ));

    const districtCode = `${villageMatch?.dCode ?? tehsilMatch?.dCode ?? districtMatch?.dCode ?? ""}`.trim();
    const tehsilCode = `${villageMatch?.tCode ?? tehsilMatch?.tCode ?? ""}`.trim();
    const villageCode = `${villageMatch?.vCode ?? ""}`.trim();

    if (!districtCode || !tehsilCode || !villageCode) return null;
    return { district: districtCode, tehsil: tehsilCode, village: villageCode };
  };

  const openCadastralFromChatbot = async (payload = {}) => {
    const codes = payload?.codes ?? {};
    const names = payload?.names ?? {};

    let district = `${codes.district ?? ""}`.trim();
    let tehsil = `${codes.tehsil ?? ""}`.trim();
    let village = `${codes.village ?? ""}`.trim();
    const murabba = `${codes.murabba ?? ""}`.trim();
    const khasra = `${codes.khasra ?? ""}`.trim();

    if (!district || !tehsil || !village) {
      try {
        const resolvedCodes = await resolveCadastralCodesFromNames({
          districtName: `${names.district ?? ""}`.trim(),
          tehsilName: `${names.tehsil ?? ""}`.trim(),
          villageName: `${names.village ?? ""}`.trim(),
        });
        if (resolvedCodes) {
          district = resolvedCodes.district;
          tehsil = resolvedCodes.tehsil;
          village = resolvedCodes.village;
        }
      } catch {
        // Continue to user-facing error below when code resolution fails.
      }
      if (!district || !tehsil || !village) {
        const message =
          "Could not open cadastral parcel from query result. Please include district, tehsil and village in query.";
        setSystemMessage(message);
        return { ok: false, message };
      }
    }

    try {
      setSystemMessage("Opening cadastral parcel from chatbot result...");
      setLayerVisibility((current) => ({ ...current, cadastral: true }));

      if (!murabba || !khasra) {
        const boundaryResult = await drawBoundary(
          "village",
          { dCode: district, tCode: tehsil, vCode: village },
          { expandFactor: 1.2 },
        );
        const message = boundaryResult?.ok
          ? "Village boundary opened from chatbot result. Add murabba and khasra to open exact parcel."
          : "Village boundary could not be opened from chatbot result.";
        setSystemMessage(message);
        return { ok: Boolean(boundaryResult?.ok), message };
      }

      const parcel = await createParcelRecordFromSelection({
        sectionId: "khasra",
        codes: {
          district,
          tehsil,
          village,
          murabba,
          khasra,
        },
        names: {
          district: `${names.district ?? ""}`.trim() || district,
          tehsil: `${names.tehsil ?? ""}`.trim() || tehsil,
          village: `${names.village ?? ""}`.trim() || village,
          murabba: `${names.murabba ?? ""}`.trim() || murabba,
          khasra: `${names.khasra ?? ""}`.trim() || khasra,
        },
      });

      // Some HSAC responses can resolve record fields without parcel geometry.
      // In that case, still zoom user to village boundary instead of staying at state view.
      if (!parcel?.geometry) {
        await drawBoundary(
          "village",
          { dCode: district, tCode: tehsil, vCode: village },
          { expandFactor: 1.2 },
        );
      }

      applyParcelSelection(parcel, {
        openTable: true,
        statusMessage: `Loaded Khasra ${parcel.khasraNo} from chatbot owner result.`,
      });
      return { ok: true, message: lang === "hi" ? "कैडस्ट्रल पार्सल मैप पर खोल दिया गया है।" : "Opened cadastral parcel on map." };
    } catch (error) {
      const message = error?.message || "Failed to open cadastral parcel from chatbot result.";
      setSystemMessage(message);
      return { ok: false, message };
    }
  };

  useEffect(() => {
    const onOpenFromChatbot = async (event) => {
      const requestPayload = event?.detail || {};
      const requestSource = `${requestPayload?.__requestSource ?? ""}`.trim().toLowerCase();
      const requestId = `${requestPayload?.__requestId ?? ""}`.trim();
      const result = await openCadastralFromChatbot(requestPayload);
      window.dispatchEvent(
        new CustomEvent("eodb-chatbot-cadastral-open-result", {
          detail: {
            ...(result || { ok: false, message: "Could not open cadastral parcel on map." }),
            source: requestSource || "unknown",
            requestId,
          },
        }),
      );
    };

    window.addEventListener("eodb-chatbot-open-cadastral", onOpenFromChatbot);
    return () => {
      window.removeEventListener("eodb-chatbot-open-cadastral", onOpenFromChatbot);
    };
  }, [openCadastralFromChatbot]);

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
      if (!result.ok) {
        window.alert(result.message);
      }
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

  const handleFindLatLong = async ({ latitude, longitude }) => {
    const result = await goToLatLong({ latitude, longitude });
    if (!result.ok) {
      return result;
    }

    setActiveMapPanel(null);
    setSystemMessage(result.message);
    return result;
  };

    const handleToggleLayer = (layerKey) => {
    setLayerVisibility((current) => {
      if (layerKey === "nearbyPlaces") {
        const nextValue = !current.nearbyPlaces;
        return {
          ...current,
          nearbyPlaces: nextValue,
          poi: nextValue,
        };
      }

      if (layerKey === "boundariesGroup") {
        const nextValue = !current.boundariesGroup;
        return {
          ...current,
          boundariesGroup: nextValue,
          district: nextValue,
          tehsil: nextValue,
          village: nextValue,
        };
      }

      if (layerKey === "murrabaGrid") {
        const nextValue = !current.murrabaGrid;
        return {
          ...current,
          murrabaGrid: nextValue,
          murabba: nextValue,
        };
      }

      if (layerKey === "cadastral") {
        const nextValue = !current.cadastral;
        const next = { ...current, cadastral: nextValue };
        DISTRICT_SUBLAYERS.forEach((entry) => {
          next[`cadastral_${entry.id}`] = nextValue;
        });
        return next;
      }

      const next = {
        ...current,
        [layerKey]: !current[layerKey],
      };

      if (layerKey === "poi" && next.poi) {
        next.nearbyPlaces = true;
      }
      if (layerKey === "district" || layerKey === "tehsil" || layerKey === "village") {
        next.boundariesGroup = Boolean(next.district || next.tehsil || next.village);
      }
      if (layerKey === "murabba" && next.murabba) {
        next.murrabaGrid = true;
      }
      if (layerKey.startsWith("cadastral_")) {
        next.cadastral = DISTRICT_SUBLAYERS.some((entry) => next[`cadastral_${entry.id}`]);
      }

      return next;
    });
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

      // Keep group toggles consistent so voice "district/tehsil/village on"
      // actually becomes visible even if the parent group was off.
      const touchesBoundaries =
        Object.prototype.hasOwnProperty.call(layerPatch, "district")
        || Object.prototype.hasOwnProperty.call(layerPatch, "tehsil")
        || Object.prototype.hasOwnProperty.call(layerPatch, "village");
      if (touchesBoundaries) {
        const anyBoundaryOn = Boolean(next.district || next.tehsil || next.village);
        next.boundariesGroup = anyBoundaryOn;
      }

      const touchesMurabba = Object.prototype.hasOwnProperty.call(layerPatch, "murabba");
      if (touchesMurabba && next.murabba) {
        next.murrabaGrid = true;
      }

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
    await runPrintViewLifecycle({ zoomForPrint, restoreExtentAfterPrint });
  };

  const handleMapWhatsAppShare = async () => {
    const view = viewRef.current;
    if (!view) {
      console.warn("Map screenshot skipped: map view not ready");
      return null;
    }

    const savedExtent = await zoomForPrint();
    // Same tile-settle delay as print
    await new Promise((resolve) => setTimeout(resolve, 1400));
    let mapDataUrl = null;
    try {
      await waitForMapToSettle(view);
      mapDataUrl = await takeMapScreenshotWithRetry(view);
    } catch (err) {
      console.warn("Map screenshot for WhatsApp failed:", err.message);
    }
    await restoreExtentAfterPrint(savedExtent);
    return mapDataUrl;
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
    [VOICE_COMMAND_ACTIONS.HANDLE_FALLBACK_TRANSCRIPT]: async ({ transcript, normalizedTranscript }) => {
      const rawText = `${transcript ?? ""}`.trim();
      const normalizedText = `${normalizedTranscript ?? transcript ?? ""}`.toLowerCase();
      const tokens = normalizedText.split(/\s+/).filter(Boolean);
      const explicitIntentWords = [
        "district", "tehsil", "village", "gaon", "gram",
        "जिला", "तहसील", "गांव", "गाँव", "ग्राम",
        "map", "boundary", "dikhao", "zoom",
      ];
      const hasExplicitIntent = explicitIntentWords.some((word) => normalizedText.includes(word));
      const shouldPreferSuggestion = rawText.length >= 2 && tokens.length <= 3 && !hasExplicitIntent;

      if (shouldPreferSuggestion) {
        openSuggestionsFromVoiceQuery(rawText);
        return {
          ok: true,
          pendingSelection: true,
          message: `Suggestions shown for "${rawText}". Please select one.`,
        };
      }

      const outcome = await runAdministrativeVoiceFallback({ transcript, normalizedTranscript });
      if (outcome?.ok) {
        return outcome;
      }

      if (rawText.length >= 2) {
        openSuggestionsFromVoiceQuery(rawText);
        return {
          ok: true,
          pendingSelection: true,
          message: `Suggestions shown for "${rawText}". Please select one.`,
        };
      }

      return { ok: false };
    },
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
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("isAdmin");
          navigate("/login");
        }}
        searchValue={searchValue}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setForceSearchSuggestionsOpen(false);
        }}
        onSearchSubmit={handleSearchSubmit}
        searchSuggestions={searchSuggestions}
        forceSearchSuggestionsOpen={forceSearchSuggestionsOpen}
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
          onFindLatLong={handleFindLatLong}
          onRecordSelect={(parcel) =>
            applyParcelSelection(parcel, {
              statusMessage: `Loaded ${parcel.recordType || "land record"} from sidebar search.`,
            })
          }
          onStatusChange={setSystemMessage}
          onSelect={(id) => {
            setActiveNav(id);
            if (id === "layers") {
              handleToolbarAction("layers");
              return;
            }
            if (id === "measurement") {
              handleToolbarAction("measurement");
            }
          }}
          mapReady={mapReady}
          layersPanelActive={activeMapPanel === "layers"}
          measurementActive={measurementMode !== null}
          sfActiveTool={sf.activeTool}
          sfIsActive={sf.isActive}
          sfProgress={sf.progress}
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
            onWhatsAppShare={handleMapWhatsAppShare}
          >
            <ZoomWheelSlider viewRef={viewRef} layerVisibility={layerVisibility} mapScale={mapScale} />

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
      <SaarthiChatbotWidget
        lang={lang}
        blurred={detailsOpen}
        hidden={isTablet && sidebarOpen}
      />
    </div>
  );
}



