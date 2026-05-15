import { decrypt } from "@/utils/crypto";

const DEFAULT_RUNTIME_CONFIG = {
  VITE_HSAC_MAIN_URL: "",
  VITE_ASMX_BASE_PATH: "",
  VITE_ARCGIS_GEOCODER_URL: "",
  VITE_ARCGIS_IMAGERY_URL: "",
  VITE_ARCGIS_REFERENCE_URL: "",
  VITE_ARCGIS_TOPO_URL: "",
  VITE_ARCGIS_STREETS_URL: "",
  VITE_HARYANA_BOUNDARY_URL: "",
  VITE_HSACGGM_ASSETS_URL: "",
  VITE_NHAI_ROADS_URL: "",
  VITE_HARYANA_ROADS_URL: "",
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
  const endpointPath = "/api-url/frontend-config";
  const configuredApiBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || "").trim();
  const forceAbsoluteApiBase = String(import.meta.env.VITE_FORCE_ABSOLUTE_API_BASE || "").toLowerCase() === "true";

  if (import.meta.env.DEV && !forceAbsoluteApiBase) {
    return endpointPath;
  }

  if (!configuredApiBaseUrl) {
    return endpointPath;
  }

  return `${configuredApiBaseUrl.replace(/\/+$/, "")}${endpointPath}`;
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
