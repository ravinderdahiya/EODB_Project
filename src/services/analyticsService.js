import ReactGA from 'react-ga4';
import axiosInstance from "@/utils/axiosInstance";

const GTAG_SCRIPT_ID = "ga-gtag-script";
const MAX_LABEL_LENGTH = 500;
const MAX_EVENT_TYPE_LENGTH = 120;

const loadGtagScript = (measurementId) => new Promise((resolve, reject) => {
  if (!measurementId) {
    resolve();
    return;
  }

  if (document.getElementById(GTAG_SCRIPT_ID)) {
    resolve();
    return;
  }

  const script = document.createElement("script");
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Failed to load Google Analytics script"));
  document.head.appendChild(script);
});

const safeText = (value, maxLength = 300) => {
  if (value === null || value === undefined) return null;
  const normalized = `${value}`.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
};

const toSerializableMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return null;
  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch {
    return null;
  }
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const sendEventToBackend = async (payload) => {
  try {
    await axiosInstance.post("/analytics/events", payload);
  } catch {
    // Ignore analytics sync errors so UX never breaks.
  }
};

const trackToBackend = (payload) => {
  const normalizedPayload = {
    ...payload,
    eventType: safeText(payload.eventType, MAX_EVENT_TYPE_LENGTH),
    category: safeText(payload.category, 120),
    action: safeText(payload.action, 180),
    label: safeText(payload.label, MAX_LABEL_LENGTH),
    page: safeText(payload.page, 500),
    title: safeText(payload.title, 240),
    source: "frontend",
    metadata: toSerializableMetadata(payload.metadata),
  };

  if (!normalizedPayload.eventType) return;
  void sendEventToBackend(normalizedPayload);
};

// Initialize alytics
export const initGA = (measurementId) => {
  if (measurementId && measurementId !== 'GA_MEASUREMENT_ID') {
    loadGtagScript(measurementId)
      .then(() => {
        ReactGA.initialize(measurementId);
      })
      .catch(() => {
        // Keep app functional even if GA script is blocked.
      });
  }
};

// Track page views
export const trackPageView = (page, title) => {
  ReactGA.send({
    hitType: 'pageview',
    page: page,
    title: title
  });

  trackToBackend({
    eventType: "page_view",
    category: "navigation",
    action: "view",
    page,
    title,
  });
};

// Track events
export const trackEvent = (
  category,
  action,
  label = null,
  value = null,
  backendOptions = {},
) => {
  const numericValue = toFiniteNumberOrNull(value);
  const gaPayload = {
    category: category,
    action: action,
    label: label
  };

  if (numericValue !== null) {
    gaPayload.value = numericValue;
  }

  ReactGA.event(gaPayload);

  trackToBackend({
    eventType: backendOptions.eventType || "event",
    category,
    action,
    label,
    value: numericValue,
    page: backendOptions.page || window.location.pathname,
    metadata: backendOptions.metadata || null,
  });
};

// Track user interactions
export const trackUserInteraction = (action, label = null, value = null) => {
  trackEvent('user_interaction', action, label, value);
};

// Track map interactions
export const trackMapInteraction = (action, details = {}) => {
  const serializedDetails = safeText(JSON.stringify(details), MAX_LABEL_LENGTH);
  trackEvent("map_interaction", action, serializedDetails, null, {
    eventType: "map_interaction",
    metadata: details,
  });
};

// Track search events
export const trackSearch = (searchTerm, category = 'general') => {
  const label = safeText(`${category}:${searchTerm}`, MAX_LABEL_LENGTH);
  trackEvent("search", "performed", label, null, {
    eventType: "search",
    metadata: { category },
  });
};

// Track feature usage
export const trackFeatureUsage = (featureName, details = {}) => {
  const serializedDetails = safeText(JSON.stringify(details), MAX_LABEL_LENGTH);
  trackEvent("feature_usage", featureName, serializedDetails, null, {
    eventType: "feature_usage",
    metadata: details,
  });
};

// Track errors
export const trackError = (error, context = 'general') => {
  const message = safeText(error?.message || error?.toString(), MAX_LABEL_LENGTH);
  trackEvent("error", context, message, null, {
    eventType: "error",
  });
};

// Track performance metrics
export const trackPerformance = (metric, value) => {
  trackEvent("performance", metric, null, value, {
    eventType: "performance",
  });
};

// Custom hook for GA tracking
export const useAnalytics = () => {
  return {
    trackPageView,
    trackEvent,
    trackUserInteraction,
    trackMapInteraction,
    trackSearch,
    trackFeatureUsage,
    trackError,
    trackPerformance
  };
};
