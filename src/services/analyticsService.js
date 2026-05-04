import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = (measurementId) => {
  if (measurementId && measurementId !== 'GA_MEASUREMENT_ID') {
    ReactGA.initialize(measurementId);
    console.log('Google Analytics initialized with ID:', measurementId);
  } else {
    console.warn('Google Analytics not initialized - measurement ID not provided');
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