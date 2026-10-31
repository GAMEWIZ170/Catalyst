const mongoose = require("mongoose");
const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const TestResult = require("../models/testresult.models");
const Flashcard = require("../models/flashcard.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const { findVisibleLesson, findTestsWithQuestions, findTestQuestionCounts } = require("../utils/visibility");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);

const studentTestSummary = async (tests, userId) => {
  const results = await TestResult.find({ user: userId, test: { $in: tests.map((test) => test._id) } })
    .select("test bestScore").lean();
  const scoreByTest = new Map(results.map((item) => [item.test.toString(), item.bestScore]));
  return tests.map((test) => ({
    _id: test._id,
    title: test.title,
    order: test.order,
    questionCount: test.questionCount,
    bestScore: scoreByTest.get(test._id.toString()) ?? null
  }));
};

const adminTestSummary = (tests) => tests.map((test) => ({
  _id: test._id,
  title: test.title,
  order: test.order,
  questionCount: test.questionCount
}));

const studentFlashcardSummary = async (lessonId, userId) => {
  const cards = await Flashcard.find({ lesson: lessonId, isPublished: true, deletedAt: null }).select("_id").lean();
  const progress = await FlashcardProgress.find({ user: userId, flashcard: { $in: cards.map((card) => card._id) } })
    .select("flashcard confidence").lean();
  const confidence = new Map(progress.map((item) => [item.flashcard.toString(), item.confidence]));
  const summary = { total: cards.length, confident: 0, unsure: 0, unknown: 0, unrated: 0 };
  for (const card of cards) {
    const rating = confidence.get(card._id.toString());
    if (rating) summary[rating]++;
    else summary.unrated++;
  }
  return summary;
};

const getLessonByID = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await findVisibleLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: `Lesson with ID ${req.params.id} not found` });
    const tests = await findTestsWithQuestions({ scope: "lesson", lesson: lesson._id, isPublished: true, deletedAt: null });
    return res.status(200).json({
      data: {
        _id: lesson._id,
        unit: lesson.unit._id,
        title: lesson.title,
        order: lesson.order,
        explanation: lesson.explanation,
        explanationImage: lesson.explanationImage,
        videoHost: lesson.videoHost,
        videoId: lesson.videoId,
        tests: await studentTestSummary(tests, req.user.id),
        flashcards: await studentFlashcardSummary(lesson._id, req.user.id)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getLessonForAdmin = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const tests = await findTestQuestionCounts({ scope: "lesson", lesson: lesson._id, deletedAt: null });
    const flashcards = await Flashcard.find({ lesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: { ...lesson, tests: adminTestSummary(tests), flashcards } });
  } catch (error) {
    next(error);
  }
};

const createLesson = async (req, res, next) => {
  try {
    const unit = await Unit.findOne({ _id: req.body.unit, deletedAt: null }).populate("course", "deletedAt");
    if (!unit || !unit.course || unit.course.deletedAt) return res.status(404).json({ message: "Unit not found" });
    const lesson = await Lesson.create(req.body);
    return res.status(201).json({ message: "Lesson created successfully", data: lesson });
  } catch (error) {
    next(error);
  }
};

const updateLesson = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    if (req.body.unit) {
      const unit = await Unit.findOne({ _id: req.body.unit, deletedAt: null }).populate("course", "deletedAt");
      if (!unit || !unit.course || unit.course.deletedAt) return res.status(404).json({ message: "Unit not found" });
    }
    const lesson = await Lesson.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, req.body, { returnDocument: "after", runValidators: true });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    return res.status(200).json({ message: "Lesson updated successfully", data: lesson });
  } catch (error) {
    next(error);
  }
};

const deleteLesson = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await Lesson.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { returnDocument: "after" });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    return res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLessonByID, getLessonForAdmin, createLesson, updateLesson, deleteLesson };
