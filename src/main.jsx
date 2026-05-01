import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import esriConfig from "@arcgis/core/config.js";
import * as urlUtils from "@arcgis/core/core/urlUtils.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import App from "./App";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import { LanguageProvider } from "./context/LanguageContext";
import { HSAC_PROXY_URL, HSAC_PROXY_URL_PREFIXES } from "./config/proxyConfig";
import "./styles/global.css";

//esriConfig.assetsPath = import.meta.env.BASE_URL + "arcgis/assets";
// ✅ CORRECT
esriConfig.assetsPath = import.meta.env.BASE_URL + "assets";

if (import.meta.env.VITE_ARCGIS_API_KEY) {
  esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
}

esriConfig.request.proxyUrl = HSAC_PROXY_URL;
HSAC_PROXY_URL_PREFIXES.forEach((urlPrefix) => {
  const existingRule = urlUtils.getProxyRule(urlPrefix);
  if (existingRule?.urlPrefix === urlPrefix) return;
  urlUtils.addProxyRule({
    urlPrefix,
    proxyUrl: HSAC_PROXY_URL,
  });
});


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter basename={(import.meta.env.VITE_BASENAME || "").replace(/\/$/, "") || "/"}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/map" element={<App />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          {/* Catch-all: redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>,
);

// {<ProtectedRoute><App /></ProtectedRoute>}
