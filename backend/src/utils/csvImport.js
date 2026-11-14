// CSV question import: a small CSV reader, the template, and one function that turns a row into the same body
// the admin question form sends. Each body is then checked by the normal question validators, so an imported
// question follows exactly the same rules as one typed in the editor.

const MAX_ROWS = 200;

const COLUMNS = [
  "type", "text", "option1", "option2", "option3", "option4", "option5", "option6", "correct",
  "answers", "pairs", "items", "equation", "tolerance", "tolerance_kind", "unit",
  "explanation", "hint", "worked_solution", "topic", "source", "year"
];

// RFC 4180: fields may be quoted, quotes inside are doubled, a quoted field may hold commas and line breaks.
const parseCsv = (input) => {
  const text = String(input).replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (quoted) throw new Error("A quoted value is never closed");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
};

const csvEscape = (value) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const TEMPLATE_ROWS = [
  { type: "mcq", text: "Which particle has a negative charge?", option1: "Proton", option2: "Electron", option3: "Neutron", correct: "2", explanation: "Electrons carry a negative charge.", hint: "Think of the charge on cathode rays.", worked_solution: "Protons are positive|Neutrons have no charge|Electrons are negative", topic: "Atomic structure", source: "Mock", year: "2024" },
  { type: "true_false", text: "Sodium is an alkali metal.", correct: "true", explanation: "Sodium is in group 1.", topic: "Periodic table" },
  { type: "multi_select", text: "Which of these are noble gases?", option1: "Helium", option2: "Oxygen", option3: "Neon", option4: "Chlorine", correct: "1,3", topic: "Periodic table" },
  { type: "numeric", text: "How many moles are in 36 g of water? (M = 18 g/mol)", correct: "2", tolerance: "0.05", tolerance_kind: "absolute", unit: "mol", topic: "Mole concept" },
  { type: "fill_blank", text: "The SI unit of amount of substance is the ____.", answers: "mole|mol", topic: "Mole concept" },
  { type: "matching", text: "Match each element to its symbol.", pairs: "Sodium=Na|Potassium=K|Iron=Fe", topic: "Periodic table" },
  { type: "ordering", text: "Put these in order of increasing atomic number.", items: "Hydrogen|Helium|Lithium|Beryllium", topic: "Periodic table" },
  { type: "balancing", text: "Balance the equation.", equation: "2 H2 + O2 -> 2 H2O", topic: "Equations" }
];

const template = () => [COLUMNS.join(","), ...TEMPLATE_ROWS.map((r) => COLUMNS.map((c) => csvEscape(r[c] || "")).join(","))].join("\r\n") + "\r\n";

const split = (value) => value.split("|").map((part) => part.trim()).filter(Boolean);
const LETTERS = "abcdef";
// "2" or "B" (case ignored) becomes a 0-based position. Returns null when it is neither.
const position = (token) => {
  const t = token.trim().toLowerCase();
  if (/^[1-9]$/.test(t)) return Number(t) - 1;
  if (t.length === 1 && LETTERS.includes(t)) return LETTERS.indexOf(t);
  return null;
};

const parseEquation = (value) => {
  const arrow = value.split("->");
  if (arrow.length !== 2) throw new Error("equation must look like 2 H2 + O2 -> 2 H2O");
  const species = [];
  [["reactant", arrow[0]], ["product", arrow[1]]].forEach(([side, part]) => {
    part.split("+").map((s) => s.trim()).filter(Boolean).forEach((item) => {
      const match = /^(\d+)?\s*(\S.*)$/.exec(item);
      if (!match) throw new Error(`cannot read "${item}" in the equation`);
      species.push({ formula: match[2].trim(), side, coefficient: match[1] ? Number(match[1]) : 1 });
    });
  });
  return { species };
};

