import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load .env variables into Node context so vite.config.js can reference them.
  // Third arg "" loads ALL vars, not just VITE_* prefixed ones.
  const env = loadEnv(mode, process.cwd(), "");

  const hsacTarget = env.VITE_HSAC_ORIGIN    || "https://hsac.org.in";
  const hsacProxy  = env.VITE_HSAC_DEV_PROXY || "/hsac";
  const devPort    = parseInt(env.VITE_DEV_PORT || "5173", 10);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: devPort,
      proxy: {
        // ArcGIS REST proxy (dev only): VITE_HSAC_DEV_PROXY/... -> VITE_HSAC_ORIGIN/...
        [hsacProxy]: {
          target: hsacTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(new RegExp(`^${hsacProxy}`), ""),
        },
        // CORS proxy for HSAC ASMX land-record services (khewat / khatoni / owner names).
        // Vite rewrites /LandOwnerAPI/... → VITE_HSAC_ORIGIN/LandOwnerAPI/...
        // In production configure the equivalent rule in Nginx / Apache.
        "/LandOwnerAPI": {
          target:       hsacTarget,
          changeOrigin: true,
          secure:       false,
        },
        // Jamabandi data endpoint (getjamabandi.asmx)
        "/testapi": {
          target:       hsacTarget,
          changeOrigin: true,
          secure:       false,
        },
      },
    },
  };
});
