const mongoose = require("mongoose");
const Lesson = require("../models/lesson.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");
const studentMaterial = require("../utils/studentMaterial");
const { studentQuestion } = require("../utils/serializers");
const { grade, correctAnswerOf } = require("../utils/grading");
const { findTestQuestionCounts, findVisibleLesson, findVisibleTest } = require("../utils/visibility");

// "Preview as student": the same shapes a student gets, but drafts are included and nothing is ever written.
// These routes sit under /admin, so only admins reach them. They never touch progress, mistakes, mastery,
// answer statistics, positions or bookmarks.
const badId = (id) => !mongoose.isObjectIdOrHexString(id);

// The lesson hub. Extra fields tell the screen what is still hidden: isPublished, visibleToStudents, and a
// draft flag on each test, card and material.
const previewLesson = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const [tests, cards, materials, visible] = await Promise.all([
      findTestQuestionCounts({ scope: "lesson", lesson: lesson._id, deletedAt: null }),
      Flashcard.find({ lesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean(),
      Material.find({ lesson: lesson._id, deletedAt: null }).sort({ order: 1 }).lean(),
      findVisibleLesson(lesson._id)
    ]);
    return res.status(200).json({
      data: {
        preview: true,
        _id: lesson._id, unit: lesson.unit, title: lesson.title, order: lesson.order,
        explanation: lesson.explanation, explanationImage: lesson.explanationImage,
        videoHost: lesson.videoHost, videoId: lesson.videoId,
        isPublished: lesson.isPublished, visibleToStudents: Boolean(visible),
        // A student sees tests with questions only.
        tests: tests.filter((t) => t.questionCount > 0).map((t) => ({
          _id: t._id, title: t.title, order: t.order, questionCount: t.questionCount, passPercent: t.passPercent ?? null, bestScore: null, draft: !t.isPublished
        })),
        flashcards: { total: cards.length, confident: 0, unsure: 0, unknown: 0, unrated: cards.length },
        cards: cards.map((c) => ({ _id: c._id, front: c.front, back: c.back, draft: !c.isPublished })),
        materialCount: materials.length,
        materials: materials.map((m) => ({ ...studentMaterial(m), draft: !m.isPublished })),
        completed: false, note: "", saved: false
      }
    });
  } catch (error) {
    next(error);
  }
};

// A test as the player gets it. A timed test is shown untimed here: the admin wants to see the questions.
const previewTest = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await Test.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ test: test._id, deletedAt: null })
      .select("_id type text image options order hint numeric pairs items equation").sort({ order: 1 }).lean();
    const visible = await findVisibleTest(test._id);
    return res.status(200).json({
      data: {
        preview: true, _id: test._id, title: test.title, scope: test.scope, order: test.order, passPercent: test.passPercent ?? null,
        isPublished: test.isPublished, visibleToStudents: Boolean(visible), timeLimitMinutes: test.timeLimitMinutes || null,
        questions: questions.map(studentQuestion)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Grades one answer exactly like the student route, and records nothing.
const previewAnswer = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid question ID" });
  try {
    const question = await Question.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (typeof req.body.answer !== "string") return res.status(400).json({ message: "Please provide an answer" });
    const { isCorrect, unitWrong } = grade(question, req.body.answer);
    return res.status(200).json({
      data: { isCorrect, ...(unitWrong ? { unitWrong: true } : {}), correctAnswer: correctAnswerOf(question), explanation: question.explanation, explanationImage: question.explanationImage, workedSolution: question.workedSolution || [] }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { previewLesson, previewTest, previewAnswer };
