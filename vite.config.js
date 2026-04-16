import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // CORS proxy for HSAC ASMX land-record services (khewat / khatoni / owner names).
      // Vite rewrites /LandOwnerAPI/... → https://hsac.org.in/LandOwnerAPI/...
      // In production configure the equivalent rule in Nginx / Apache.
      "/LandOwnerAPI": {
        target:       "https://hsac.org.in",
        changeOrigin: true,
        secure:       false,
      },
      // Jamabandi data endpoint (getjamabandi.asmx)
      "/testapi": {
        target:       "https://hsac.org.in",
        changeOrigin: true,
        secure:       false,
      },
    },
  },
});
