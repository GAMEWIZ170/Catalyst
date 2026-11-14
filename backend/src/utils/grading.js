// Grading for every question type. It runs only on the server. The student sends one string per question:
// a plain value for mcq and true_false, JSON for the other types (see each case).

const norm = (text) => String(text).trim().replace(/\s+/g, " ").toLowerCase();

const parseJson = (answer) => {
  try { return JSON.parse(answer); } catch { return undefined; }
};

// A shuffle that always gives the same order for the same question, so the server can
// rebuild the order the student was shown without storing it. (mulberry32 seeded by the id.)
const shuffleOrder = (count, seed) => {
  let h = 1779033703;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353) << 13 | h >>> 19;
  let state = h >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Never show the answer order itself.
  if (count > 1 && order.every((value, i) => value === i)) order.push(order.shift());
  return order;
};

const isIntArray = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isInteger);

// Returns { isCorrect, unitWrong } where unitWrong is true only for a numeric answer whose number is right and unit is not.
const grade = (question, answer) => {
  switch (question.type) {
    case "mcq":
      return { isCorrect: answer === question.correctOption.toString() };
    case "true_false":
      return { isCorrect: String(answer).toLowerCase() === question.correctAnswer };
    case "multi_select": {
      const chosen = parseJson(answer);
      if (!Array.isArray(chosen)) return { isCorrect: false };
      const right = question.correctOptions.map(String).sort();
      const given = [...new Set(chosen.map(String))].sort();
      return { isCorrect: right.length === given.length && right.every((id, i) => id === given[i]) };
    }
    case "fill_blank":
      return { isCorrect: question.acceptedAnswers.some((accepted) => norm(accepted) === norm(answer)) };
    case "numeric": {
      const given = parseJson(answer);
      if (!given || typeof given !== "object") return { isCorrect: false };
      const text = String(given.value ?? "").trim();
      const value = text === "" ? NaN : Number(text);
      if (!Number.isFinite(value)) return { isCorrect: false };
      const { value: target, tolerance = 0, toleranceKind = "absolute", unit = "" } = question.numeric;
      const allowed = toleranceKind === "percent" ? Math.abs(target) * tolerance / 100 : tolerance;
      const numberOk = Math.abs(value - target) <= allowed + Math.abs(target) * 1e-12;
      const unitOk = !unit || norm(given.unit ?? "") === norm(unit);
      return { isCorrect: numberOk && unitOk, unitWrong: numberOk && !unitOk };
    }
    case "matching": {
      const picks = parseJson(answer);
      const { pairs } = question;
      if (!isIntArray(picks, pairs.length)) return { isCorrect: false };
      const order = shuffleOrder(pairs.length, question._id);
      return { isCorrect: picks.every((pick, i) => pick >= 0 && pick < pairs.length && pairs[order[pick]].right === pairs[i].right) };
    }
    case "ordering": {
      const picks = parseJson(answer);
      const { items } = question;
      if (!isIntArray(picks, items.length)) return { isCorrect: false };
      const order = shuffleOrder(items.length, question._id);
      return { isCorrect: picks.every((pick, i) => pick >= 0 && pick < items.length && items[order[pick]] === items[i]) };
    }
    case "balancing": {
      const given = parseJson(answer);
      const { species } = question.equation;
      if (!isIntArray(given, species.length)) return { isCorrect: false };
      return { isCorrect: given.every((coefficient, i) => coefficient === species[i].coefficient) };
    }
    default:
      return { isCorrect: false };
  }
};

// What a student sees after answering, shaped per type.
const correctAnswerOf = (question) => {
  switch (question.type) {
    case "mcq":
      return question.options.find((option) => option._id.toString() === question.correctOption.toString());
    case "true_false":
      return question.correctAnswer;
    case "multi_select": {
      const right = new Set(question.correctOptions.map(String));
      return question.options.filter((option) => right.has(option._id.toString()));
    }
    case "fill_blank":
      return question.acceptedAnswers;
    case "numeric":
      return question.numeric;
    case "matching":
      return question.pairs;
    case "ordering":
      return question.items;
    case "balancing":
      return question.equation.species.map((item) => item.coefficient);
    default:
      return null;
  }
};

module.exports = { grade, correctAnswerOf, shuffleOrder, norm };
