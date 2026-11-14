const mongoose = require("mongoose");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const TestResult = require("../models/testresult.models");
const Progress = require("../models/progress.models");
const { findVisibleTest, parentIsAvailable } = require("../utils/visibility");
const { studentQuestion, questionForAdmin } = require("../utils/serializers");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const todayKey = () => new Date().toISOString().slice(0, 10);

const getTest = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await findVisibleTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ test: test._id, deletedAt: null })
      .select("_id type text image options order hint")
      .sort({ order: 1 })
      .lean();
    return res.status(200).json({
      data: { _id: test._id, title: test.title, scope: test.scope, order: test.order, passPercent: test.passPercent ?? null, questions: questions.map(studentQuestion) }
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
    if (!questions.length) {
      return res.status(409).json({ message: "This test has no questions yet" });
    }
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
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    // No pass percent means any attempt counts (tests made before this setting existed).
    const passPercent = test.passPercent ?? null;
    const passed = passPercent === null || score >= passPercent;
    if (test.scope === "lesson" && passed) {
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
    return res.status(200).json({ data: { score, correct, total, bestScore: result.bestScore, attempts: result.attempts, passPercent, passed } });
  } catch (error) {
    next(error);
  }
};

const createTest = async (req, res, next) => {
  try {
    const test = new Test(req.body);
    const parent = test[test.scope];
    if (!(await parentIsAvailable(test.scope, parent))) {
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
    const test = await Test.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { returnDocument: "after" });
    if (!test) return res.status(404).json({ message: "Test not found" });
    return res.status(200).json({ message: "Test deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTest, submitTest, createTest, getTestForAdmin, updateTest, deleteTest, studentQuestion, questionForAdmin };
