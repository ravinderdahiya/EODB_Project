import React, { Suspense, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { initGA } from "./services/analyticsService";
import { getRuntimeConfigValue, loadRuntimeConfig } from "./config/runtimeConfig";
import useDisableDevTools from "./hooks/useDisableDevTools";
import { LanguageProvider } from "./context/LanguageContext";
import Login from "./pages/Login/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import { LazyMapApp, LazyAdminDashboard, prefetchMapChunk } from "./routes/lazyRoutes";
import { mountSplash, removeSplash } from "./splash";
import "./styles/global.css";

// Map and Admin are heavy routes (ArcGIS, charts, pdf, etc). They are lazy-loaded in
// ./routes/lazyRoutes so the login screen only downloads its own small chunk. The map
// chunk can also be prefetched in parallel with the auth check (see ProtectedRoute).

const rootElement = document.getElementById("root");
const ROOT_CACHE_KEY = "__EODB_REACT_ROOT__";
const CONTEXT_MENU_GUARD_KEY = "__EODB_DISABLE_CONTEXT_MENU_GUARD__";
const root = window[ROOT_CACHE_KEY] || ReactDOM.createRoot(rootElement);
window[ROOT_CACHE_KEY] = root;

function disableRightClickGlobally() {
  if (window[CONTEXT_MENU_GUARD_KEY]) return;

  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  window[CONTEXT_MENU_GUARD_KEY] = true;
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

function shouldShowInitialSplash() {
  const routerBase = resolveRouterBase();
  const pathname = window.location.pathname;
  const routePath = pathname.startsWith(routerBase)
    ? pathname.slice(routerBase.length) || "/"
    : pathname;

  // Skip splash for the login entry screen, but keep it for the map route.
  return routePath === "/map";
}

function GlobalSecurityGuards() {
  useDisableDevTools();
  return null;
}

// Suspense fallback for lazy routes — keeps the branded splash on screen while the
// heavy route chunk (and ArcGIS) downloads, then fades it out once the route mounts.
function RouteSuspenseFallback() {
  useEffect(() => {
    mountSplash();
    return () => removeSplash();
  }, []);
  return null;
}

// Runtime config + Google Analytics are initialized in the background so they never
// block first paint or the login screen. ArcGIS reuses the same cached config load.
function initBackgroundServices() {
  loadRuntimeConfig()
    .then(() => {
      const gaMeasurementId = getRuntimeConfigValue(
        "VITE_GA_MEASUREMENT_ID",
        import.meta.env.VITE_GA_MEASUREMENT_ID,
      );
      initGA(gaMeasurementId);
    })
    .catch(() => {
      // Keep the app functional even if config/GA bootstrap fails.
    });
}

function renderApp() {
  root.render(
    <React.StrictMode>
      <LanguageProvider>
        <BrowserRouter basename={resolveRouterBase()}>
          <GlobalSecurityGuards />
          <Suspense fallback={<RouteSuspenseFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route
                path="/map"
                element={(
                  <ProtectedRoute onPrefetch={prefetchMapChunk}>
                    <LazyMapApp />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/admin"
                element={(
                  <ProtectedRoute requireAdmin>
                    <LazyAdminDashboard />
                  </ProtectedRoute>
                )}
              />
              {/* Catch-all: redirect unknown paths to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </React.StrictMode>,
  );
}

if (shouldShowInitialSplash()) {
  mountSplash();
}

disableRightClickGlobally();
initBackgroundServices();

try {
  renderApp();
} catch {
  removeSplash();
  root.render(
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      Failed to initialize the application.
    </div>,
  );
}
