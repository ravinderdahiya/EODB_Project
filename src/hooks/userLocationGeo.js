export const USER_LOCATION_GRAPHIC_TITLE = "Your location";
export const LOCATE_ME_ZOOM = 14;

export const isSecureGeolocationContext = () =>
  typeof window !== "undefined" &&
  (window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const USER_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 15000,
  timeout: 12000,
};

export const geolocationMessageFromError = (err) => {
  if (err?.code === 1) {
    return "Location permission denied. Please allow location access in your browser.";
  }
  if (err?.code === 2) {
    return "Unable to determine location. Please try again.";
  }
  if (err?.code === 3) {
    return "Location request timed out. Please try again.";
  }
  return err?.message || "Unable to access current location.";
};
