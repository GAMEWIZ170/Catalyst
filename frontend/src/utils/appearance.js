import { syncThemeColor } from "./themeColor";

// Theme and text size are saved on this device. Shared by the quick-settings panel and the Settings page.
export const textSizes = [
  { key: "standard", name: "Standard" },
  { key: "large", name: "Large" },
  { key: "xlarge", name: "Extra large" }
];

const save = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
};

export const currentTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  syncThemeColor();
  save("catalyst-theme", theme);
}

export function currentTextSize() {
  const value = document.documentElement.dataset.text;
  return value === "large" || value === "xlarge" ? value : "standard";
}
export function applyTextSize(size) {
  if (size === "standard") delete document.documentElement.dataset.text;
  else document.documentElement.dataset.text = size;
  save("catalyst-text", size);
}
