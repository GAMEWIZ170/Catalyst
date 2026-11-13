const mongoose = require("mongoose");
const Progress = require("../models/progress.models");
const TestResult = require("../models/testresult.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const { findVisibleLesson } = require("../utils/visibility");
const calculateStreak = require("../utils/streak");
const Course = require("../models/course.models");
const { buildCourseOutline } = require("../utils/courseOutline");

const todayKey = () => new Date().toISOString().slice(0, 10);

const markLessonDone = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await findVisibleLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const publishedTests = await Test.find({
      scope: "lesson",
      lesson: lesson._id,
      isPublished: true,
      deletedAt: null
    }).select("_id").lean();
    const publishedTestIds = await Question.distinct("test", {
      test: { $in: publishedTests.map((test) => test._id) },
      deletedAt: null
    });
    const Flashcard = mongoose.models.Flashcard;
    const publishedFlashcard = Flashcard
      ? await Flashcard.exists({ lesson: lesson._id, isPublished: true, deletedAt: null })
      : false;
    if (publishedTestIds.length || publishedFlashcard) {
      return res.status(409).json({ message: "Finish a test or the flashcards to complete this lesson" });
    }
    const progress = await Progress.findOneAndUpdate(
      { user: req.user.id, lesson: lesson._id },
      { $set: { completed: true }, $setOnInsert: { completedAt: new Date() }, $addToSet: { completedDays: todayKey() } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({
      message: "Lesson completed",
      data: {
        lesson: progress.lesson,
        completed: progress.completed,
        completedAt: progress.completedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMyProgress = async (req, res, next) => {
  try {
    const progress = await Progress.find({ user: req.user.id }).select("lesson completed score completedAt -_id").lean();
    return res.status(200).json({ count: progress.length, data: progress });
  } catch (error) {
    next(error);
  }
};

const loadStreak = async (userId) => {
  const [progress, results, flashcardProgress] = await Promise.all([
    Progress.find({ user: userId }).select("completedDays").lean(),
    TestResult.find({ user: userId }).select("completedDays").lean(),
    FlashcardProgress.find({ user: userId }).select("reviewedDays").lean()
  ]);
  const days = [...progress, ...results].flatMap((record) => record.completedDays || []);
  const reviewedDays = flashcardProgress.flatMap((record) => record.reviewedDays || []);
  const activeDays = [...days, ...reviewedDays];
  return { streak: calculateStreak(activeDays), completedToday: activeDays.includes(todayKey()) };
};

const getStreak = async (req, res, next) => {
  try {
    return res.status(200).json({ data: await loadStreak(req.user.id) });
  } catch (error) {
    next(error);
  }
};

// The progress screen in one call: finished lessons, the streak and every course outline.
const getOverview = async (req, res, next) => {
  try {
    const [progress, streak, courses] = await Promise.all([
      Progress.find({ user: req.user.id }).select("lesson completed score completedAt -_id").lean(),
      loadStreak(req.user.id),
      Course.find({ isPublished: true, deletedAt: null }).select("_id").sort({ code: 1 }).lean()
    ]);
    const outlines = await Promise.all(courses.map((course) => buildCourseOutline(course._id, req.user.id)));
    return res.status(200).json({ data: { progress, streak, courses: outlines.filter(Boolean) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { markLessonDone, getMyProgress, getStreak, getOverview };
