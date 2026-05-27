import axios from "axios";
import { getOrCreateDeviceId, getDeviceInfoSummary, getProvidedDeviceImei } from "./deviceIdentity";

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

function isLoopbackAbsoluteUrl(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
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

  if (matchedFrontendBase) return "/eodb_backend";
  return "";
}

function withBasePath(basePath, path) {
  if (!basePath) return path;
  return `${basePath}${path}`;
}

const configuredApiBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || "").trim();
const forceAbsoluteApiBase = String(import.meta.env.VITE_FORCE_ABSOLUTE_API_BASE || "").toLowerCase() === "true";
const shouldIgnoreConfiguredApiBase =
  !import.meta.env.DEV && isLoopbackAbsoluteUrl(configuredApiBaseUrl);

const explicitBackendBasePath = normalizeBasePath(import.meta.env.VITE_FRONTEND_BACKEND_BASE_PATH || "");
const inferredBackendBasePath = explicitBackendBasePath || inferBackendBasePathFromLocation();
const resolvedApiBaseWhenConfiguredMissing = withBasePath(inferredBackendBasePath, "");
const configuredApiBaseParts = extractOriginAndPath(configuredApiBaseUrl);

function resolveApiBaseUrl() {
  if (import.meta.env.DEV && !forceAbsoluteApiBase) {
    return "";
  }

  if (shouldIgnoreConfiguredApiBase || !configuredApiBaseUrl) {
    return resolvedApiBaseWhenConfiguredMissing;
  }

  // If only origin is provided (e.g. https://hsac.org.in), attach backend base path.
  if (configuredApiBaseParts.origin && !configuredApiBaseParts.path && inferredBackendBasePath) {
    return `${configuredApiBaseParts.origin}${inferredBackendBasePath}`;
  }

  return configuredApiBaseUrl;
}

const apiBaseUrl = resolveApiBaseUrl();

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const providedImei = getProvidedDeviceImei();
  nextConfig.headers = {
    ...(config.headers || {}),
    "X-Device-Id": getOrCreateDeviceId(),
    "X-Device-Info": getDeviceInfoSummary(),
    ...(providedImei ? { "X-Device-Imei": providedImei } : {}),
  };
  return nextConfig;
});

// Handle 401 globally and bounce user to login.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAdmin");
      const appBase = `${import.meta.env.BASE_URL || "/"}`.replace(/\/+$/, "");
      const loginPath = appBase ? `${appBase}/login` : "/login";
      window.location.href = loginPath;
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
