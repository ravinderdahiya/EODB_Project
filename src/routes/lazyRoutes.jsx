import { lazy } from "react";

let mapChunkPromise = null;

// Begin downloading the heavy map chunk (App + ArcGIS ~3.3MB gzip) eagerly.
// Idempotent — safe to call multiple times. This breaks the serial waterfall where
// the ArcGIS bundle would otherwise only start downloading AFTER the /user/me auth
// check resolves. Calling this in parallel with the auth check overlaps the two.
export function prefetchMapChunk() {
  if (!mapChunkPromise) {
    // Download the App chunk and bootstrap ArcGIS in parallel instead of waiting
    // for runtime config before the ~3MB vendor bundle even starts downloading.
    mapChunkPromise = Promise.all([
      import("../bootstrap/arcgisSetup").then(({ ensureArcgisReady }) => ensureArcgisReady()),
      import("../App"),
    ]).then(([, appModule]) => appModule);
  }
  return mapChunkPromise;
}

export const LazyMapApp = lazy(() => prefetchMapChunk());
export const LazyAdminDashboard = lazy(() => import("../pages/AdminDashboard"));
