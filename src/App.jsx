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
import SaarthiChatbotWidget from "@/components-addon/SaarthiChatbotWidget";
import VoiceAssistantPopup from "@/components-addon/VoiceAssistantPopup";
import { navigationItems } from "@/data/portalData";
import { useArcGISMap } from "@/hooks/useArcGISMap";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMeasurement } from "@/hooks/useMeasurement";
import { useSelectFeatures } from "@/hooks/useSelectFeatures";
import useDisableDevTools from "@/hooks/useDisableDevTools";
import { useLanguage } from "@/context/LanguageContext";
import { searchAdministrativeAreas } from "@/services/mapQueryService";
import { createEmptyParcelRecord } from "@/services/parcelRecordService";
import { triggerPrint } from "@/utils/printUtils";
import { VOICE_COMMAND_ACTIONS } from "@/voice-addon/voiceCommandRegistry";

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
  const hasSelectedParcel = selectedParcel.registryRef !== "DLR-UNAVAILABLE";
  const adminSuggestionRequestIdRef = useRef(0);

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

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const query = searchValue.trim();
    const normalized = query.toLowerCase();

    if (!normalized) {
      setSystemMessage("Enter a Khasra number, owner, village or place to search.");
      return;
    }

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
        onLogout={() => navigate("/login")}
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
