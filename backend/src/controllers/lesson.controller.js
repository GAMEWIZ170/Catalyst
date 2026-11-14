const mongoose = require("mongoose");
const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const TestResult = require("../models/testresult.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");
const Progress = require("../models/progress.models");
const Bookmark = require("../models/bookmark.models");
const Note = require("../models/note.models");
const studentMaterial = require("../utils/studentMaterial");
const getFlashcardSummary = require("../utils/flashcardSummary");
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
    passPercent: test.passPercent ?? null,
    bestScore: scoreByTest.get(test._id.toString()) ?? null
  }));
};

const adminTestSummary = (tests) => tests.map((test) => ({
  _id: test._id,
  title: test.title,
  order: test.order,
  questionCount: test.questionCount,
  passPercent: test.passPercent ?? null
}));


// Everything a student sees on a lesson. The tests, flashcard summary, material count and (for the hub)
// the materials and the completed flag are independent of each other, so they are read together with the
// visibility check: 3 round trips instead of 9. When the lesson is hidden the extra reads are thrown away.
const loadLesson = async (id, userId, withHub) => {
  const [lesson, tests, flashcards, materials, done, note, saved] = await Promise.all([
    findVisibleLesson(id),
    findTestsWithQuestions({ scope: "lesson", lesson: id, isPublished: true, deletedAt: null }).then((rows) => studentTestSummary(rows, userId)),
    getFlashcardSummary(id, userId),
    Material.find({ lesson: id, isPublished: true, deletedAt: null }).sort({ order: 1 }).lean(),
    withHub ? Progress.exists({ user: userId, lesson: id, completed: true }) : null,
    withHub ? Note.findOne({ user: userId, lesson: id }).select("text").lean() : null,
    withHub ? Bookmark.exists({ user: userId, kind: "lesson", target: id }) : null
  ]);
  if (!lesson) return null;
  const data = {
    _id: lesson._id,
    unit: lesson.unit._id,
    title: lesson.title,
    order: lesson.order,
    explanation: lesson.explanation,
    explanationImage: lesson.explanationImage,
    videoHost: lesson.videoHost,
    videoId: lesson.videoId,
    tests,
    flashcards,
    materialCount: materials.length
  };
  if (withHub) {
    data.completed = Boolean(done);
    data.materials = materials.map(studentMaterial);
    data.note = note ? note.text : "";
    data.saved = Boolean(saved);
  }
  return data;
};

const getLessonByID = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const data = await loadLesson(req.params.id, req.user.id, false);
    if (!data) return res.status(404).json({ message: `Lesson with ID ${req.params.id} not found` });
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

// The lesson screen in one call: the lesson, whether this student finished it, and its materials.
const getLessonHub = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const data = await loadLesson(req.params.id, req.user.id, true);
    if (!data) return res.status(404).json({ message: `Lesson with ID ${req.params.id} not found` });
    return res.status(200).json({ data });
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
    const materials = await Material.find({ lesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: { ...lesson, tests: adminTestSummary(tests), flashcards, materials } });
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

module.exports = { getLessonByID, getLessonHub, getLessonForAdmin, createLesson, updateLesson, deleteLesson };
