const mongoose = require("mongoose");
const { logEvent } = require("../../utils/events");
const { awardXp } = require("../../utils/xp");
const Progress = require("./progress.models");
const TestResult = require("../assessments/testresult.models");
const FlashcardProgress = require("../flashcards/flashcardprogress.models");
const Test = require("../assessments/test.models");
const Question = require("../assessments/question.models");
const { findVisibleLesson } = require("../../utils/visibility");
const calculateStreak = require("../../utils/streak");
const { longestStreak } = require("../../utils/streak");
const { levelFor } = require("../../utils/xp");
const User = require("../auth/user.models");
const StudySet = require("../lab/studyset.models");
const Flashcard = require("../flashcards/flashcard.models");
const Position = require("./position.models");
const StudyTime = require("./studytime.models");
const mastery = require("../../utils/mastery");

const { dayKey } = require("../../utils/day");

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
      { $set: { completed: true }, $setOnInsert: { completedAt: new Date() }, $addToSet: { completedDays: dayKey(req.user.timeZone) } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    await mastery.record(req.user.id, lesson._id, { type: "attempt" }, req.user.timeZone);
    logEvent(req.user.id, "lesson_completed", { lesson: lesson._id, how: "marked" });
    await awardXp(req.user.id, "lesson", { timeZone: req.user.timeZone, key: String(lesson._id) });
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

// Every day the student did something (finished a lesson or test, or rated a card). Repeats are kept.
const loadActiveDays = async (userId) => {
  const [progress, results, flashcardProgress] = await Promise.all([
    Progress.find({ user: userId }).select("completedDays").lean(),
    TestResult.find({ user: userId }).select("completedDays").lean(),
    FlashcardProgress.find({ user: userId }).select("reviewedDays").lean()
  ]);
  const days = [...progress, ...results].flatMap((record) => record.completedDays || []);
  const reviewedDays = flashcardProgress.flatMap((record) => record.reviewedDays || []);
  return [...days, ...reviewedDays];
};

const loadStreak = async (userId, timeZone) => {
  const activeDays = await loadActiveDays(userId);
  return { streak: calculateStreak(activeDays, timeZone), completedToday: activeDays.includes(dayKey(timeZone)) };
};

const getStreak = async (req, res, next) => {
  try {
    return res.status(200).json({ data: await loadStreak(req.user.id, req.user.timeZone) });
  } catch (error) {
    next(error);
  }
};

// The Progress screen in one call: streaks, the activity heatmap for one year, level, and how each of the student's own
// study sets is going. Courses are not part of it. Every day count comes from loadActiveDays, the same list as the streak.
const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = dayKey(req.user.timeZone);
    const thisYear = Number(today.slice(0, 4));
    const year = Math.min(req.progressYear || thisYear, thisYear);

    const [activeDays, me, sets] = await Promise.all([
      loadActiveDays(userId),
      User.findById(userId).select("xp").lean(),
      StudySet.find({ owner: userId, deletedAt: null }).select("title lastStudiedAt updatedAt").sort({ updatedAt: -1 }).limit(100).lean()
    ]);

    // Activities per day in the chosen year, and the first year with any activity (for the year switcher).
    const days = {};
    let firstYear = thisYear;
    for (const day of activeDays) {
      const dayYear = Number(day.slice(0, 4));
      if (dayYear < firstYear) firstYear = dayYear;
      if (dayYear === year) days[day] = (days[day] || 0) + 1;
    }

    const setIds = sets.map((set) => set._id);
    const [cards, quizzes] = await Promise.all([
      Flashcard.find({ set: { $in: setIds }, deletedAt: null }).select("_id set").lean(),
      Test.find({ set: { $in: setIds }, deletedAt: null }).select("_id set").lean()
    ]);
    const [ratings, results] = await Promise.all([
      FlashcardProgress.find({ user: userId, flashcard: { $in: cards.map((card) => card._id) } }).select("flashcard confidence due lastReviewedAt").lean(),
      TestResult.find({ user: userId, test: { $in: quizzes.map((quiz) => quiz._id) }, attempts: { $gt: 0 } }).select("test bestScore").lean()
    ]);

    const setOfCard = new Map(cards.map((card) => [String(card._id), String(card.set)]));
    const setOfQuiz = new Map(quizzes.map((quiz) => [String(quiz._id), String(quiz.set)]));
    const now = new Date();
    const bySet = new Map(sets.map((set) => [String(set._id), {
      id: String(set._id), title: set.title, cards: 0, confident: 0, unsure: 0, unknown: 0, unrated: 0, due: 0, bestQuiz: null,
      lastStudiedAt: set.lastStudiedAt || null
    }]));
    for (const card of cards) bySet.get(String(card.set)).cards += 1;
    for (const row of ratings) {
      const entry = bySet.get(setOfCard.get(String(row.flashcard)));
      if (!entry) continue;
      entry[row.confidence] += 1;
      if (row.due && row.due <= now) entry.due += 1;
      if (row.lastReviewedAt && (!entry.lastStudiedAt || row.lastReviewedAt > entry.lastStudiedAt)) entry.lastStudiedAt = row.lastReviewedAt;
    }
    for (const result of results) {
      const entry = bySet.get(setOfQuiz.get(String(result.test)));
      if (entry && (entry.bestQuiz === null || result.bestScore > entry.bestQuiz)) entry.bestQuiz = result.bestScore;
    }
    const setRows = [...bySet.values()].map((entry) => ({ ...entry, unrated: entry.cards - entry.confident - entry.unsure - entry.unknown }));
    // Most recently studied first; sets never studied keep their last-edited order at the end.
    setRows.sort((a, b) => (b.lastStudiedAt ? new Date(b.lastStudiedAt) : 0) - (a.lastStudiedAt ? new Date(a.lastStudiedAt) : 0));

    return res.status(200).json({
      data: {
        streak: calculateStreak(activeDays, req.user.timeZone),
        completedToday: activeDays.includes(today),
        longestStreak: longestStreak(activeDays),
        today,
        year,
        firstYear,
        activeDaysInYear: Object.keys(days).length,
        days,
        level: levelFor(me?.xp || 0),
        xp: me?.xp || 0,
        sets: setRows
      }
    });
  } catch (error) {
    next(error);
  }
};

// Remember where the student is in a course. Only visible lessons count, so a hidden one cannot be saved.
const savePosition = async (req, res, next) => {
  try {
    const { lessonId, kind, position, total } = req.body;
    const lesson = await findVisibleLesson(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    await Position.findOneAndUpdate(
      { user: req.user.id, course: lesson.unit.course._id },
      { $set: { lesson: lesson._id, kind, position, total } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// The page reports study time in small pieces while the student is active. It only feeds the "minutes" goal.
const addStudyTime = async (req, res, next) => {
  try {
    await StudyTime.updateOne(
      { user: req.user.id, day: dayKey(req.user.timeZone) },
      { $inc: { seconds: req.body.seconds } },
      { upsert: true }
    );
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = { markLessonDone, getMyProgress, getStreak, getSummary, loadStreak, loadActiveDays, savePosition, addStudyTime };
