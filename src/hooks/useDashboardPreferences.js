import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "dlr-dashboard-theme";
export const GLASS_STORAGE_KEY = "dlr-dashboard-glass";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialGlassMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(GLASS_STORAGE_KEY) === "on";
}

export function useDashboardPreferences() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [glassMode, setGlassMode] = useState(getInitialGlassMode);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.glass = glassMode ? "on" : "off";
    window.localStorage.setItem(GLASS_STORAGE_KEY, glassMode ? "on" : "off");
  }, [glassMode]);

  return {
    theme,
    setTheme,
    glassMode,
    setGlassMode,
  };
}
