// The study companion's brain: picks the parts of a lesson or set that fit the question, builds the tutor prompt, and checks
// the answer. No vector database: parts are split at paragraphs and ranked by the words they share with the question.
const fs = require("node:fs");
const path = require("node:path");

const EXCERPT_CHARS = 5000;   // all excerpts together, inside the model's 12,000 character input limit
const PIECE = 700;            // about one paragraph
const HISTORY_TURNS = 6;

const STOP = new Set("the and for are but not you your with that this from have has had was were what when where which who how why can could would should about into than then them they their there these those will just also does did its it's is in on of to a an as at by be or if so do me my we".split(" "));
const words = (text) => new Set((String(text).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((word) => !STOP.has(word)));

// Splits text into pieces of about PIECE characters at paragraph breaks, remembering the last heading above each piece.
const toPieces = (text, label) => {
  const pieces = [];
  let heading = "";
  let current = "";
  const flush = () => {
    const clean = current.trim();
    if (clean) pieces.push({ text: clean, label: heading ? `${label} › ${heading}` : label });
    current = "";
  };
  for (const paragraph of String(text).replace(/\r/g, "").split(/\n{2,}|\n(?=#{1,4}\s)/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    const found = /^#{1,4}\s+(.+)$/m.exec(trimmed.split("\n")[0]);
    if (found) { flush(); heading = found[1].trim().slice(0, 80); }
    if (current && current.length + trimmed.length > PIECE) flush();
    current += `${trimmed}\n\n`;
    if (current.length >= PIECE) flush();
  }
  flush();
  return pieces;
};

// sources: [{ label, text, link }]. Returns up to EXCERPT_CHARS of the most relevant pieces, in reading order, numbered from 1.
const pickExcerpts = (sources, question) => {
  const asked = words(question);
  const all = sources.flatMap((source) => toPieces(source.text, source.label).map((piece) => ({ ...piece, link: source.link })));
  all.forEach((piece, index) => { piece.index = index; piece.score = [...words(piece.text)].filter((word) => asked.has(word)).length; });
  const ranked = [...all].sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = [];
  let size = 0;
  for (const piece of ranked) {
    if (size + piece.text.length > EXCERPT_CHARS) continue;
    if (piece.score === 0 && chosen.length > 0) break; // nothing else matches: stop, do not pad with unrelated text
    chosen.push(piece);
    size += piece.text.length;
  }
  return chosen.sort((a, b) => a.index - b.index).map((piece, i) => ({ n: i + 1, label: piece.label, text: piece.text, link: piece.link }));
};

// The tutor's rules live in their own file so they can be edited as plain text. Read once when the server starts
// (restart the backend after editing it). Windows line endings and the trailing newline are removed.
const TUTOR = fs.readFileSync(path.join(__dirname, "../prompts/tutor-system.md"), "utf8").replace(/\r\n/g, "\n").trim();

const systemPrompt = (excerpts) => `${TUTOR}\n\nExcerpts:\n${excerpts.length ? excerpts.map((e) => `[${e.n}] (${e.label})\n${e.text}`).join("\n\n") : "(none found for this question)"}`;

// The last few turns the browser sent, trimmed. Only user and assistant turns, each a short piece of text.
const cleanHistory = (messages) => messages.slice(-HISTORY_TURNS).map((message) => ({ role: message.role, content: message.content.trim().slice(0, 1000) }));

// A reply that states the final answer instead of hinting. The tutor is told once more, then the retry is used.
const LEAKS = /\b(?:the\s+)?(?:correct\s+|right\s+|final\s+)?answer\s+(?:is|would\s+be|should\s+be)\b|(?:^|\n)\s*(?:correct\s+)?answer\s*:/i;
const givesAnswer = (reply) => LEAKS.test(reply);
const STRICTER = "Your last reply gave the final answer. Rewrite it as a hint only: say what to think about next and ask the student to try. Do not state the answer.";

// Which excerpt numbers the reply cites.
const citedNumbers = (reply) => new Set([...String(reply).matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])));

module.exports = { pickExcerpts, systemPrompt, cleanHistory, givesAnswer, citedNumbers, STRICTER, toPieces, words, EXCERPT_CHARS };
