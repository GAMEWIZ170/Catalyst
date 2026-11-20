import { useEffect, useMemo, useState } from "react";

function tokenize(source) {
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
    if (formula.length > 500) {
      text += source.slice(index, end + (block ? 2 : 1));
    } else {
      flush();
      parts.push({ type: block ? "block" : "inline", value: formula });
    }
    index = end + (block ? 2 : 1);
  }
  flush();
  // A block formula already sits on its own line with its own margin. The blank lines the author typed
  // around it would add empty lines on top of that margin, so drop them.
  parts.forEach((part, at) => {
    if (part.type !== "block") return;
    const before = parts[at - 1], after = parts[at + 1];
    if (before?.type === "text") before.value = before.value.replace(/[ \t]*(\r?\n[ \t]*)+$/, "");
    if (after?.type === "text") after.value = after.value.replace(/^[ \t]*(\r?\n[ \t]*)+/, "");
  });
  return parts;
}

// stored: what the server found when the lesson was saved (see backend/src/utils/math.js): the HTML it drew for this
// formula, or null when the formula cannot be drawn (then the plain text is shown). undefined means it has no entry.
// With an entry, only the small stylesheet is loaded (and nothing at all for null); the KaTeX script (about 80 KB)
// is never downloaded. Without an entry
// (older lessons, or a formula the server could not draw) the browser draws the formula itself, as before.
function Formula({ source, block, stored }) {
  const [html, setHtml] = useState(stored || null);
  const known = stored !== undefined;
  useEffect(() => {
    let active = true;
    if (known) {
      setHtml(stored);
      if (stored) import("./katexStyles").catch(() => {});
      return undefined;
    }
    Promise.all([
      import("katex"),
      import("katex/contrib/mhchem"),
      import("./katexStyles")
    ]).then(([module]) => {
      if (!active) return;
      try {
        const rendered = module.default.renderToString(source, {
          throwOnError: false,
          trust: false,
          strict: "ignore",
          output: "htmlAndMathml"
        });
        setHtml(rendered.includes("katex-error") ? null : rendered);
      } catch {
        setHtml(null);
      }
    }).catch(() => setHtml(null));
    return () => { active = false; };
  }, [source, stored, known]);
  if (!html) return <span>{block ? `$$${source}$$` : `$${source}$`}</span>;
  return <span className={`inline-block max-w-full overflow-x-auto overflow-y-hidden py-[0.1em] align-middle ${block ? "!my-3 !mx-auto !block text-center" : ""}`} {...(block ? { tabIndex: 0, role: "group", "aria-label": "Formula (scrolls sideways)" } : {})} dangerouslySetInnerHTML={{ __html: html }} />;
}

// math: the server's stored formulas for this text, [{ s: formula, b: block?, h: html }]. Optional.
// Entries are found by formula text, so an entry for text that has since changed is never used.
export default function RichText({ children = "", className = "", math }) {
  const parts = useMemo(() => tokenize(String(children)), [children]);
  const stored = useMemo(() => new Map((math || []).map((entry) => [`${entry.b ? "b" : "i"}:${entry.s}`, entry.h])), [math]);
  return <span className={`[overflow-wrap:anywhere] ${className}`.trim()}>{parts.map((part, index) => part.type === "text"
    ? <span key={index}>{part.value.split("\n").map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < part.value.split("\n").length - 1 && <br />}</span>)}</span>
    : <Formula key={index} source={part.value} block={part.type === "block"} stored={stored.get(`${part.type === "block" ? "b" : "i"}:${part.value}`)} />)}</span>;
}
