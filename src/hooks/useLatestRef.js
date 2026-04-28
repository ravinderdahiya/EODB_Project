import { useEffect, useRef } from "react";

/**
 * Keeps a ref always pointing to the latest value without triggering re-renders.
 * Use this to avoid stale closures in long-lived effects (e.g. ArcGIS view handlers).
 *
 * @template T
 * @param {T} value
 * @returns {React.MutableRefObject<T>}
 */
export function useLatestRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}
