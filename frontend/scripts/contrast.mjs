// Dev-only. Prints the contrast ratio of every text and UI colour pair in light and dark, read from the oklch tokens in tokens.new.css.
// Run: node scripts/contrast.mjs   (exit code 1 if any pair fails WCAG AA)
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.new.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
  sel: sel.trim(),
  vars: Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)\s*;/g)].map((m) => [m[1], [+m[2], +m[3], +m[4]]]))
}));

const resolve = (theme) => {
  const out = {};
  for (const b of blocks) {
    if (b.sel === ":root" || (theme === "dark" && b.sel === '[data-theme="dark"]')) Object.assign(out, b.vars);
  }
  return out;
};

// oklch to linear sRGB (Bjorn Ottosson's matrices), clamped to the gamut. Luminance is then the WCAG formula.
const lum = ([L, C, h]) => {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const text = [
  ["foreground", "background"], ["foreground", "card"], ["foreground", "muted-ui"], ["foreground", "secondary"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted-ui"],
  ["primary-foreground", "primary"], ["brand-ink", "background"], ["brand-ink", "card"],
  ["destructive-foreground", "destructive"],
  ["on-rate", "rate-again"], ["on-rate", "rate-hard"], ["on-rate", "rate-good"],
  ["success-ui", "background"], ["success-ui", "card"],
  ["warning-ui", "background"], ["warning-ui", "card"],
  ["destructive", "background"], ["destructive", "card"],
  ["info-ui", "background"], ["info-ui", "card"]
].map(([f, b]) => [f, b, 4.5]);
const ui = [["input", "background"], ["input", "card"], ["ring", "background"], ["ring", "card"]]
  .map(([f, b]) => [f, b, 3]);

let fails = 0, checks = 0;
for (const theme of ["light", "dark"]) {
  const v = resolve(theme);
  for (const [f, b, min] of [...text, ...ui]) {
    if (!v[`--${f}`] || !v[`--${b}`]) { fails += 1; checks += 1; console.log(`FAIL ${theme}: missing token ${f} or ${b}`); continue; }
    const r = ratio(v[`--${f}`], v[`--${b}`]);
    checks += 1;
    if (r < min) { fails += 1; console.log(`FAIL ${theme}: ${f} on ${b} = ${r.toFixed(2)} (needs ${min})`); }
  }
}
console.log(`CHECK contrast => ${checks - fails}/${checks} pairs pass in 2 themes (${fails} fail)`);
process.exit(fails ? 1 : 0);
