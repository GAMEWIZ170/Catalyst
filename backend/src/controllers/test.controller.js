const mongoose = require("mongoose");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const TestResult = require("../models/testresult.models");
const Progress = require("../models/progress.models");
const { findVisibleTest } = require("../utils/visibility");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const todayKey = () => new Date().toISOString().slice(0, 10);

const questionForAdmin = (question) => {
  const data = question.toObject ? question.toObject() : question;
  return {
    ...data,
    correctIndex: data.type === "mcq"
      ? data.options.findIndex((option) => option._id.toString() === data.correctOption.toString())
      : undefined
  };
};

const studentQuestion = (question) => ({
  _id: question._id,
  type: question.type,
  text: question.text,
  image: question.image,
  ...(question.type === "mcq" ? {
    options: question.options.map((option) => ({ _id: option._id, text: option.text, image: option.image }))
  } : {}),
  order: question.order
});

const getTest = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await findVisibleTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ test: test._id, deletedAt: null })
      .select("_id type text image options order")
      .sort({ order: 1 })
      .lean();
    return res.status(200).json({
      data: { _id: test._id, title: test.title, scope: test.scope, order: test.order, questions: questions.map(studentQuestion) }
    });
  } catch (error) {
    next(error);
  }
};

const submitTest = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await findVisibleTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ test: test._id, deletedAt: null })
      .select("type correctOption correctAnswer")
      .lean();
    const given = new Map(req.body.answers.map((answer) => [answer.questionId, answer.answer]));
    let correct = 0;
    for (const question of questions) {
      const answer = given.get(question._id.toString());
      if (answer !== undefined && (
        question.type === "mcq"
          ? answer === question.correctOption.toString()
          : answer.toLowerCase() === question.correctAnswer
      )) correct++;
    }
    const total = questions.length;
    const score = total === 0 ? 100 : Math.round((correct / total) * 100);
    const result = await TestResult.findOneAndUpdate(
      { user: req.user.id, test: test._id },
      {
        $max: { bestScore: score },
        $set: { lastScore: score },
        $inc: { attempts: 1 },
        $setOnInsert: { completedAt: new Date() },
        $addToSet: { completedDays: todayKey() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (test.scope === "lesson") {
      await Progress.findOneAndUpdate(
        { user: req.user.id, lesson: test.lesson._id },
        {
          $max: { score },
          $set: { completed: true },
          $setOnInsert: { completedAt: new Date() },
          $addToSet: { completedDays: todayKey() }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
    return res.status(200).json({ data: { score, correct, total, bestScore: result.bestScore, attempts: result.attempts } });
  } catch (error) {
    next(error);
  }
};

const createTest = async (req, res, next) => {
  try {
    const test = new Test(req.body);
    const parent = test.scope === "lesson" ? test.lesson : test.scope === "unit" ? test.unit : test.course;
    const Model = test.scope === "lesson" ? require("../models/lesson.models") :
      test.scope === "unit" ? require("../models/unit.models") : require("../models/course.models");
    const record = await Model.findOne({ _id: parent, deletedAt: null }).populate(
      test.scope === "lesson" ? { path: "unit", populate: { path: "course" } } :
        test.scope === "unit" ? { path: "course" } : null
    );
    if (!record || (test.scope === "lesson" && (!record.unit || record.unit.deletedAt || !record.unit.course || record.unit.course.deletedAt)) ||
      (test.scope === "unit" && (!record.course || record.course.deletedAt))) {
      return res.status(404).json({ message: "Parent not found" });
    }
    await test.save();
    return res.status(201).json({ message: "Test created successfully", data: test });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

const getTestForAdmin = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await Test.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ test: test._id, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: { ...test, questions: questions.map(questionForAdmin) } });
  } catch (error) {
    next(error);
  }
};

const updateTest = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await Test.findOne({ _id: req.params.id, deletedAt: null });
    if (!test) return res.status(404).json({ message: "Test not found" });
    test.set(req.body);
    await test.save();
    return res.status(200).json({ message: "Test updated successfully", data: test });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

const deleteTest = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await Test.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { new: true });
    if (!test) return res.status(404).json({ message: "Test not found" });
    return res.status(200).json({ message: "Test deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTest, submitTest, createTest, getTestForAdmin, updateTest, deleteTest, studentQuestion, questionForAdmin };
