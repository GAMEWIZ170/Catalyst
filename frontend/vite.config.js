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

// Caching rules for the built site. Files in /assets have a hash in their name, so a changed file gets a new
// name and the old one can be kept for a year. index.html names those files, so it must be checked every time.
// This applies to `vite preview`. Whatever serves dist/ in production needs the same two rules.
const cacheHeaders = {
  name: "cache-headers",
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = (request.url || "").split("?")[0];
      if (path.startsWith("/assets/")) response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      // The service worker file and the manifest must be re-checked every time, or a fix could never reach phones.
      else if (path === "/" || path.endsWith(".html") || !path.includes(".") || path === "/sw.js" || path === "/manifest.webmanifest") response.setHeader("Cache-Control", "no-cache");
      next();
    });
  }
};

export default defineConfig({
  plugins: [katexWoff2Only, cacheHeaders, react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
