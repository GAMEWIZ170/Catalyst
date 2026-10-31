const mongoose = require("mongoose");
const Progress = require("../models/progress.models");
const TestResult = require("../models/testresult.models");
const Test = require("../models/test.models");
const { findVisibleLesson } = require("../utils/visibility");
const calculateStreak = require("../utils/streak");

const todayKey = () => new Date().toISOString().slice(0, 10);

const markLessonDone = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await findVisibleLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const publishedTest = await Test.exists({
      scope: "lesson",
      lesson: lesson._id,
      isPublished: true,
      deletedAt: null
    });
    const Flashcard = mongoose.models.Flashcard;
    const publishedFlashcard = Flashcard
      ? await Flashcard.exists({ lesson: lesson._id, isPublished: true, deletedAt: null })
      : false;
    if (publishedTest || publishedFlashcard) {
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

const getStreak = async (req, res, next) => {
  try {
    const [progress, results] = await Promise.all([
      Progress.find({ user: req.user.id }).select("completedDays").lean(),
      TestResult.find({ user: req.user.id }).select("completedDays").lean()
    ]);
    const days = [...progress, ...results].flatMap((record) => record.completedDays);
    return res.status(200).json({ data: { streak: calculateStreak(days), completedToday: days.includes(todayKey()) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { markLessonDone, getMyProgress, getStreak };
