import { useEffect, useRef, useState } from "react";

const LOCATION_PERMISSION_STATUS_KEY = "eodb_location_permission_status";
const LOCATION_RETRY_INTERVAL_MS = 10000;

const isSecureLocationContext = () =>
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

export default function useMandatoryLocationPermission() {
    const [permissionStatus, setPermissionStatus] = useState(() => {
        if (typeof window === "undefined") {
            return "unknown";
        }

        return localStorage.getItem(LOCATION_PERMISSION_STATUS_KEY) || "unknown";
    });
    const requestInFlightRef = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const persistPermissionStatus = (nextStatus) => {
            setPermissionStatus(nextStatus);
            localStorage.setItem(LOCATION_PERMISSION_STATUS_KEY, nextStatus);
        };

        // Permission prompting is intentionally kept separate from map behavior.
        const requestLocationPermission = async() => {
            if (requestInFlightRef.current || !navigator.geolocation || !isSecureLocationContext()) {
                return;
            }

            requestInFlightRef.current = true;
            let handledByGeolocationCallback = false;

            try {
                const permission = await navigator.permissions?.query?.({ name: "geolocation" }).catch(() => null);
                const state = permission?.state;

                if (state === "granted") {
                    persistPermissionStatus("granted");
                    return;
                }

                if (state === "denied") {
                    persistPermissionStatus("denied");
                }

                // Always invoke the browser geolocation API on retry so browsers that
                // allow re-prompting can show the default permission popup again.
                navigator.geolocation.getCurrentPosition(
                    () => {
                        persistPermissionStatus("granted");
                        requestInFlightRef.current = false;
                    },
                    () => {
                        persistPermissionStatus("denied");
                        requestInFlightRef.current = false;
                    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
                );
                handledByGeolocationCallback = true;
                return;
            } finally {
                // For getCurrentPosition callbacks, the flag is cleared inside the callbacks.
                if (!handledByGeolocationCallback) {
                    requestInFlightRef.current = false;
                }
            }
        };

        void requestLocationPermission();

        const intervalId = window.setInterval(() => {
            if (permissionStatus !== "granted") {
                void requestLocationPermission();
            }
        }, LOCATION_RETRY_INTERVAL_MS);

        return () => {
            requestInFlightRef.current = false;
            window.clearInterval(intervalId);
        };
    }, [permissionStatus]);

    return permissionStatus;
}
