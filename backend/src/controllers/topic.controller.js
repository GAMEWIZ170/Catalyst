const Question = require("../models/question.models");
const Test = require("../models/test.models");
const { testIsVisible, testPopulate } = require("../utils/visibility");
const { studentQuestion } = require("../utils/serializers");

const PRACTICE_SIZE = 20;

// Tagged questions a student may see (their test and every parent is published and not deleted).
const visibleTagged = async (match) => {
  const questions = await Question.find({ deletedAt: null, ...match }).select("test topic source year").limit(2000).lean();
  if (!questions.length) return [];
  const tests = await Test.find({ _id: { $in: [...new Set(questions.map((q) => q.test.toString()))] }, isPublished: true, deletedAt: null })
    .populate(testPopulate).lean();
  const visible = new Set(tests.filter(testIsVisible).map((test) => test._id.toString()));
  return questions.filter((question) => visible.has(question.test.toString()));
};

const countOf = (items, keyOf) => {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (key === "" || key == null) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
};

// STUDENT: the topics, sources and years that have questions to practise, with counts.
const list = async (req, res, next) => {
  try {
    const tagged = await visibleTagged({ $or: [{ topic: { $nin: ["", null] } }, { source: { $nin: ["", null] } }, { year: { $ne: null } }] });
    const entries = (map) => [...map].map(([value, count]) => ({ value, count }));
    return res.status(200).json({
      data: {
        topics: entries(countOf(tagged, (q) => q.topic)).sort((a, b) => a.value.localeCompare(b.value)),
        sources: entries(countOf(tagged, (q) => q.source)).sort((a, b) => a.value.localeCompare(b.value)),
        years: entries(countOf(tagged, (q) => q.year)).sort((a, b) => b.value - a.value)
      }
    });
  } catch (error) {
    next(error);
  }
};

// STUDENT: up to 20 answer-free questions across lessons, in random order, for a topic, source and/or year.
// Each is graded by POST /questions/:id/answer.
const practice = async (req, res, next) => {
  const { topic, source, year } = req.query;
  const text = (value) => typeof value === "string" ? value.trim().slice(0, 60) : "";
  const yearNumber = year === undefined || year === "" ? null : Number(year);
  if (yearNumber !== null && !Number.isInteger(yearNumber)) return res.status(400).json({ message: "Invalid year" });
  const match = {};
  if (text(topic)) match.topic = text(topic);
  if (text(source)) match.source = text(source);
  if (yearNumber !== null) match.year = yearNumber;
  if (!Object.keys(match).length) return res.status(400).json({ message: "Choose a topic, source or year" });
  try {
    const tagged = await visibleTagged(match);
    for (let i = tagged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
    }
    const questions = await Question.find({ _id: { $in: tagged.slice(0, PRACTICE_SIZE).map((q) => q._id) } }).lean();
    const order = new Map(tagged.map((q, index) => [q._id.toString(), index]));
    questions.sort((a, b) => order.get(a._id.toString()) - order.get(b._id.toString()));
    return res.status(200).json({ data: { title: text(topic) ? `Practise: ${text(topic)}` : "Practise by topic", questions: questions.map(studentQuestion) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, practice };
