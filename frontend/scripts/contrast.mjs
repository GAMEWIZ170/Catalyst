// Dev-only. Prints the contrast ratio of every text and UI colour pair in all 10 palette and mode combinations.
// Run: node scripts/contrast.mjs   (exit code 1 if any pair fails WCAG AA)
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
  sel: sel.trim(),
  vars: Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]))
}));

const palettes = ["lagoon", "indigo", "ember", "orchid", "graphite"];
const resolve = (palette, theme) => {
  const picks = [
    (s) => s === ":root",
    (s) => s === `:root[data-palette="${palette}"]`,
    (s) => theme === "dark" && s === ':root[data-theme="dark"]',
    (s) => theme === "dark" && s === `:root[data-palette="${palette}"][data-theme="dark"]`
  ];
  const out = {};
  for (const pick of picks) for (const b of blocks) if (pick(b.sel)) Object.assign(out, b.vars);
  return out;
};

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const text = [
  ["ink", "paper"], ["ink", "surface"], ["ink", "sunken"], ["ink", "accent-soft"],
  ["muted", "paper"], ["muted", "surface"], ["muted", "sunken"], ["muted", "accent-soft"],
  ["accent", "paper"], ["accent", "surface"], ["accent", "sunken"], ["accent", "accent-soft"],
  ["on-accent", "accent"], ["on-accent", "accent-hover"], ["on-error", "error"],
  ["ink", "success-tint"], ["ink", "warning-tint"], ["ink", "error-tint"], ["ink", "info-tint"],
  ["muted", "success-tint"],
  ["success", "success-tint"], ["success", "surface"], ["success", "paper"],
  ["warning", "warning-tint"], ["warning", "surface"], ["warning", "paper"],
  ["error", "error-tint"], ["error", "surface"], ["error", "paper"],
  ["info", "info-tint"], ["info", "surface"], ["info", "paper"]
].map(([f, b]) => [f, b, 4.5]);
const ui = [["control-line", "surface"], ["control-line", "paper"], ["accent", "paper"], ["accent", "surface"]]
  .map(([f, b]) => [f, b, 3]);

let fails = 0, checks = 0;
for (const theme of ["light", "dark"]) {
  for (const palette of palettes) {
    const v = resolve(palette, theme);
    for (const [f, b, min] of [...text, ...ui]) {
      const r = ratio(v[`--${f}`], v[`--${b}`]);
      checks += 1;
      if (r < min) { fails += 1; console.log(`FAIL ${palette} ${theme}: ${f} on ${b} = ${r.toFixed(2)} (needs ${min})`); }
    }
  }
}
console.log(`CHECK contrast => ${checks - fails}/${checks} pairs pass in 10 combinations (${fails} fail)`);
process.exit(fails ? 1 : 0);
