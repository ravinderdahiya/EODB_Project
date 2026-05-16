import axios from "axios";
import { decrypt } from "./crypto";

function normalizeBasePath(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  const noOrigin = raw.replace(/^https?:\/\/[^/]+/i, "");
  if (!noOrigin) return "";
  const withLeadingSlash = noOrigin.startsWith("/") ? noOrigin : `/${noOrigin}`;
  return withLeadingSlash.replace(/\/+$/, "");
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

const apiBaseUrl = import.meta.env.DEV && !forceAbsoluteApiBase
  ? ""
  : (shouldIgnoreConfiguredApiBase || !configuredApiBaseUrl
      ? resolvedApiBaseWhenConfiguredMissing
      : configuredApiBaseUrl);

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // Send httpOnly auth_token cookie automatically
});

// ✅ Request Interceptor (Attach decrypted token)
axiosInstance.interceptors.request.use((config) => {
  const encryptedToken = localStorage.getItem("token");

  if (encryptedToken) {
    try {
      const token = decrypt(encryptedToken);
      config.headers = config.headers || {};
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (encryptedToken.split(".").length === 3) {
        // Fallback: token may already be a plain JWT string.
        config.headers.Authorization = `Bearer ${encryptedToken}`;
      }
    } catch {
      // Ignore malformed local token and continue with cookie auth fallback.
    }
  }

  return config;
});

// ✅ Response Interceptor (Handle 401 Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      localStorage.removeItem("token");
      const appBase = `${import.meta.env.BASE_URL || "/"}`.replace(/\/+$/, "");
      const loginPath = appBase ? `${appBase}/login` : "/login";
      window.location.href = loginPath;
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
