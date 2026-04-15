import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import Graphic from "@arcgis/core/Graphic.js";
import Map from "@arcgis/core/Map.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import MapView from "@arcgis/core/views/MapView.js";
import * as locator from "@arcgis/core/rest/locator.js";
import { arcgisPortalConfig, basemapPresets } from "@/config/arcgis";

function normalizeParcelGeometry(parcelGeometry) {
  if (!parcelGeometry) {
    return null;
  }

  if (parcelGeometry.clone) {
    return parcelGeometry.clone();
  }

  if (parcelGeometry.rings) {
    return new Polygon(parcelGeometry);
  }

  if (Array.isArray(parcelGeometry)) {
    return new Polygon({
      rings: [parcelGeometry],
      spatialReference: { wkid: 4326 },
    });
  }

  return null;
}

function createParcelGraphic(parcel) {
  const polygon = normalizeParcelGeometry(parcel.geometry);

  if (!polygon) {
    return null;
  }

  return new Graphic({
    geometry: polygon,
    attributes: {
      khasraNo: parcel.khasraNo,
      ownerName: parcel.ownerName,
    },
    symbol: {
      type: "simple-fill",
      color: [244, 168, 34, 0.16],
      outline: {
        color: [237, 154, 29, 0.94],
        width: 2.6,
      },
    },
    popupTemplate: {
      title: `Khasra ${parcel.khasraNo}`,
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "ownerName", label: "Owner Name" },
            { fieldName: "khasraNo", label: "Khasra No." },
          ],
        },
      ],
    },
  });
}

function createLocationGraphic(point, title) {
  return new Graphic({
    geometry: point,
    attributes: { title },
    symbol: {
      type: "simple-marker",
      style: "circle",
      color: [28, 112, 189, 0.9],
      size: 11,
      outline: {
        color: [255, 255, 255, 1],
        width: 2,
      },
    },
    popupTemplate: {
      title,
      content: "Location centered from ArcGIS geolocation workflow.",
    },
  });
}

function hasBoundaryOverlayEnabled(layerVisibility) {
  return layerVisibility.district || layerVisibility.tehsil || layerVisibility.village;
}

function resolveBasemapId(activeBasemap) {
  if (activeBasemap === "cadastral") {
    return basemapPresets.cadastral.basemapId;
  }

  return basemapPresets[activeBasemap].basemapId;
}

