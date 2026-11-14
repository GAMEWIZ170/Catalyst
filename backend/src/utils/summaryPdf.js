// Builds a unit summary PDF from lesson text, with pdf-lib and its built-in fonts (no font files, no other package).
//
// What it can and cannot do, on purpose:
//  - Text only. Pictures, videos and live formulas are not drawn.
//  - The built-in fonts hold Western European letters only. Formulas are written out as plain text
//    ("H2O", "x^2", "(a)/(b)"), and any other character that the font lacks is replaced (Greek letters become their
//    names, arrows become "->"; anything else becomes "?").
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { tokenize } = require("./math");

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 56;
const BODY = 11;
const LEADING = 15;

const WORDS = {
  alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta", epsilon: "epsilon", theta: "theta", lambda: "lambda",
  mu: "mu", nu: "nu", pi: "pi", rho: "rho", sigma: "sigma", tau: "tau", phi: "phi", omega: "omega",
  Delta: "Delta", Gamma: "Gamma", Theta: "Theta", Lambda: "Lambda", Pi: "Pi", Sigma: "Sigma", Phi: "Phi", Omega: "Omega",
  rightarrow: "->", to: "->", longrightarrow: "->", leftarrow: "<-", leftrightarrow: "<->",
  rightleftharpoons: "<=>", rightleftarrows: "<=>", Rightarrow: "=>",
  times: "x", cdot: "*", pm: "+/-", leq: "<=", geq: ">=", neq: "!=", approx: "~", infty: "infinity", circ: "deg",
  uparrow: "(up)", downarrow: "(down)", ldots: "...", dots: "..."
};

// Draws a formula's TeX as readable plain text. Not a TeX engine: simple formulas come out right, odd ones stay close.
const texToText = (tex) => {
  let t = tex;
  const again = (pattern, replace) => {
    for (let i = 0; i < 12; i++) {
      const next = t.replace(pattern, replace);
      if (next === t) break;
      t = next;
    }
  };
  again(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  again(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)");
  again(/\\(?:ce|text|mathrm|mathbf|mathit|textbf|operatorname)\s*\{([^{}]*)\}/g, "$1");
  again(/([\^_])\{([^{}]*)\}/g, (_, mark, inner) => (inner.length === 1 ? `${mark}${inner}` : `${mark}(${inner})`));
  t = t.replace(/\\([A-Za-z]+)/g, (_, name) => (Object.prototype.hasOwnProperty.call(WORDS, name) ? WORDS[name] : ""));
  t = t.replace(/\\[,;:! ]/g, " ").replace(/[{}\\]/g, "");
  return t.replace(/\s+/g, " ").trim();
};

// Lesson text with $formulas$ turned into plain text.
const lessonText = (explanation) => tokenize(String(explanation || "")).map((part) => {
  if (part.type === "text") return part.value;
  const text = texToText(part.value);
  return part.type === "block" ? `\n${text}\n` : text;
}).join("");

// Greek letters typed straight into a lesson (outside a formula) are written as their names.
const GREEK = {
  "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon", "θ": "theta", "λ": "lambda",
  "μ": "mu", "ν": "nu", "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "φ": "phi", "ω": "omega",
  "Δ": "Delta", "Γ": "Gamma", "Θ": "Theta", "Λ": "Lambda", "Π": "Pi", "Σ": "Sigma", "Φ": "Phi", "Ω": "Omega"
};

// Keeps only characters the font can draw; the rest are replaced, never thrown on.
const fit = (text, font) => {
  const supported = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of String(text).replace(/\r/g, "").replace(/\t/g, "  ")) {
    const code = ch.codePointAt(0);
    if (ch === "\n" || supported.has(code)) out += ch;
    else if (ch === "→") out += "->";
    else if (ch === "←") out += "<-";
    else if (ch === "⇌") out += "<=>";
    else if (ch === "−") out += "-";
    else if (ch === "≤") out += "<=";
    else if (ch === "≥") out += ">=";
    else if (GREEK[ch]) out += GREEK[ch];
    else if (/[₀-₉]/.test(ch)) out += String(code - 0x2080);
    else if (/[   ]/.test(ch)) out += " ";
    else out += "?";
  }
  return out;
};

// Splits one paragraph into lines no wider than maxWidth. A word wider than a line is cut.
const wrap = (text, font, size, maxWidth) => {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const attempt = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) <= maxWidth) { line = attempt; continue; }
    if (line) lines.push(line);
    let rest = word;
    while (font.widthOfTextAtSize(rest, size) > maxWidth) {
      let cut = rest.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  lines.push(line);
  return lines;
};

// lessons: [{ title, explanation }] in order. Returns the PDF as a Buffer.
const buildUnitSummary = async ({ courseCode, courseTitle, unitTitle, lessons }) => {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.11, 0.09);
  const muted = rgb(0.37, 0.34, 0.29);
  const width = PAGE.width - MARGIN * 2;
  let page;
  let y;

  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN;
  };
  const write = (text, { font = regular, size = BODY, color = ink, indent = 0, after = 0 } = {}) => {
    const clean = fit(text, font);
    for (const paragraph of clean.split("\n")) {
      const lines = paragraph.trim() === "" ? [""] : wrap(paragraph, font, size, width - indent);
      for (const line of lines) {
        if (y - size < MARGIN + 24) newPage();
        if (line) page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color });
        y -= size === BODY ? LEADING : size * 1.3;
      }
    }
    y -= after;
  };

  newPage();
  pdf.setTitle(fit(`${unitTitle} - summary`, regular));
  pdf.setProducer("Catalyst");
  pdf.setCreator("Catalyst");
  write(courseCode || "", { font: bold, size: 11, color: muted, after: 4 });
  write(unitTitle, { font: bold, size: 24, after: 2 });
  write(courseTitle || "", { size: 12, color: muted, after: 4 });
  write(`Summary of ${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}. Formulas are written as plain text. Pictures and videos are not included.`, { size: 9, color: muted, after: 18 });

  lessons.forEach((lesson, index) => {
    if (y < MARGIN + 120) newPage();
    write(`${index + 1}. ${lesson.title}`, { font: bold, size: 15, after: 6 });
    write(lessonText(lesson.explanation), { after: 18 });
  });

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(fit(`Catalyst - ${unitTitle}`, regular).slice(0, 70), { x: MARGIN, y: 28, size: 8, font: regular, color: muted });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, { x: PAGE.width - MARGIN - regular.widthOfTextAtSize(label, 8), y: 28, size: 8, font: regular, color: muted });
  });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
};

module.exports = { buildUnitSummary, texToText, lessonText };
