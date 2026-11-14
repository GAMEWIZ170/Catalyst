// KaTeX on the server. When an admin saves a lesson, every formula in its explanation is turned into HTML here, once,
// and stored with the lesson. A phone then shows the stored HTML and never has to download or run KaTeX (about 80 KB
// of script) to read the lesson.
//
// Safety: the HTML is made only here, from the admin's own text, with trust:false. The browser never sends HTML to
// store. The stored entries are looked up by their formula text, so an entry that no longer matches the explanation
// is simply never used, and a formula with no entry is still drawn by the browser as before.
const katex = require("katex");
require("katex/contrib/mhchem");

const MAX_FORMULA = 500;   // longer formulas are left as plain text, like the browser does
const MAX_FORMULAS = 300;  // per lesson: a limit on work done during one save

// Splits text into plain text and $inline$ / $$block$$ formulas. This is the same algorithm as tokenize() in
// frontend/src/components/RichText.jsx: keep the two in step, or the browser will not find the stored entries.
const tokenize = (source) => {
  const parts = [];
  let text = "";
  let index = 0;
  const flush = () => {
    if (text) {
      parts.push({ type: "text", value: text });
      text = "";
    }
  };
  while (index < source.length) {
    if (source[index] === "\\" && source[index + 1] === "$") {
      text += "$";
      index += 2;
      continue;
    }
    if (source[index] !== "$") {
      text += source[index++];
      continue;
    }
    const block = source[index + 1] === "$";
    const start = index + (block ? 2 : 1);
    let end = start;
    while (end < source.length) {
      if (source[end] === "\\" && source[end + 1] === "$") {
        end += 2;
        continue;
      }
      if (source[end] === "$" && (!block || source[end + 1] === "$")) break;
      end += 1;
    }
    if (end >= source.length) {
      text += block ? "$$" : "$";
      index += block ? 2 : 1;
      continue;
    }
    const formula = source.slice(start, end);
    if (formula.length > MAX_FORMULA) {
      text += source.slice(index, end + (block ? 2 : 1));
    } else {
      flush();
      parts.push({ type: block ? "block" : "inline", value: formula });
    }
    index = end + (block ? 2 : 1);
  }
  flush();
  return parts;
};

// Same options as the browser uses, so the stored HTML matches what the browser would have drawn.
const renderFormula = (source) => {
  try {
    const html = katex.renderToString(source, { throwOnError: false, trust: false, strict: "ignore", output: "htmlAndMathml" });
    return html.includes("katex-error") ? null : html;
  } catch {
    return null;
  }
};

// The list stored with a lesson: one entry per different formula, { s: formula text, b: block?, h: html }.
// A formula that does not render is stored with h: null, which tells the browser "this cannot be drawn, show the
// plain text" without downloading KaTeX just to fail again.
const prerenderMath = (text) => {
  const seen = new Set();
  const entries = [];
  for (const part of tokenize(String(text || ""))) {
    if (part.type === "text") continue;
    const block = part.type === "block";
    const key = `${block ? "b" : "i"}:${part.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const html = renderFormula(part.value);
    entries.push({ s: part.value, b: block, h: html });
    if (entries.length >= MAX_FORMULAS) break;
  }
  return entries;
};

module.exports = { tokenize, prerenderMath };
