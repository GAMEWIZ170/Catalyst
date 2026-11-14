const QuestionStat = require("../models/questionstat.models");
const Question = require("../models/question.models");
const Test = require("../models/test.models");

const TRUE_FALSE = { true: "True", false: "False" };

// The wrong choice picked most often, as readable text. Only multiple choice and true/false record one.
const topWrong = (stat, question) => {
  const entries = Object.entries(stat.wrong || {}).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const [key, count] = entries[0];
  let label = null;
  if (question.type === "true_false") label = TRUE_FALSE[key];
  else label = (question.options || []).find((option) => String(option._id) === key)?.text || "(option with a picture, or removed)";
  return label ? { label, count } : null;
};

// ADMIN: questions sorted by lowest percent correct. Query: minAttempts (default 5, so one unlucky answer does not
// put a question first), limit (default 50, at most 200). Counting started when this feature was added.
const questionAnalytics = async (req, res, next) => {
  try {
    const minAttempts = Math.max(1, Math.min(10000, parseInt(req.query.minAttempts, 10) || 5));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    // Percent is worked out here, from the stored counts, so the sort needs no extra field in the database.
    const stats = await QuestionStat.aggregate([
      { $match: { attempts: { $gte: minAttempts } } },
      { $addFields: { pct: { $divide: ["$correct", "$attempts"] } } },
      { $sort: { pct: 1, attempts: -1 } },
      { $limit: limit * 3 } // spare rows: some questions or tests may be deleted and are dropped below
    ]);
    const questions = await Question.find({ _id: { $in: stats.map((s) => s.question) }, deletedAt: null })
      .select("text type options._id options.text test topic").lean();
    const byQuestion = new Map(questions.map((q) => [String(q._id), q]));
    const tests = await Test.find({ _id: { $in: [...new Set(questions.map((q) => String(q.test)))] }, deletedAt: null })
      .select("title scope").lean();
    const byTest = new Map(tests.map((t) => [String(t._id), t]));
    const rows = [];
    for (const stat of stats) {
      const question = byQuestion.get(String(stat.question));
      const test = question && byTest.get(String(question.test));
      if (!test) continue;
      rows.push({
        questionId: question._id,
        testId: test._id,
        text: question.text,
        type: question.type,
        topic: question.topic || "",
        testTitle: test.title,
        testScope: test.scope,
        attempts: stat.attempts,
        correct: stat.correct,
        percentCorrect: Math.round((stat.correct / stat.attempts) * 100),
        topWrong: topWrong(stat, question)
      });
      if (rows.length === limit) break;
    }
    return res.status(200).json({ data: { minAttempts, rows } });
  } catch (error) {
    next(error);
  }
};

module.exports = { questionAnalytics };