export function useArcGISMap({
  activeBasemap,
  layerVisibility,
  selectedParcel,
  onParcelSelect,
}) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const defaultExtentRef = useRef(null);
  const layersRef = useRef({});
  const onParcelSelectRef = useRef(onParcelSelect);
  const selectedParcelRef = useRef(selectedParcel);

  const [mapReady, setMapReady] = useState(false);
  const [mapStatus, setMapStatus] = useState("Initializing ESRI-only Haryana map workspace...");
  const [serviceHealth, setServiceHealth] = useState({
    cadastral: "degraded",
    boundaries: "loading",
    assets: "degraded",
  });

  useEffect(() => {
    onParcelSelectRef.current = onParcelSelect;
  }, [onParcelSelect]);

  useEffect(() => {
    selectedParcelRef.current = selectedParcel;
  }, [selectedParcel]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    esriConfig.assetsPath = "/assets";

    if (import.meta.env.VITE_ARCGIS_API_KEY) {
      esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
    }

    const defaultExtent = new Extent(arcgisPortalConfig.defaultExtent);
    defaultExtentRef.current = defaultExtent;

    const map = new Map({
      basemap: resolveBasemapId(activeBasemap),
    });

    const boundariesVisible = hasBoundaryOverlayEnabled(layerVisibility);

    const districtBoundaryLayer = new FeatureLayer({
      url: arcgisPortalConfig.serviceUrls.haryanaDistricts,
      title: "Haryana District Boundaries",
      definitionExpression: "state = 'Haryana'",
      outFields: ["district", "state"],
      visible: boundariesVisible,
      labelsVisible: layerVisibility.district && boundariesVisible,
      legendEnabled: false,
      popupEnabled: false,
      labelingInfo: [
        {
          labelExpressionInfo: {
            expression: "$feature.district",
          },
          symbol: {
            type: "text",
            color: [27, 64, 42, 0.95],
            haloColor: [255, 255, 255, 0.92],
            haloSize: 1.4,
            font: {
              size: 10,
              weight: "600",
              family: "Avenir Next",
            },
          },
        },
      ],
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: [0, 0, 0, 0],
          outline: {
            color: [38, 103, 65, 0.7],
            width: 1.1,
          },
        },
      },
    });

    const stateBoundaryLayer = new FeatureLayer({
      url: arcgisPortalConfig.serviceUrls.haryanaBoundary,
      title: "Haryana Boundary",
      outFields: ["NAME_1"],
      visible: boundariesVisible,
      legendEnabled: false,
      popupEnabled: false,
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: [0, 0, 0, 0],
          outline: {
            color: [18, 84, 45, 1],
            width: 2.8,
          },
        },
      },
    });

    const highlightLayer = new GraphicsLayer({
      title: "Selected parcel",
      listMode: "hide",
      visible: layerVisibility.cadastral,
    });

    const locationLayer = new GraphicsLayer({
      title: "Location search",
      listMode: "hide",
    });

    map.addMany([districtBoundaryLayer, stateBoundaryLayer, locationLayer, highlightLayer]);

    const view = new MapView({
      container: containerRef.current,
      map,
      extent: defaultExtent.clone(),
      constraints: {
        minZoom: 7,
        maxZoom: 19,
      },
      navigation: {
        mouseWheelZoomEnabled: true,
        browserTouchPanEnabled: true,
      },
      popup: {
        dockEnabled: false,
        collapseEnabled: true,
      },
    });

    view.ui.components = [];

    const updateHealth = (key, value) => {
      setServiceHealth((current) => ({
        ...current,
        [key]: value,
      }));
    };

    view.when(() => {
      viewRef.current = view;
      layersRef.current = {
        map,
        districtBoundaryLayer,
        stateBoundaryLayer,
        highlightLayer,
        locationLayer,
      };
      setMapReady(true);
      setMapStatus(
        "ArcGIS map is live with highlighted Haryana state and district boundaries.",
      );
    });

    Promise.all([districtBoundaryLayer.load(), stateBoundaryLayer.load()]).then(
      () => updateHealth("boundaries", "connected"),
      () => updateHealth("boundaries", "degraded"),
    );

    const clickHandle = view.on("click", async (event) => {
      const response = await view
        .hitTest(event, {
          include: [highlightLayer],
        })
        .catch(() => null);

      const highlightedParcel = response?.results?.find(
        (result) => result.graphic?.layer === highlightLayer,
      );

      if (highlightedParcel && selectedParcelRef.current) {
        onParcelSelectRef.current?.(selectedParcelRef.current);
        setMapStatus(
          `Land record ${selectedParcelRef.current.khasraNo} is already focused on the ESRI map.`,
        );
        return;
      }

      setMapStatus(
        "ESRI-only map mode is active. Use search or district/tehsil filters to focus a land record.",
      );
    });

    return () => {
      layersRef.current = {};
      viewRef.current = null;
      setMapReady(false);
      clickHandle.remove();
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const layers = layersRef.current;

    if (!layers.map) {
      return;
    }

    const boundariesVisible = hasBoundaryOverlayEnabled(layerVisibility);

    layers.map.basemap = resolveBasemapId(activeBasemap);
    layers.stateBoundaryLayer.visible = boundariesVisible;
    layers.districtBoundaryLayer.visible = boundariesVisible;
    layers.districtBoundaryLayer.labelsVisible = layerVisibility.district && boundariesVisible;
    layers.highlightLayer.visible = layerVisibility.cadastral;
  }, [activeBasemap, layerVisibility]);

  useEffect(() => {
    if (!selectedParcel || !layersRef.current.highlightLayer || !viewRef.current) {
      return;
    }

    const graphic = createParcelGraphic(selectedParcel);

    if (!graphic) {
      return;
    }

    const polygon = graphic.geometry;

    layersRef.current.highlightLayer.removeAll();
    layersRef.current.highlightLayer.add(graphic);

    viewRef.current
      .goTo(
        {
          target: polygon.extent.expand(7),
        },
        {
          duration: 950,
          easing: "ease-in-out",
        },
      )
      .catch(() => undefined);
  }, [selectedParcel]);

  const zoomIn = async () => {
    if (!viewRef.current) {
      return { ok: false, message: "Map is still loading." };
    }

    await viewRef.current.goTo({ zoom: viewRef.current.zoom + 1 });

    return { ok: true, message: "Zoomed in to parcel view." };
  };

  const zoomOut = async () => {
    if (!viewRef.current) {
      return { ok: false, message: "Map is still loading." };
    }

    await viewRef.current.goTo({ zoom: viewRef.current.zoom - 1 });

    return { ok: true, message: "Zoomed out for regional context." };
  };

  const resetView = async () => {
    if (!viewRef.current || !defaultExtentRef.current) {
      return { ok: false, message: "Default Haryana extent is not available yet." };
    }

    await viewRef.current.goTo(defaultExtentRef.current.clone(), {
      duration: 900,
      easing: "ease-in-out",
    });

    return { ok: true, message: "Map reset to the default Haryana land record extent." };
  };

  const refreshOperationalLayers = () => {
    const layers = layersRef.current;

    if (!layers.map) {
      return {
        ok: false,
        message: "Map is still loading.",
      };
    }

    layers.map.basemap = resolveBasemapId(activeBasemap);
    [layers.stateBoundaryLayer, layers.districtBoundaryLayer].forEach((layer) => {
      if (layer?.refresh) {
        layer.refresh();
      }
    });

    return {
      ok: true,
      message: "Map and Haryana boundary overlays refreshed for the current view.",
    };
  };

  const goToCurrentLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation || !viewRef.current) {
        resolve({
          ok: false,
          message: "Browser geolocation is not available in this environment.",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const point = new Point({
            longitude: coords.longitude,
            latitude: coords.latitude,
          });

          layersRef.current.locationLayer.removeAll();
          layersRef.current.locationLayer.add(
            createLocationGraphic(point, "Current Location"),
          );

          await viewRef.current.goTo(
            {
              target: point,
              zoom: 14,
            },
            {
              duration: 950,
              easing: "ease-in-out",
            },
          );

          resolve({
            ok: true,
            message: "Current location loaded and centered on the map.",
          });
        },
        () => {
          resolve({
            ok: false,
            message: "Location permission was denied, so the map stayed on Haryana extent.",
          });
        },
      );
    });

  const searchPlace = async (term) => {
    if (!viewRef.current) {
      return { ok: false, message: "Map is still loading." };
    }

    if (!import.meta.env.VITE_ARCGIS_API_KEY) {
      return {
        ok: false,
        requiresKey: true,
        message:
          "Add VITE_ARCGIS_API_KEY to enable ArcGIS place geocoding from the global search bar.",
      };
    }

    try {
      const [candidate] = await locator.addressToLocations(
        arcgisPortalConfig.serviceUrls.geocoder,
        {
          address: { SingleLine: term },
          maxLocations: 1,
          outFields: ["PlaceName", "Addr_type"],
        },
      );

      if (!candidate) {
        return {
          ok: false,
          message: `No ArcGIS geocoding result was found for "${term}".`,
        };
      }

      layersRef.current.locationLayer.removeAll();
      layersRef.current.locationLayer.add(
        createLocationGraphic(candidate.location, candidate.attributes.PlaceName || term),
      );

      await viewRef.current.goTo(
        {
          target: candidate.location,
          zoom: 14,
        },
        {
          duration: 950,
          easing: "ease-in-out",
        },
      );

      return {
        ok: true,
        message: `ArcGIS geocoding centered on ${candidate.attributes.PlaceName || term}.`,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error?.message || "ArcGIS geocoding could not complete the place search request.",
      };
    }
  };

  const openSelectedParcel = async () => {
    if (!selectedParcel || !viewRef.current) {
      return { ok: false, message: "Select a land parcel first." };
    }

    const geometry = normalizeParcelGeometry(selectedParcel.geometry);

    if (!geometry) {
      return {
        ok: false,
        message: "Current record does not have parcel geometry to highlight.",
      };
    }

    layersRef.current.highlightLayer.removeAll();
    layersRef.current.highlightLayer.add(
      new Graphic({
        geometry,
        symbol: {
          type: "simple-fill",
          color: [244, 168, 34, 0.16],
          outline: {
            color: [237, 154, 29, 0.94],
            width: 2.6,
          },
        },
      }),
    );

    await viewRef.current.goTo(
      {
        target: geometry.extent.expand(5),
      },
      {
        duration: 850,
        easing: "ease-in-out",
      },
    );

    return {
      ok: true,
      message: `Land record opened for Khasra ${selectedParcel.khasraNo}.`,
    };
  };

  return {
    containerRef,
    mapReady,
    mapStatus,
    serviceHealth,
    zoomIn,
    zoomOut,
    resetView,
    refreshOperationalLayers,
    goToCurrentLocation,
    searchPlace,
    openSelectedParcel,
  };
}
