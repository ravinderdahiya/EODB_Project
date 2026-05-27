const DEVICE_ID_STORAGE_KEY = "eodb_device_id";

const createFallbackDeviceId = () => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `web-${Date.now()}-${randomPart}`;
};

const readDeviceId = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeDeviceId = (value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, value);
  } catch {
    // Ignore storage errors in private mode.
  }
};

export const getOrCreateDeviceId = () => {
  const existing = readDeviceId();
  if (existing) return existing;
  const next = createFallbackDeviceId();
  writeDeviceId(next);
  return next;
};

export const getDeviceInfoSummary = () => {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent || "Unknown-UA";
  const platform = navigator.platform || "Unknown-Platform";
  return `${platform} | ${ua}`.slice(0, 500);
};

export const getProvidedDeviceImei = () => {
  if (typeof window === "undefined") return null;

  const fromBridge = typeof window.__DEVICE_IMEI__ === "string" ? window.__DEVICE_IMEI__.trim() : "";
  if (fromBridge) return fromBridge.slice(0, 64);

  try {
    const fromStorage = window.localStorage.getItem("eodb_device_imei");
    if (typeof fromStorage === "string" && fromStorage.trim()) {
      return fromStorage.trim().slice(0, 64);
    }
  } catch {
    // Ignore storage read errors.
  }

  return null;
};

export const buildDevicePayload = () => ({
  deviceId: getOrCreateDeviceId(),
  deviceInfo: getDeviceInfoSummary(),
  deviceImei: getProvidedDeviceImei(),
});
