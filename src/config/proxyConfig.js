const HSAC_ORIGIN = import.meta.env.VITE_HSAC_ORIGIN ?? "https://hsac.org.in";

export const HSAC_PROXY_URL_PREFIXES = [
  `${HSAC_ORIGIN}/server/rest/services/`,
  "https://hsacggm.in/map/rest/services/",
  "https://hsacggm.in/server/rest/services/",
];

// Security: import.meta.env.DEV is statically replaced by Vite at build time.
// In production builds it is always false, so /__hsac_proxy__ is dead-code-eliminated
// and never included in the production bundle. Do not add runtime hostname checks
// here — they bypass the compile-time guarantee.
export const HSAC_PROXY_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_HSAC_DOTNET_PROXY_DEV_URL ?? "/__hsac_proxy__")
  : (import.meta.env.VITE_HSAC_DOTNET_PROXY_URL ?? "https://hsac.org.in/DotNet/proxy.ashx");
