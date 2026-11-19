const mongoose = require("mongoose");
const AchievementUnlock = require("../modules/gamification/achievement.models");
const User = require("../modules/auth/user.models");
const Event = require("../modules/progress/event.models");
const Progress = require("../modules/progress/progress.models");
const TestResult = require("../modules/assessments/testresult.models");
const Mastery = require("../modules/assessments/mastery.models");
const Lesson = require("../modules/courses/lesson.models");
const StudySet = require("../modules/lab/studyset.models");
const Report = require("../modules/community/report.models");
const { shiftDay } = require("./day");

// Every achievement is a learning milestone. None rewards hours spent, and none is about losing a streak.
// `hidden` ones stay secret until earned. Each `test` gets the numbers worked out in loadStats().
const LIST = [
  { key: "first_lesson", title: "First lesson", text: "Complete your first lesson.", test: (s) => s.lessons >= 1 },
  { key: "lessons_10", title: "Ten lessons", text: "Complete 10 lessons.", test: (s) => s.lessons >= 10 },
  { key: "lessons_50", title: "Fifty lessons", text: "Complete 50 lessons.", test: (s) => s.lessons >= 50 },
  { key: "first_unit_mastered", title: "First unit mastered", text: "Reach Proficient on every lesson of one unit.", test: (s) => s.unitsMastered >= 1 },
  { key: "units_mastered_5", title: "Five units mastered", text: "Reach Proficient on every lesson of five units.", test: (s) => s.unitsMastered >= 5 },
  { key: "first_test", title: "First test", text: "Finish a test.", test: (s) => s.tests >= 1 },
  { key: "perfect_test", title: "Perfect test", text: "Score 100% on a test.", test: (s) => s.perfectTests >= 1 },
  { key: "perfect_tests_5", title: "Five perfect tests", text: "Score 100% on five different tests.", test: (s) => s.perfectTests >= 5 },
  { key: "first_review", title: "First review", text: "Review a card or mistake when it is due.", test: (s) => s.reviews >= 1 },
  { key: "reviews_100", title: "100 reviews", text: "Complete 100 reviews.", test: (s) => s.reviews >= 100 },
  { key: "reviews_500", title: "500 reviews", text: "Complete 500 reviews.", test: (s) => s.reviews >= 500 },
  { key: "cards_100", title: "100 cards rated", text: "Rate 100 flashcards.", test: (s) => s.cards >= 100 },
  { key: "correct_100", title: "100 right answers", text: "Answer 100 questions correctly.", test: (s) => s.correct >= 100 },
  { key: "correct_500", title: "500 right answers", text: "Answer 500 questions correctly.", test: (s) => s.correct >= 500 },
  { key: "study_days_7", title: "7 study days in a month", text: "Study on 7 different days in one calendar month.", test: (s) => s.bestMonthDays >= 7 },
  { key: "study_days_15", title: "15 study days in a month", text: "Study on 15 different days in one calendar month.", test: (s) => s.bestMonthDays >= 15 },
  { key: "study_weeks_4", title: "Four weeks in a row", text: "Study at least once a week for four weeks in a row.", test: (s) => s.bestWeekRun >= 4 },
  { key: "first_focus", title: "First focus session", text: "Finish a focus session.", test: (s) => s.focus >= 1 },
  { key: "first_set", title: "First study set", text: "Create a study set.", test: (s) => s.sets >= 1 },
  { key: "set_studied_50", title: "Your set helped others", text: "Your study set was studied 50 times by other students.", test: (s) => s.setStudiedByOthers >= 50 },
  { key: "first_friend", title: "First friend", text: "Add a friend.", test: (s) => s.friends >= 1 },
  { key: "first_challenge", title: "First challenge", text: "Play a friend challenge.", test: (s) => s.challengesPlayed >= 1 },
  { key: "first_challenge_won", title: "First challenge won", text: "Win a friend challenge.", test: (s) => s.challengesWon >= 1 },
  { key: "challenges_10", title: "Ten challenges", text: "Play 10 friend challenges.", test: (s) => s.challengesPlayed >= 10 },
  // Surprises: the text stays hidden until they are earned.
  { key: "comeback", title: "Welcome back", text: "Come back after a week away and keep learning.", hidden: true, test: (s) => s.comeback },
  { key: "second_wind", title: "Second wind", text: "Try a test again and pass it.", hidden: true, test: (s) => s.retriedAndPassed },
  { key: "sharp_eyed", title: "Sharp eyed", text: "Report a problem that the team then fixed.", hidden: true, test: (s) => s.reportsResolved >= 1 }
];

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const countEvents = (user, type, extra = {}) => Event.countDocuments({ user, type, ...extra });

// A gap of 7 or more days between two active days, followed by activity, is a comeback.
const hasComeback = (days) => {
  const sorted = [...new Set(days)].sort();
  for (let i = 1; i < sorted.length; i++) if (shiftDay(sorted[i - 1], 7) <= sorted[i]) return true;
  return false;
};