// Turns one row (an object keyed by column name) into a question body. Throws Error with a plain message.
const rowToBody = (row) => {
  const type = (row.type || "").trim().toLowerCase();
  if (!type) throw new Error("type is empty");
  const body = { type, text: (row.text || "").trim() };
  if (!body.text) throw new Error("text is empty");
  const opt = (name) => (row[name] || "").trim();
  if (opt("explanation")) body.explanation = opt("explanation");
  if (opt("hint")) body.hint = opt("hint");
  if (opt("worked_solution")) body.workedSolution = split(opt("worked_solution"));
  if (opt("topic")) body.topic = opt("topic");
  if (opt("source")) body.source = opt("source");
  if (opt("year")) {
    if (!/^\d{4}$/.test(opt("year"))) throw new Error("year must be a 4-digit year");
    body.year = Number(opt("year"));
  }

  if (type === "mcq" || type === "multi_select") {
    // Options fill from option1 upwards. A gap (option3 empty but option4 filled) is almost always a typo.
    const raw = [1, 2, 3, 4, 5, 6].map((n) => opt(`option${n}`));
    const last = raw.map((o) => o !== "").lastIndexOf(true);
    const options = raw.slice(0, last + 1);
    if (options.some((o) => o === "")) throw new Error("options must be filled in order, with no empty option between two filled ones");
    body.options = options.map((text) => ({ text }));
    const tokens = opt("correct").split(",").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) throw new Error("correct is empty (use the option number, such as 2, or letter, such as B)");
    const spots = tokens.map(position);
    if (spots.some((s) => s === null || s >= options.length)) throw new Error(`correct "${opt("correct")}" does not match the ${options.length} options`);
    if (type === "mcq") {
      if (spots.length !== 1) throw new Error("a multiple choice question has exactly one correct option (use multi_select for several)");
      body.correctIndex = spots[0];
    } else {
      if (new Set(spots).size !== spots.length) throw new Error("correct lists the same option twice");
      body.correctIndexes = spots;
    }
  } else if (type === "true_false") {
    const value = opt("correct").toLowerCase();
    if (value !== "true" && value !== "false") throw new Error("correct must be true or false");
    body.correctAnswer = value;
  } else if (type === "numeric") {
    const value = Number(opt("correct"));
    if (opt("correct") === "" || !Number.isFinite(value)) throw new Error("correct must be a number");
    body.numeric = { value };
    if (opt("tolerance")) {
      const tolerance = Number(opt("tolerance"));
      if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error("tolerance must be a number, 0 or more");
      body.numeric.tolerance = tolerance;
    }
    if (opt("tolerance_kind")) body.numeric.toleranceKind = opt("tolerance_kind").toLowerCase();
    if (opt("unit")) body.numeric.unit = opt("unit");
  } else if (type === "fill_blank") {
    body.acceptedAnswers = split(opt("answers"));
    if (!body.acceptedAnswers.length) throw new Error("answers is empty (separate accepted answers with |)");
  } else if (type === "matching") {
    body.pairs = split(opt("pairs")).map((pair) => {
      const at = pair.indexOf("=");
      if (at < 1 || at === pair.length - 1) throw new Error(`pair "${pair}" must look like left=right`);
      return { left: pair.slice(0, at).trim(), right: pair.slice(at + 1).trim() };
    });
    if (!body.pairs.length) throw new Error("pairs is empty (use left=right|left=right)");
  } else if (type === "ordering") {
    body.items = split(opt("items"));
    if (!body.items.length) throw new Error("items is empty (list them in the correct order, separated by |)");
  } else if (type === "balancing") {
    if (!opt("equation")) throw new Error("equation is empty");
    body.equation = parseEquation(opt("equation"));
  } else {
    throw new Error(`unknown type "${type}"`);
  }
  return body;
};

// Rows -> [{ line, row }] using the header. Unknown columns are reported, missing optional ones are fine.
const readRows = (rows) => {
  if (!rows.length) throw new Error("The file is empty");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const unknown = header.filter((h) => h && !COLUMNS.includes(h));
  if (unknown.length) throw new Error(`Unknown column: ${unknown.join(", ")}. Download the template for the right names.`);
  if (!header.includes("type") || !header.includes("text")) throw new Error("The first row must have at least the columns type and text");
  const data = rows.slice(1);
  if (!data.length) throw new Error("The file has a header but no questions");
  if (data.length > MAX_ROWS) throw new Error(`At most ${MAX_ROWS} questions per file (this one has ${data.length})`);
  return data.map((cells, index) => ({ line: index + 2, row: Object.fromEntries(header.map((h, i) => [h, cells[i] || ""])) }));
};

module.exports = { COLUMNS, MAX_ROWS, parseCsv, template, rowToBody, readRows };
