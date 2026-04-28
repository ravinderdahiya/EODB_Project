import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import esriConfig from "@arcgis/core/config.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import App from "./App";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles/global.css";

esriConfig.assetsPath = "/assets";

if (import.meta.env.VITE_ARCGIS_API_KEY) {
  esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
}


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Login />} />
          <Route path="/map" element={<App />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Catch-all: redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>,
);