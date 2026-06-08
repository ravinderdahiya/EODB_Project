import { lazy } from "react";

let mapChunkPromise = null;

// Begin downloading the heavy map chunk (App + ArcGIS ~3.3MB gzip) eagerly.
// Idempotent — safe to call multiple times. This breaks the serial waterfall where
// the ArcGIS bundle would otherwise only start downloading AFTER the /user/me auth
// check resolves. Calling this in parallel with the auth check overlaps the two.
export function prefetchMapChunk() {
  if (!mapChunkPromise) {
    mapChunkPromise = (async () => {
      const { ensureArcgisReady } = await import("../bootstrap/arcgisSetup");
      await ensureArcgisReady();
      return import("../App");
    })();
  }
  return mapChunkPromise;
}

export const LazyMapApp = lazy(() => prefetchMapChunk());
export const LazyAdminDashboard = lazy(() => import("../pages/AdminDashboard"));