// Longest run of calendar weeks (Monday to Sunday, UTC) that each hold at least one study day. One day a week is enough.
const bestWeekRun = (days) => {
  const weeks = [...new Set(days.map((day) => Math.floor((Date.parse(day) / 86400000 + 3) / 7)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  weeks.forEach((week, index) => { run = index && week === weeks[index - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
  return best;
};

const loadStats = async (userId, activeDays) => {
  const user = oid(userId);
  const months = new Map();
  for (const day of new Set(activeDays)) months.set(day.slice(0, 7), (months.get(day.slice(0, 7)) || 0) + 1);

  // Friends and challenges are looked up by name so this file works before those models exist.
  const Friendship = mongoose.models.Friendship;
  const Challenge = mongoose.models.Challenge;
  const [lessons, tests, perfect, retried, reviews, cards, correct, focus, sets, reportsResolved, mastered, mySets, friends, played, won] = await Promise.all([
    Progress.countDocuments({ user, completed: true }),
    TestResult.countDocuments({ user }),
    TestResult.countDocuments({ user, bestScore: 100 }),
    TestResult.countDocuments({ user, attempts: { $gte: 2 }, bestScore: { $gte: 70 } }),
    countEvents(user, "review_done"),
    countEvents(user, "flashcard_rated"),
    countEvents(user, "question_answered", { "props.correct": true }),
    countEvents(user, "focus_session_completed"),
    StudySet.countDocuments({ owner: user, deletedAt: null }),
    Report.countDocuments({ user, status: "resolved" }),
    Mastery.find({ user, level: { $gte: 3 } }).select("lesson").lean(),
    StudySet.find({ owner: user }).select("_id").lean(),
    Friendship ? Friendship.countDocuments({ status: "accepted", $or: [{ requester: user }, { recipient: user }] }) : 0,
    Challenge ? Challenge.countDocuments({ "results.user": user }) : 0,
    Challenge ? Challenge.countDocuments({ winner: user }) : 0
  ]);

  // A unit counts as mastered when every published lesson in it is Proficient or better.
  let unitsMastered = 0;
  if (mastered.length) {
    const lessonIds = mastered.map((row) => row.lesson);
    const units = await Lesson.distinct("unit", { _id: { $in: lessonIds }, isPublished: true, deletedAt: null });
    const [totals, have] = await Promise.all([
      Lesson.aggregate([{ $match: { unit: { $in: units }, isPublished: true, deletedAt: null } }, { $group: { _id: "$unit", total: { $sum: 1 } } }]),
      Lesson.aggregate([{ $match: { _id: { $in: lessonIds }, isPublished: true, deletedAt: null } }, { $group: { _id: "$unit", have: { $sum: 1 } } }])
    ]);
    const haveBy = new Map(have.map((row) => [String(row._id), row.have]));
    unitsMastered = totals.filter((row) => haveBy.get(String(row._id)) === row.total).length;
  }

  const setStudiedByOthers = mySets.length
    ? await Event.countDocuments({ type: "set_studied", user: { $ne: user }, "props.set": { $in: mySets.map((row) => String(row._id)) } })
    : 0;

  return {
    lessons, tests, perfectTests: perfect, retriedAndPassed: retried > 0, reviews, cards, correct, focus, sets, reportsResolved,
    unitsMastered, bestWeekRun: bestWeekRun([...new Set(activeDays)]), setStudiedByOthers, friends, challengesPlayed: played, challengesWon: won,
    bestMonthDays: Math.max(0, ...months.values()), comeback: hasComeback(activeDays)
  };
};

// Works out what the student has earned and saves anything new. Safe to run any number of times.
// Never throws, so a problem here can never break the request that asked.
const evaluate = async (userId, activeDays) => {
  try {
    const [stats, have] = await Promise.all([loadStats(userId, activeDays), AchievementUnlock.find({ user: userId }).select("key").lean()]);
    const earned = new Set(have.map((row) => row.key));
    const fresh = LIST.filter((item) => !earned.has(item.key) && item.test(stats));
    if (fresh.length) {
      // ordered:false keeps going past a duplicate (the same one saved by another request at the same moment).
      await AchievementUnlock.insertMany(fresh.map((item) => ({ user: userId, key: item.key })), { ordered: false }).catch((error) => {
        if (error.code !== 11000 && !error.writeErrors) throw error;
      });
    }
    await User.updateOne({ _id: userId }, { $set: { achievementsCheckedAt: new Date() } });
    return fresh.map((item) => item.key);
  } catch (error) {
    console.error("Achievements check failed:", error.message);
    return [];
  }
};

// The colour family of a badge on the Achievements screen.
const GROUPS = { lesson: "learn", lessons: "learn", first_unit: "learn", units: "learn", first_test: "tests", perfect: "tests", second_wind: "tests", first_review: "review", reviews: "review", cards: "review", correct: "review", study: "habit", first_focus: "habit", comeback: "habit", first_set: "create", set: "create", first_friend: "social", first_challenge: "social", challenges: "social", sharp_eyed: "social" };
const groupOf = (key) => GROUPS[Object.keys(GROUPS).find((prefix) => key === prefix || key.startsWith(prefix + "_")) || ""] || "learn";

const byKey = new Map(LIST.map((item) => [item.key, item]));

module.exports = { LIST, byKey, evaluate, groupOf };
