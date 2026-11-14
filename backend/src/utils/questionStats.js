const QuestionStat = require("../models/questionstat.models");

// The wrong choice worth counting. Only multiple choice and true/false have a single wrong choice to name;
// the other types still count attempts and right answers. The key is checked, so a student cannot write odd field names.
const wrongKey = (question, answer) => {
  if (typeof answer !== "string") return null;
  if (question.type === "mcq") return /^[0-9a-f]{24}$/.test(answer) ? answer : null;
  if (question.type === "true_false") return answer === "true" || answer === "false" ? answer : null;
  return null;
};

// Adds one answer to the question's totals. Never throws: a stats failure must not break answering.
// Practice and mock exams count too. Admin previews never call this.
const recordStat = async (question, answer, isCorrect) => {
  try {
    const inc = { attempts: 1 };
    if (isCorrect) inc.correct = 1;
    else {
      const key = wrongKey(question, answer);
      if (key) inc[`wrong.${key}`] = 1;
    }
    await QuestionStat.updateOne({ question: question._id }, { $inc: inc }, { upsert: true });
  } catch (error) {
    console.error("Question stat failed:", error.message);
  }
};

module.exports = { recordStat };
