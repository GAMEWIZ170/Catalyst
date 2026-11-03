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
  return parts;
}

function Formula({ source, block }) {
  const [html, setHtml] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      import("katex"),
      import("katex/contrib/mhchem"),
      import("katex/dist/katex.min.css")
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
  }, [source]);
  if (!html) return <span>{block ? `$$${source}$$` : `$${source}$`}</span>;
  return <span className={`rich-formula ${block ? "rich-formula--block" : ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function RichText({ children = "", className = "" }) {
  const parts = useMemo(() => tokenize(String(children)), [children]);
  return <span className={`rich-text ${className}`.trim()}>{parts.map((part, index) => part.type === "text"
    ? <span key={index}>{part.value.split("\n").map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < part.value.split("\n").length - 1 && <br />}</span>)}</span>
    : <Formula key={index} source={part.value} block={part.type === "block"} />)}</span>;
}
