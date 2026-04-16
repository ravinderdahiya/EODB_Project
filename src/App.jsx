import { useEffect, useState, useTransition, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BasemapSwitcher from "@/components/BasemapSwitcher";
import LandRecordPanel from "@/components/LandRecordPanel";
import LayerPanel from "@/components/LayerPanel";
import MapStage from "@/components/MapStage";
import MapToolbar from "@/components/MapToolbar";
import ParcelDetailsModal from "@/components/ParcelDetailsModal";
import SidebarNav from "@/components/SidebarNav";
import { languageOptions, mockParcels, navigationItems } from "@/data/portalData";
import { useArcGISMap } from "@/hooks/useArcGISMap";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const THEME_STORAGE_KEY = "dlr-dashboard-theme";
const GLASS_STORAGE_KEY = "dlr-dashboard-glass";

const initialLayers = {
  cadastral: true,
  district:  true,
  tehsil:    true,
  village:   true,
  assets:    false, // Government Assets (visible: false — user can toggle on)
  nhai:      false, // NHAI Upcoming (hidden by default, matches old project)
  roads:     false, // HR Road Infra  (hidden by default, matches old project)
};

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialGlassMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(GLASS_STORAGE_KEY) === "on";
}

function downloadParcel(parcel) {
  const safePayload = {
    ...parcel,
    geometry: parcel.geometry?.toJSON ? parcel.geometry.toJSON() : parcel.geometry,
  };

  const blob = new Blob([JSON.stringify(safePayload, null, 2)], {
    type: "application/json",
  });

  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${parcel.registryRef}.json`;
  link.click();
  URL.revokeObjectURL(href);
}

export default function App() {
  const navigate = useNavigate();
  const isTablet = useMediaQuery("(max-width: 1180px)");
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [isPending, startTransition] = useTransition();

  const [activeNav, setActiveNav] = useState(navigationItems[0]?.id ?? "");
  const [theme, setTheme] = useState(getInitialTheme);
  const [glassMode, setGlassMode] = useState(getInitialGlassMode);
  const [language, setLanguage] = useState(languageOptions[0]);
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);
  // single active-panel state — only one floating panel open at a time
  const [activeMapPanel, setActiveMapPanel] = useState(null); // 'layers' | 'basemap' | null
  const toggleMapPanel = (name) => setActiveMapPanel((p) => (p === name ? null : name));
  const [recordPanelOpen, setRecordPanelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const [activeBasemap, setActiveBasemap] = useState("cadastral");
  const [layerVisibility, setLayerVisibility] = useState(initialLayers);
  const [selectedParcel, setSelectedParcel] = useState(mockParcels[0]);
  const [systemMessage, setSystemMessage] = useState(
    "ArcGIS map is active with highlighted Haryana state and district boundaries.",
  );
  const [measurementMode, setMeasurementMode] = useState(null);

  const searchSuggestions =
    deferredSearch.trim().length < 2
      ? []
      : mockParcels
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
          .slice(0, 5);

  const districtOptions = [
    ...new Set([selectedParcel.district, ...mockParcels.map((parcel) => parcel.district)]),
  ];
  const tehsilOptions = [
    ...new Set(
      [
        selectedParcel.tehsil,
        ...mockParcels
          .filter((parcel) => parcel.district === selectedParcel.district)
          .map((parcel) => parcel.tehsil),
      ],
    ),
  ];
  const {
    containerRef,
    mapStatus,
    serviceHealth,
    zoomIn,
    zoomOut,
    resetView,
    refreshOperationalLayers,
    goToCurrentLocation,
    searchPlace,
    openSelectedParcel,
    drawBoundary,
  } = useArcGISMap({
    activeBasemap,
    layerVisibility,
    selectedParcel,
    onParcelSelect: (parcel) => {
      startTransition(() => {
        setSelectedParcel(parcel);
        setActiveNav("search");
      });
      setRecordPanelOpen(true);
      setSystemMessage(
        `Khasra ${parcel.khasraNo} highlighted on the ESRI map.`,
      );
    },
  });

  useEffect(() => {
    if (isTablet) {
      setSidebarOpen(false);
    }
  }, [isTablet]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.glass = glassMode ? "on" : "off";
    window.localStorage.setItem(GLASS_STORAGE_KEY, glassMode ? "on" : "off");
  }, [glassMode]);

  useEffect(() => {
    if (isMobile) setActiveMapPanel(null);
  }, [isMobile]);

  useEffect(() => {
    setSystemMessage(mapStatus);
  }, [mapStatus]);

  const selectParcel = (parcel) => {
    startTransition(() => {
      setSelectedParcel(parcel);
      setActiveNav("search");
    });

    setRecordPanelOpen(true);
    setSearchValue("");
    setSystemMessage(`Loaded parcel Khasra ${parcel.khasraNo} for ${parcel.ownerName}.`);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const normalized = searchValue.trim().toLowerCase();

    if (!normalized) {
      setSystemMessage("Enter a Khasra number, owner, village or place to search.");
      return;
    }

    const parcelMatch = mockParcels.find((parcel) =>
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
      selectParcel(parcelMatch);
      return;
    }

    const result = await searchPlace(searchValue.trim());
    setSystemMessage(result.message);
  };

  const handleBasemapChange = (nextPreset) => {
    setActiveBasemap(nextPreset);

    if (nextPreset === "cadastral") {
      setLayerVisibility((current) => ({ ...current, cadastral: true }));
    } else {
      setLayerVisibility((current) => ({ ...current, cadastral: false }));
    }

    setSystemMessage(`${nextPreset[0].toUpperCase()}${nextPreset.slice(1)} map preset applied.`);
  };

  const handleToolbarAction = async (actionId) => {
    if (actionId === "search") {
      document.getElementById("portal-search")?.focus();
      setSystemMessage("Search bar focused for parcel or place lookup.");
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

    if (actionId === "layers") { toggleMapPanel("layers"); return; }
    if (actionId === "basemap") { toggleMapPanel("basemap"); return; }

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
      setActiveMapPanel(null);
      setMeasurementMode((current) => {
        if (current === null) {
          setSystemMessage("Distance measurement workflow is staged for ArcGIS widget hookup.");
          return "Distance";
        }

        if (current === "Distance") {
          setSystemMessage("Area measurement workflow is staged for ArcGIS widget hookup.");
          return "Area";
        }

        setSystemMessage("Measurement workflow cleared.");
        return null;
      });
    }
  };

  const openManualRecord = async () => {
    setRecordPanelOpen(true);
    const result = await openSelectedParcel();

    if (result?.message) {
      setSystemMessage(result.message);
    }
  };

  const handleToggleLayer = (layerKey) => {
    setLayerVisibility((current) => ({
      ...current,
      [layerKey]: !current[layerKey],
    }));
  };

  const handleRefresh = () => {
    const result = refreshOperationalLayers();
    setSystemMessage(result.message);
  };

  const handleDistrictChange = (district) => {
    const nextParcel = mockParcels.find((parcel) => parcel.district === district);

    if (nextParcel) {
      selectParcel(nextParcel);
    }
  };

  const handleTehsilChange = (tehsil) => {
    const nextParcel = mockParcels.find(
      (parcel) =>
        parcel.district === selectedParcel.district && parcel.tehsil === tehsil,
    );

    if (nextParcel) {
      selectParcel(nextParcel);
    }
  };

  const handleShare = async () => {
    const shareText = `${selectedParcel.registryRef} • Khasra ${selectedParcel.khasraNo} • ${selectedParcel.ownerName}`;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setSystemMessage("Parcel summary copied to the clipboard.");
      return;
    }

    setSystemMessage("Clipboard access is unavailable in this browser.");
  };

  return (
    <div className="app-shell">
      <AppHeader
        language={language}
        languages={languageOptions}
        searchPlaceholder={selectedParcel.breadcrumb}
        sidebarOpen={sidebarOpen}
        glassMode={glassMode}
        theme={theme}
        onToggleGlass={() => setGlassMode((current) => !current)}
        onLanguageChange={setLanguage}
        onSidebarToggle={() => setSidebarOpen((current) => !current)}
        onToggleTheme={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
        onLogout={() => navigate("/login")}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearchSubmit={handleSearchSubmit}
        searchSuggestions={searchSuggestions}
        onSuggestionSelect={selectParcel}
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
          parcels={mockParcels}
          onManualRecord={openManualRecord}
          onBoundaryDraw={drawBoundary}
          onSelect={(id) => {
            setActiveNav(id);
            if (id === "layers") setActiveMapPanel("layers");
          }}
        />

        <main className="workspace">
          <MapStage
            mapStatus={isPending ? "Updating selection..." : systemMessage}
            mapRef={containerRef}
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

            <LandRecordPanel
              isOpen={recordPanelOpen}
              parcel={selectedParcel}
              districtOptions={districtOptions}
              tehsilOptions={tehsilOptions}
              onClose={() => setRecordPanelOpen(false)}
              onToggle={() => setRecordPanelOpen((current) => !current)}
              onDistrictChange={handleDistrictChange}
              onTehsilChange={handleTehsilChange}
              onViewFullDetails={() => setDetailsOpen(true)}
              onPrint={() => window.print()}
              onShare={handleShare}
              onDownload={() => downloadParcel(selectedParcel)}
            />

          </MapStage>
        </main>
      </div>

      <ParcelDetailsModal
        open={detailsOpen}
        parcel={selectedParcel}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}
