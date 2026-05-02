const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const HSAC_ORIGIN = import.meta.env.VITE_HSAC_ORIGIN ?? "https://hsac.org.in";

export const HSAC_PROXY_URL_PREFIXES = [
  `${HSAC_ORIGIN}/server/rest/services/`,
  "https://hsacggm.in/map/rest/services/",
  "https://hsacggm.in/server/rest/services/",
];

export const HSAC_PROXY_URL = (import.meta.env.DEV || isLocalhost)
  ? (
      import.meta.env.VITE_HSAC_DOTNET_PROXY_DEV_URL ??
      "/__hsac_proxy__"
    )
  : (import.meta.env.VITE_HSAC_DOTNET_PROXY_URL ?? "https://hsac.org.in/DotNet/proxy.ashx");
