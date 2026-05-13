import ReactGA from 'react-ga4';

const GTAG_SCRIPT_ID = "ga-gtag-script";

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

// Initialize Google Analytics
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
};

// Track events
export const trackEvent = (category, action, label = null, value = null) => {
  ReactGA.event({
    category: category,
    action: action,
    label: label,
    value: value
  });
};

// Track user interactions
export const trackUserInteraction = (action, label = null, value = null) => {
  trackEvent('user_interaction', action, label, value);
};

// Track map interactions
export const trackMapInteraction = (action, details = {}) => {
  trackEvent('map_interaction', action, JSON.stringify(details));
};

// Track search events
export const trackSearch = (searchTerm, category = 'general') => {
  trackEvent('search', 'performed', `${category}:${searchTerm}`);
};

// Track feature usage
export const trackFeatureUsage = (featureName, details = {}) => {
  trackEvent('feature_usage', featureName, JSON.stringify(details));
};

// Track errors
export const trackError = (error, context = 'general') => {
  trackEvent('error', context, error.message || error.toString());
};

// Track performance metrics
export const trackPerformance = (metric, value) => {
  trackEvent('performance', metric, null, value);
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
