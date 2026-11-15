const mongoose = require("mongoose");
const LeaderboardEntry = require("../models/leaderboard.models");
const SetStudy = require("../models/setstudy.models");
const StudySet = require("../models/studyset.models");
const Test = require("../models/test.models");
const { findSharedSet, authorNames } = require("../utils/sharedSet");
const { weekStart } = require("../utils/day");

const TOP = 10;
const NEAR = 2;
const badId = (id) => !mongoose.isObjectIdOrHexString(String(id));
const today = () => new Date().toISOString().slice(0, 10);

// The current week's Monday and month, in UTC, and the day each period starts and ends.
const periodNow = (period) => {
  const day = today();
  if (period === "month") return { key: day.slice(0, 7), from: `${day.slice(0, 7)}-01` };
  const monday = weekStart(day);
  return { key: monday, from: monday };
};

// A quiz whose set is on the community shelf and still approved, and the student is not its owner. Only then can scores count.
const eligible = async (test, userId) => {
  if (!test || test.scope !== "set" || !test.set) return null;
  const set = await StudySet.findOne({ _id: test.set._id || test.set, deletedAt: null, communityStatus: "approved", visibility: "community" }).select("owner").lean();
  return set && String(set.owner) !== String(userId) ? set : null;
};

// Called when a timed attempt that chose the board is handed in. Writes the score on this week's and this month's board,
// but only if the student has none there yet for this quiz (the first attempt of the period). Never throws into the exam.
const recordBoards = async (attempt, test, result) => {
  try {
    if (!attempt.leaderboard || !(await eligible(test, attempt.user))) return;
    const day = today();
    const durationMs = Math.max(0, Math.min(Date.now(), new Date(attempt.endsAt).getTime()) - new Date(attempt.startedAt).getTime());
    for (const [period, key] of [["week", weekStart(day)], ["month", day.slice(0, 7)]]) {
      await LeaderboardEntry.updateOne(
        { test: test._id, user: attempt.user, period, key },
        { $setOnInsert: { set: test.set._id || test.set, score: result.score, correct: result.correct, total: result.total, durationMs, at: new Date() } },
        { upsert: true }
      ).catch((error) => { if (error.code !== 11000) throw error; });
    }
  } catch (error) {
    console.error("Leaderboard record failed:", error.message);
  }
};

// STUDENT: the board of one community quiz: the top 10, then you and the people just above and below you. Display names only.
const quizBoard = async (req, res, next) => {
  try {
    if (badId(req.params.testId)) return res.status(404).json({ message: "Quiz not found" });
    const period = req.query.period === "month" ? "month" : "week";
    const test = await Test.findOne({ _id: req.params.testId, scope: "set", deletedAt: null, isPublished: true }).lean();
    const set = test && await StudySet.findOne({ _id: test.set, deletedAt: null, communityStatus: "approved", visibility: "community" }).select("owner").lean();
    if (!set) return res.status(404).json({ message: "Quiz not found" });
    const { key } = periodNow(period);
    const rows = await LeaderboardEntry.find({ test: test._id, period, key }).sort({ score: -1, durationMs: 1, at: 1 }).limit(2000).lean();
    const names = await authorNames(rows.map((row) => row.user));
    const ranked = rows.map((row, index) => ({ rank: index + 1, name: names.get(String(row.user)) || "A student", score: row.score, correct: row.correct, total: row.total, seconds: Math.round(row.durationMs / 1000), you: String(row.user) === String(req.user.id) }));
    const mine = ranked.find((row) => row.you) || null;
    const top = ranked.slice(0, TOP);
    const near = mine && mine.rank > TOP ? ranked.filter((row) => Math.abs(row.rank - mine.rank) <= NEAR) : [];
    return res.status(200).json({ data: { period, key, quiz: { id: test._id, title: test.title }, entries: top, near, me: mine ? { rank: mine.rank, score: mine.score, of: ranked.length } : null, isOwner: String(set.owner) === String(req.user.id) } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: "most studied sets" and "top creators" for the week or month. Ranked by how many different students studied
// (one per student per set per day). A creator's number adds up their approved sets.
const boards = async (req, res, next) => {
  try {
    const period = req.query.period === "month" ? "month" : "week";
    const { from, key } = periodNow(period);
    const live = await StudySet.find({ communityStatus: "approved", visibility: "community", deletedAt: null }).select("_id owner title").lean();
    const liveIds = live.map((set) => set._id);
    const rows = await SetStudy.aggregate([
      { $match: { day: { $gte: from }, set: { $in: liveIds } } },
      { $group: { _id: "$set", n: { $sum: 1 } } },
      { $sort: { n: -1 } }
    ]);
    const bySet = new Map(live.map((set) => [String(set._id), set]));
    const names = await authorNames(live.map((set) => set.owner));
    const sets = rows.slice(0, TOP).map((row, index) => ({ rank: index + 1, id: row._id, title: bySet.get(String(row._id)).title, author: names.get(String(bySet.get(String(row._id)).owner)) || "A student", studied: row.n }));
    const perCreator = new Map();
    for (const row of rows) {
      const set = bySet.get(String(row._id));
      const entry = perCreator.get(String(set.owner)) || { studied: 0, sets: 0 };
      entry.studied += row.n;
      entry.sets += 1;
      perCreator.set(String(set.owner), entry);
    }
    const creators = [...perCreator.entries()].sort((a, b) => b[1].studied - a[1].studied).slice(0, TOP)
      .map(([owner, value], index) => ({ rank: index + 1, name: names.get(owner) || "A student", studied: value.studied, sets: value.sets, you: owner === String(req.user.id) }));
    return res.status(200).json({ data: { period, key, sets, creators } });
  } catch (error) {
    next(error);
  }
};

module.exports = { recordBoards, quizBoard, boards, periodNow, eligible };
