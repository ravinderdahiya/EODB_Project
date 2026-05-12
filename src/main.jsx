import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import esriConfig from "@arcgis/core/config.js";
import * as urlUtils from "@arcgis/core/core/urlUtils.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { initGA } from "./services/analyticsService";
import { getRuntimeConfigValue, loadRuntimeConfig } from "./config/runtimeConfig";
import "./styles/global.css";

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function normalizeRouterBase(baseName) {
  if (!baseName) return "/";
  return baseName.endsWith("/") ? baseName.slice(0, -1) : baseName;
}

function resolveRouterBase() {
  const envBase = normalizeRouterBase(import.meta.env.VITE_BASENAME || "/");
  const knownBases = ["/eodb_test", "/eodb"];
  const pathname = window.location.pathname;

  const matchedBase = knownBases.find((base) =>
    pathname === base || pathname.startsWith(`${base}/`),
  );

  return matchedBase || envBase || "/";
}

function getArcgisAssetsPath() {
  const normalizedBase = normalizeBaseUrl(import.meta.env.BASE_URL || "/");
  const relativeAssetsPath = `${normalizedBase}arcgis/assets/`;
  return new URL(relativeAssetsPath, window.location.origin).toString();
}

async function bootstrap() {
  await loadRuntimeConfig();

  const [
    { default: App },
    { default: AdminDashboard },
    { default: Login },
    { default: ProtectedRoute },
    { LanguageProvider },
    { HSAC_PROXY_URL, HSAC_PROXY_URL_PREFIXES },
  ] = await Promise.all([
    import("./App"),
    import("./pages/AdminDashboard"),
    import("./pages/Login"),
    import("./routes/ProtectedRoute"),
    import("./context/LanguageContext"),
    import("./config/proxyConfig"),
  ]);

  const arcgisAssetsPath = getArcgisAssetsPath();

  // ArcGIS local assets (workers/wasm/i18n/images) are served from /public/arcgis/assets.
  esriConfig.assetsPath = arcgisAssetsPath;
  esriConfig.workers.workerPath = `${arcgisAssetsPath}esri/core/workers/RemoteClient.js`;

  // Initialize Google Analytics
  const gaMeasurementId = getRuntimeConfigValue(
    "VITE_GA_MEASUREMENT_ID",
    import.meta.env.VITE_GA_MEASUREMENT_ID,
  );
  initGA(gaMeasurementId);

  const arcgisApiKey = getRuntimeConfigValue(
    "VITE_ARCGIS_API_KEY",
    import.meta.env.VITE_ARCGIS_API_KEY,
  );

  if (arcgisApiKey) {
    esriConfig.apiKey = arcgisApiKey;
  }

  if (HSAC_PROXY_URL) {
    esriConfig.request.proxyUrl = HSAC_PROXY_URL;
    HSAC_PROXY_URL_PREFIXES.forEach((urlPrefix) => {
      const existingRule = urlUtils.getProxyRule(urlPrefix);
      if (existingRule?.urlPrefix === urlPrefix) return;
      urlUtils.addProxyRule({
        urlPrefix,
        proxyUrl: HSAC_PROXY_URL,
      });
    });
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <LanguageProvider>
        <BrowserRouter basename={resolveRouterBase()}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/map"
              element={(
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              )}
            />
            
            <Route
              path="/map"
              element={(
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin"
              element={(
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />
            {/* Catch-all: redirect unknown paths to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </React.StrictMode>,
  );
}

bootstrap().catch(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      Failed to initialize the application.
    </div>,
  );
});
