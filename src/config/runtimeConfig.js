import { decrypt } from "@/utils/crypto";

const DEFAULT_RUNTIME_CONFIG = {
  VITE_HSAC_MAIN_URL: "/mapserver/service/hsacMain",
  VITE_ASMX_BASE_PATH: "/mapserver/land-record",
  VITE_ARCGIS_GEOCODER_URL: "/mapserver/service/geocoder",
  VITE_ARCGIS_IMAGERY_URL: "/mapserver/service/imagery",
  VITE_ARCGIS_REFERENCE_URL: "/mapserver/service/reference",
  VITE_ARCGIS_TOPO_URL: "/mapserver/service/topo",
  VITE_ARCGIS_STREETS_URL: "/mapserver/service/streets",
  VITE_HARYANA_BOUNDARY_URL: "/mapserver/service/haryanaBoundary",
  VITE_HSACGGM_ASSETS_URL: "/mapserver/service/governmentAssets",
  VITE_NHAI_ROADS_URL: "/mapserver/service/nhaiRoads",
  VITE_HARYANA_ROADS_URL: "/mapserver/service/haryanaRoads",
  VITE_ARCGIS_API_KEY: "",
  VITE_GA_MEASUREMENT_ID: "",
};

let runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG };
let loadRuntimeConfigPromise = null;

function setWindowRuntimeConfig(config) {
  if (typeof window !== "undefined") {
    window.__EODB_RUNTIME_CONFIG__ = config;
  }
}

function resolveFrontendConfigEndpoint() {
  return "/api-url/frontend-config";
}

function getAuthorizationHeaderFromLocalToken() {
  const encryptedToken = localStorage.getItem("token");
  if (!encryptedToken) return null;

  try {
    const token = decrypt(encryptedToken);
    return token ? `Bearer ${token}` : null;
  } catch {
    return null;
  }
}

function mergeRuntimeConfig(incomingConfig) {
  if (!incomingConfig || typeof incomingConfig !== "object") {
    return runtimeConfig;
  }

  const merged = { ...runtimeConfig };

  for (const [key, value] of Object.entries(incomingConfig)) {
    if (typeof value !== "string") continue;
    merged[key] = value.trim();
  }

  runtimeConfig = merged;
  setWindowRuntimeConfig(runtimeConfig);
  return runtimeConfig;
}

export function getRuntimeConfigValue(key, fallback = "") {
  const value = runtimeConfig[key];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

export async function loadRuntimeConfig() {
  if (loadRuntimeConfigPromise) {
    return loadRuntimeConfigPromise;
  }

  setWindowRuntimeConfig(runtimeConfig);

  loadRuntimeConfigPromise = (async () => {
    try {
      const endpoint = resolveFrontendConfigEndpoint();
      const authHeader = getAuthorizationHeaderFromLocalToken();
      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });

      if (!response.ok) {
        loadRuntimeConfigPromise = null;
        return runtimeConfig;
      }

      const payload = await response.json();
      return mergeRuntimeConfig(payload?.data);
    } catch {
      return runtimeConfig;
    }
  })();

  return loadRuntimeConfigPromise;
}

export async function reloadRuntimeConfig() {
  loadRuntimeConfigPromise = null;
  return loadRuntimeConfig();
}
