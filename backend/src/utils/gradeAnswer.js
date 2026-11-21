const crypto = require("crypto");
const fs = require("node:fs");
const path = require("node:path");
const { grade, norm } = require("./grading");
const { complete, AiError } = require("./ai");
const quota = require("./aiQuota");
const AiDraft = require("../modules/lab/aidraft.models");

// Grading for every question type, including short_answer, which the AI marks on the server.
// Use this everywhere an answer is graded: it is async because a short answer may need an AI call.
//
// A short answer arrives as JSON: { "text": "...", "self": true | false }. `self` is the student's own mark and is used
// ONLY when the AI cannot mark (no AI set up, the daily limit reached, or an unusable reply). Otherwise the AI decides,
// so sending self: true cannot buy a right answer while the AI is working.

const MARKING = fs.readFileSync(path.join(__dirname, "../prompts/short-answer-marking.md"), "utf8").replace(/\r\n/g, "\n").trim();
const VERSION = crypto.createHash("sha256").update(MARKING).digest("hex").slice(0, 12);

const parseShort = (answer) => {
  try {
    const value = JSON.parse(answer);
    return { text: typeof value?.text === "string" ? value.text.trim().slice(0, 1000) : "", self: typeof value?.self === "boolean" ? value.self : null };
  } catch {
    return { text: String(answer || "").trim().slice(0, 1000), self: null };
  }
};

const readMark = (reply, points) => {
  const start = reply.indexOf("{"), end = reply.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const data = JSON.parse(reply.slice(start, end + 1));
    if (typeof data.correct !== "boolean") return null;
    const missing = (Array.isArray(data.missing) ? data.missing : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= points).slice(0, 6);
    const feedback = typeof data.feedback === "string" ? data.feedback.trim().slice(0, 500) : "";
    return { correct: data.correct && !missing.length, missing, feedback };
  } catch {
    return null;
  }
};

// Returns { isCorrect, marking: { missing, feedback } } or { selfMark: true } when the AI could not mark it.
const markShortAnswer = async (question, text, userId) => {
  if (!text) return { isCorrect: false, marking: { missing: question.keyPoints.map((_, i) => i + 1), feedback: "No answer was given." } };
  if (norm(text) === norm(question.modelAnswer)) return { isCorrect: true, marking: { missing: [], feedback: "" } };
  const hash = crypto.createHash("sha256").update(`${VERSION}\n${question._id}\n${question.modelAnswer}\n${question.keyPoints.join("\n")}\n${norm(text)}`).digest("hex");
  const saved = userId && await AiDraft.findOne({ owner: userId, kind: "mark", hash }).select("result").lean();
  if (saved) return saved.result;
  if (!userId) return { selfMark: true };
  const slot = await quota.reserve(userId, "mark"); // its own daily allowance, separate from tutor messages
  if (!slot.ok) return { selfMark: true };
  try {
    const points = question.keyPoints.map((point, i) => `${i + 1}. ${point}`).join("\n");
    const reply = await complete({
      messages: [
        { role: "system", content: MARKING },
        { role: "user", content: `<question>\n${question.text}\n</question>\n<model_answer>\n${question.modelAnswer}\n</model_answer>\n<key_points>\n${points}\n</key_points>\n<student_answer>\n${text}\n</student_answer>` }
      ],
      temperature: 0, maxTokens: 300, json: true
    });
    const mark = readMark(reply.text, question.keyPoints.length);
    if (!mark) throw new AiError("bad_output", "The AI mark could not be used");
    await quota.addTokens(userId, reply.usage);
    const result = { isCorrect: mark.correct, marking: { missing: mark.missing, feedback: mark.feedback } };
    await AiDraft.updateOne({ owner: userId, kind: "mark", hash }, { $setOnInsert: { result, model: reply.model || "" } }, { upsert: true }).catch(() => {});
    return result;
  } catch (error) {
    await quota.release(userId, "mark").catch(() => {});
    if (!(error instanceof AiError)) console.error("Short answer marking failed:", error.message);
    return { selfMark: true };
  }
};

// Returns { isCorrect, unitWrong?, marking?, selfMarked?, needsSelfMark? }.
// needsSelfMark: the AI could not mark and the student has not marked it yet, so it counts as not correct for now.
const gradeAnswer = async (question, answer, { userId } = {}) => {
  if (question.type !== "short_answer") return grade(question, answer);
  const { text, self } = parseShort(answer);
  const mark = await markShortAnswer(question, text, userId);
  if (!mark.selfMark) return mark;
  if (self !== null && text) return { isCorrect: self, selfMarked: true };
  return { isCorrect: false, needsSelfMark: Boolean(text) };
};

// Fields a short answer needs when a route loads questions with .select(...).
const GRADE_FIELDS = "type text correctOption correctOptions correctAnswer numeric acceptedAnswers pairs items equation modelAnswer keyPoints";

module.exports = { gradeAnswer, markShortAnswer, GRADE_FIELDS };
