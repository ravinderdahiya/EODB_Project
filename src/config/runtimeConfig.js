import { decrypt } from "@/utils/crypto";

function normalizeBasePath(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  const noOrigin = raw.replace(/^https?:\/\/[^/]+/i, "");
  if (!noOrigin) return "";
  const withLeadingSlash = noOrigin.startsWith("/") ? noOrigin : `/${noOrigin}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function extractOriginAndPath(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return { origin: "", path: "" };

  try {
    const parsed = new URL(raw);
    return {
      origin: `${parsed.protocol}//${parsed.host}`,
      path: normalizeBasePath(parsed.pathname),
    };
  } catch {
    return {
      origin: "",
      path: normalizeBasePath(raw),
    };
  }
}

function isLoopbackHost(hostname) {
  const host = `${hostname || ""}`.trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isLoopbackAbsoluteUrl(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return isLoopbackHost(parsed.hostname);
  } catch {
    return false;
  }
}

function inferBackendBasePathFromLocation() {
  if (typeof window === "undefined") return "";

  const pathname = `${window.location?.pathname || ""}`;
  const knownFrontendBases = ["/eodb_test", "/eodb"];

  const matchedFrontendBase = knownFrontendBases.find((base) => (
    pathname === base || pathname.startsWith(`${base}/`)
  ));

  if (matchedFrontendBase) {
    return "/eodb_backend";
  }

  return "";
}

function inferBackendBasePath() {
  const explicit = normalizeBasePath(import.meta.env.VITE_FRONTEND_BACKEND_BASE_PATH || "");
  if (explicit) return explicit;

  const configuredApiBase = (import.meta.env.VITE_SERVER_BASE_URL || "").trim();
  const shouldIgnoreApiBase =
    !import.meta.env.DEV && isLoopbackAbsoluteUrl(configuredApiBase);

  const fromApiBase = shouldIgnoreApiBase ? "" : normalizeBasePath(configuredApiBase);
  if (fromApiBase) return fromApiBase;

  const fromLocation = inferBackendBasePathFromLocation();
  if (fromLocation) return fromLocation;

  return "";
}

function withBasePath(basePath, path) {
  if (!basePath) return path;
  return `${basePath}${path}`;
}

const fallbackBackendBasePath = inferBackendBasePath();

const DEFAULT_RUNTIME_CONFIG = {
  VITE_HSAC_MAIN_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/hsacMain"),
  VITE_ASMX_BASE_PATH: withBasePath(fallbackBackendBasePath, "/mapserver/land-record"),
  VITE_ARCGIS_GEOCODER_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/geocoder"),
  VITE_ARCGIS_IMAGERY_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/imagery"),
  VITE_ARCGIS_REFERENCE_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/reference"),
  VITE_ARCGIS_TOPO_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/topo"),
  VITE_ARCGIS_STREETS_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/streets"),
  VITE_HARYANA_BOUNDARY_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/haryanaBoundary"),
  VITE_HSACGGM_ASSETS_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/governmentAssets"),
  VITE_NHAI_ROADS_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/nhaiRoads"),
  VITE_HARYANA_ROADS_URL: withBasePath(fallbackBackendBasePath, "/mapserver/service/haryanaRoads"),
  VITE_ARCGIS_API_KEY: import.meta.env.VITE_ARCGIS_API_KEY || "",
  VITE_GA_MEASUREMENT_ID: import.meta.env.VITE_GA_MEASUREMENT_ID || "",
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
  const shouldIgnoreConfiguredApiBase =
    !import.meta.env.DEV && isLoopbackAbsoluteUrl(configuredApiBaseUrl);

  if (import.meta.env.DEV && !forceAbsoluteApiBase) {
    return endpointPath;
  }

  if (!configuredApiBaseUrl || shouldIgnoreConfiguredApiBase) {
    return withBasePath(fallbackBackendBasePath, endpointPath);
  }

  const configuredApiBaseParts = extractOriginAndPath(configuredApiBaseUrl);
  if (configuredApiBaseParts.origin && !configuredApiBaseParts.path && fallbackBackendBasePath) {
    return `${configuredApiBaseParts.origin}${fallbackBackendBasePath}${endpointPath}`;
  }

  return `${configuredApiBaseUrl.replace(/\/+$/, "")}${endpointPath}`;
}

function getAuthorizationHeaderFromLocalToken() {
  const encryptedToken = localStorage.getItem("token");
  if (!encryptedToken) return null;

  try {
    const token = decrypt(encryptedToken);
    if (token) return `Bearer ${token}`;
    // Fallback: in some environments token may be stored as plain JWT.
    if (encryptedToken.split(".").length === 3) {
      return `Bearer ${encryptedToken}`;
    }
    return null;
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
