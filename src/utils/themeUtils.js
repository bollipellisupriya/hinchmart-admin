// HinchMart Console Theme and System Appearance Engine

const APPEARANCE_STORAGE_KEY = "hinchmart_settings_appearance";

export function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredAppearance() {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme || "system",
        accent: parsed.accent || "amber",
        density: parsed.density || "comfortable",
      };
    }
  } catch (err) {
    console.warn("Error reading stored appearance:", err);
  }
  return { theme: "system", accent: "amber", density: "comfortable" };
}

export function applyAppearance(appearance) {
  if (typeof document === "undefined") return;
  const config = appearance || getStoredAppearance();

  const isSystem = config.theme === "system";
  const systemTheme = getSystemTheme();
  const effectiveTheme = isSystem ? systemTheme : config.theme || "light";

  // Apply attributes to <html> root element
  document.documentElement.dataset.theme = effectiveTheme;
  document.documentElement.dataset.colorMode = config.theme;
  document.documentElement.dataset.systemTheme = systemTheme;
  document.documentElement.dataset.accent = config.accent || "amber";
  document.documentElement.dataset.density = config.density || "comfortable";

  return {
    effectiveTheme,
    systemTheme,
    config,
  };
}

export function saveAppearance(appearance) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch (err) {
    console.warn("Error saving appearance:", err);
  }
  return applyAppearance(appearance);
}

// Attach live listener for OS system theme switch
export function initThemeSystemListener(onSystemChange) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e) => {
    const current = getStoredAppearance();
    applyAppearance(current);
    if (onSystemChange) {
      onSystemChange(e.matches ? "dark" : "light");
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }

  return () => {};
}
