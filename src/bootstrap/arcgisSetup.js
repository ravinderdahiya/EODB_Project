import esriConfig from "@arcgis/core/config.js";
import * as urlUtils from "@arcgis/core/core/urlUtils.js";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { getRuntimeConfigValue, loadRuntimeConfig } from "@/config/runtimeConfig";
import { HSAC_PROXY_URL, HSAC_PROXY_URL_PREFIXES } from "@/config/proxyConfig";

let arcgisReadyPromise = null;

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function getArcgisAssetsPath() {
  const normalizedBase = normalizeBaseUrl(import.meta.env.BASE_URL || "/");
  const relativeAssetsPath = `${normalizedBase}arcgis/assets/`;
  return new URL(relativeAssetsPath, window.location.origin).toString();
}

function attachArcgisAuthInterceptor() {
  esriConfig.request.interceptors.push({
    before: (params) => {
      params.requestOptions = params.requestOptions || {};
      params.requestOptions.credentials = "include";
    },
  });
}

// Idempotent ArcGIS initialization. Heavy @arcgis/core code only loads when this
// module is dynamically imported (i.e. when the map route is entered), keeping it
// out of the entry/login bundle.
export function ensureArcgisReady() {
  if (arcgisReadyPromise) {
    return arcgisReadyPromise;
  }

  arcgisReadyPromise = (async () => {
    const arcgisAssetsPath = getArcgisAssetsPath();

    // ArcGIS local assets (workers/wasm/i18n/images) are served from /public/arcgis/assets.
    esriConfig.assetsPath = arcgisAssetsPath;
    esriConfig.workers.workerPath = `${arcgisAssetsPath}esri/core/workers/RemoteClient.js`;
    attachArcgisAuthInterceptor();

    const applyRuntimeApiKey = () => {
      const arcgisApiKey = getRuntimeConfigValue(
        "VITE_ARCGIS_API_KEY",
        import.meta.env.VITE_ARCGIS_API_KEY,
      );
      if (arcgisApiKey) {
        esriConfig.apiKey = arcgisApiKey;
      }
    };

    applyRuntimeApiKey();
    void loadRuntimeConfig().then(applyRuntimeApiKey);

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
  })();

  return arcgisReadyPromise;
}
