import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// KaTeX's stylesheet lists woff2, woff and ttf for every font. Keep only woff2 (all current browsers
// support it) so the build does not copy the other two formats.
const katexWoff2Only = {
  name: "katex-woff2-only",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("katex.min.css")) return null;
    return code
      .replace(/,url\([^)]*\.woff\) format\("woff"\)/g, "")
      .replace(/,url\([^)]*\.ttf\) format\("truetype"\)/g, "");
  }
};

export default defineConfig({
  plugins: [katexWoff2Only, react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
