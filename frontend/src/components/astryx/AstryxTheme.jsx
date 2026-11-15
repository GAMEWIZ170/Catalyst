import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "@astryxdesign/theme-neutral/fonts.css";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { currentTheme } from "../../utils/appearance";

// UI library trial (branch feature/astryx-trial). Wraps one screen in the Astryx theme.
// Our app owns <html data-theme>. Astryx's root Theme also writes it, and deletes it on unmount.
// So this wrapper follows our light/dark switch and puts the attribute back when it unmounts.
export default function AstryxTheme({ children }) {
  const [mode, setMode] = useState(currentTheme);
  const latest = useRef(mode);
  latest.current = mode;

  useEffect(() => {
    const root = document.documentElement;
    const watcher = new MutationObserver(() => setMode(currentTheme()));
    watcher.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      watcher.disconnect();
      root.dataset.theme = latest.current;
    };
  }, []);

  return <Theme theme={neutralTheme} mode={mode}>
    <LinkProvider component={Link}>{children}</LinkProvider>
  </Theme>;
}
