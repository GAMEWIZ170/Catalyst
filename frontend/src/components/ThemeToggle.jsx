import { useEffect, useState } from "react";

const themeKey = "catalyst-theme";
const paletteSurfaces = {
  lagoon: { light: "rgb(245 249 252)", dark: "rgb(16 42 67)" },
  indigo: { light: "rgb(246 247 251)", dark: "rgb(17 26 51)" },
  ember: { light: "rgb(250 247 245)", dark: "rgb(36 22 18)" },
  orchid: { light: "rgb(248 245 252)", dark: "rgb(33 20 47)" },
  graphite: { light: "rgb(246 247 248)", dark: "rgb(21 26 33)" }
};

function getTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const palette = document.documentElement.dataset.palette || "lagoon";
  const themeColor = paletteSurfaces[palette][theme];
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = (() => {
      try {
        return window.localStorage.getItem(themeKey);
      } catch {
        return null;
      }
    })();

    if (stored !== "light" && stored !== "dark") {
      const handleSystemTheme = (event) => {
        const nextTheme = event.matches ? "dark" : "light";
        applyTheme(nextTheme);
        setTheme(nextTheme);
      };
      media.addEventListener("change", handleSystemTheme);
      return () => media.removeEventListener("change", handleSystemTheme);
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(themeKey, nextTheme);
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
  }

  const dark = theme === "dark";
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      )}
    </button>
  );
}
