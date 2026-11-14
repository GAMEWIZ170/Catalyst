const mongoose = require("mongoose");
const Mistake = require("../models/mistake.models");
const Question = require("../models/question.models");
const Test = require("../models/test.models");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");
const { testIsVisible } = require("../utils/visibility");
const { studentQuestion } = require("../utils/serializers");

const todayKey = () => new Date().toISOString().slice(0, 10);
const PRACTICE_SIZE = 20;

// Called after every graded answer. A wrong answer adds the question to the queue (or bumps it).
// A right answer counts toward leaving the queue, but only once per UTC day.
const recordAnswer = async (userId, questionId, isCorrect) => {
  if (!isCorrect) {
    await Mistake.updateOne(
      { user: userId, question: questionId },
      { $inc: { wrongCount: 1 }, $set: { lastWrongAt: new Date(), correctStreak: 0, lastCorrectDay: null } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return;
  }
  const mistake = await Mistake.findOneAndUpdate(
    { user: userId, question: questionId, lastCorrectDay: { $ne: todayKey() } },
    { $inc: { correctStreak: 1 }, $set: { lastCorrectDay: todayKey() } },
    { returnDocument: "after" }
  );
  if (mistake && mistake.correctStreak >= 2) await Mistake.deleteOne({ _id: mistake._id });
};

// The student's queue, limited to questions they may still see, each with its course and unit.
// Rows: { mistake, question, course: id, unit: id | null }
const visibleMistakes = async (userId) => {
  const mistakes = await Mistake.find({ user: userId }).sort({ wrongCount: -1, lastWrongAt: -1 }).limit(500).lean();
  if (!mistakes.length) return [];
  const questions = await Question.find({ _id: { $in: mistakes.map((m) => m.question) }, deletedAt: null }).lean();
  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));
  const tests = await Test.find({ _id: { $in: [...new Set(questions.map((q) => q.test.toString()))] }, isPublished: true, deletedAt: null })
    .populate([
      { path: "lesson", select: "isPublished deletedAt unit", populate: { path: "unit", select: "deletedAt course", populate: { path: "course", select: "isPublished deletedAt" } } },
      { path: "unit", select: "deletedAt course", populate: { path: "course", select: "isPublished deletedAt" } },
      { path: "course", select: "isPublished deletedAt" }
    ]).lean();
  const placeByTest = new Map();
  for (const test of tests) {
    if (!testIsVisible(test)) continue;
    if (test.scope === "lesson") placeByTest.set(test._id.toString(), { course: test.lesson.unit.course._id, unit: test.lesson.unit._id });
    else if (test.scope === "unit") placeByTest.set(test._id.toString(), { course: test.unit.course._id, unit: test.unit._id });
    else placeByTest.set(test._id.toString(), { course: test.course._id, unit: null });
  }
  const rows = [];
  for (const mistake of mistakes) {
    const question = questionById.get(mistake.question.toString());
    const place = question && placeByTest.get(question.test.toString());
    if (place) rows.push({ mistake, question, course: place.course, unit: place.unit });
  }
  return rows;
};

// STUDENT: counts of open mistakes by course and unit. No question text and no answers.
const summary = async (req, res, next) => {
  try {
    const rows = await visibleMistakes(req.user.id);
    const courseIds = [...new Set(rows.map((row) => row.course.toString()))];
    const unitIds = [...new Set(rows.filter((row) => row.unit).map((row) => row.unit.toString()))];
    const [courses, units] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }).select("code title").lean(),
      Unit.find({ _id: { $in: unitIds } }).select("title order").lean()
    ]);
    const unitById = new Map(units.map((unit) => [unit._id.toString(), unit]));
    const data = courses.sort((a, b) => a.code.localeCompare(b.code)).map((course) => {
      const own = rows.filter((row) => row.course.toString() === course._id.toString());
      const perUnit = new Map();
      let courseLevel = 0;
      for (const row of own) {
        if (!row.unit) { courseLevel++; continue; }
        perUnit.set(row.unit.toString(), (perUnit.get(row.unit.toString()) || 0) + 1);
      }
      const unitRows = [...perUnit]
        .map(([id, count]) => ({ unitId: id, title: unitById.get(id).title, order: unitById.get(id).order, count }))
        .sort((a, b) => a.order - b.order)
        .map(({ order, ...rest }) => rest);
      return { courseId: course._id, code: course.code, title: course.title, count: own.length, courseLevel, units: unitRows };
    });
    return res.status(200).json({ total: rows.length, data });
  } catch (error) {
    next(error);
  }
};

// STUDENT: up to 20 questions to practise, most-missed first. Optional ?course= and ?unit= narrow it.
// The questions carry no answers; each one is graded by POST /questions/:id/answer like in a test.
const practice = async (req, res, next) => {
  const { course, unit } = req.query;
  for (const id of [course, unit]) {
    if (id !== undefined && !mongoose.isObjectIdOrHexString(String(id))) return res.status(400).json({ message: "Invalid ID" });
  }
  try {
    let rows = await visibleMistakes(req.user.id);
    if (course) rows = rows.filter((row) => row.course.toString() === String(course));
    if (unit) rows = rows.filter((row) => row.unit && row.unit.toString() === String(unit));
    rows = rows.slice(0, PRACTICE_SIZE);
    return res.status(200).json({ data: { title: "Practise my mistakes", questions: rows.map((row) => studentQuestion(row.question)) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { recordAnswer, summary, practice };
