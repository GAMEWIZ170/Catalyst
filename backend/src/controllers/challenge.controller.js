const mongoose = require("mongoose");
const Challenge = require("../models/challenge.models");
const Question = require("../models/question.models");
const User = require("../models/user.models");
const Notification = require("../models/notification.models");
const { findVisibleTest } = require("../utils/visibility");
const { studentQuestion } = require("../utils/serializers");
const { grade } = require("../utils/grading");
const { logEvent } = require("../utils/events");
const { awardXp } = require("../utils/xp");
const { areFriends, displayNameOf } = require("../utils/friends");

const QUESTIONS = 10;
const WINDOW_MS = 48 * 60 * 60 * 1000;
const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const same = (a, b) => String(a) === String(b);

const shuffled = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const nameOf = async (userId) => displayNameOf(await User.findById(userId).select("name displayName").lean() || {});

// The scores of both players, once both have played. Never contains an answer.
const comparison = async (challenge, viewerId) => {
  if (challenge.results.length < 2) return null;
  const mine = challenge.results.find((row) => same(row.user, viewerId));
  const theirs = challenge.results.find((row) => !same(row.user, viewerId));
  if (!mine || !theirs) return null;
  return {
    you: { correct: mine.correct, total: mine.total },
    them: { name: await nameOf(theirs.user), correct: theirs.correct, total: theirs.total },
    outcome: !challenge.winner ? "tie" : same(challenge.winner, viewerId) ? "won" : "lost"
  };
};

// What the viewer may do with a challenge: the creator always; a friend of the creator, unless another friend
// already took the place. Everyone else gets the same 404 as for a challenge that does not exist.
const access = async (challenge, viewerId) => {
  if (same(challenge.creator, viewerId)) return "creator";
  if (challenge.opponent && !same(challenge.opponent, viewerId)) return null;
  return (await areFriends(challenge.creator, viewerId)) ? "friend" : null;
};

const createChallenge = async (req, res, next) => {
  try {
    const test = await findVisibleTest(req.body.test, req.user.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const questions = await Question.find({ test: test._id, deletedAt: null }).select("_id").lean();
    if (!questions.length) return res.status(409).json({ message: "This test has no questions yet" });
    const picked = shuffled(questions).slice(0, QUESTIONS).map((row) => row._id);
    const challenge = await Challenge.create({
      creator: req.user.id, test: test._id, title: test.title, questions: picked, expiresAt: new Date(Date.now() + WINDOW_MS)
    });
    logEvent(req.user.id, "challenge_sent", { challenge: challenge._id });
    return res.status(201).json({ data: { id: challenge._id, title: challenge.title, count: picked.length, expiresAt: challenge.expiresAt } });
  } catch (error) {
    next(error);
  }
};

// The challenges the student made or played, newest first.
const listMine = async (req, res, next) => {
  try {
    const rows = await Challenge.find({ $or: [{ creator: req.user.id }, { "results.user": req.user.id }] }).sort({ createdAt: -1 }).limit(30).lean();
    const now = Date.now();
    const data = await Promise.all(rows.map(async (row) => {
      const iPlayed = row.results.some((r) => same(r.user, req.user.id));
      const done = row.results.length >= 2;
      const expired = !done && row.expiresAt.getTime() < now;
      const status = done ? "done" : !iPlayed ? (expired ? "expired" : "your_turn") : expired ? "expired" : "waiting";
      const otherId = same(row.creator, req.user.id) ? row.opponent : row.creator;
      return {
        id: row._id, title: row.title, status, expiresAt: row.expiresAt, mine: same(row.creator, req.user.id),
        with: otherId ? await nameOf(otherId) : null, comparison: done ? await comparison(row, req.user.id) : null
      };
    }));
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

// The challenge to play (questions without answers), or the comparison if the student has played it.
const getChallenge = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid challenge ID" });
    const challenge = await Challenge.findById(req.params.id).lean();
    const role = challenge && await access(challenge, req.user.id);
    if (!role) return res.status(404).json({ message: "Challenge not found" });
    const played = challenge.results.some((row) => same(row.user, req.user.id));
    const expired = challenge.expiresAt.getTime() < Date.now();
    const creatorPlayed = challenge.results.some((row) => same(row.user, challenge.creator));
    const base = { id: challenge._id, title: challenge.title, role, from: await nameOf(challenge.creator), expiresAt: challenge.expiresAt, played, expired };
    if (played) {
      const mine = challenge.results.find((row) => same(row.user, req.user.id));
      return res.status(200).json({ data: { ...base, result: { correct: mine.correct, total: mine.total }, comparison: await comparison(challenge, req.user.id) } });
    }
    if (expired) return res.status(410).json({ message: "This challenge has expired" });
    if (role === "friend" && !creatorPlayed) return res.status(409).json({ message: `${base.from} has not played yet. Try again soon.` });
    const questions = await Question.find({ _id: { $in: challenge.questions }, deletedAt: null })
      .select("_id type text image options order hint numeric pairs items equation").lean();
    const order = new Map(challenge.questions.map((id, index) => [String(id), index]));
    questions.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
    return res.status(200).json({ data: { ...base, questions: questions.map(studentQuestion) } });
  } catch (error) {
    next(error);
  }
};

const submitChallenge = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return res.status(400).json({ message: "Invalid challenge ID" });
    const challenge = await Challenge.findById(req.params.id).lean();
    const role = challenge && await access(challenge, req.user.id);
    if (!role) return res.status(404).json({ message: "Challenge not found" });
    if (challenge.results.some((row) => same(row.user, req.user.id))) return res.status(409).json({ message: "You already played this challenge" });
    if (challenge.expiresAt.getTime() < Date.now()) return res.status(410).json({ message: "This challenge has expired" });
    if (role === "friend" && !challenge.results.some((row) => same(row.user, challenge.creator))) return res.status(409).json({ message: "Your friend has not played yet" });

    const questions = await Question.find({ _id: { $in: challenge.questions }, deletedAt: null })
      .select("type correctOption correctOptions correctAnswer numeric acceptedAnswers pairs items equation").lean();
    if (!questions.length) return res.status(409).json({ message: "This challenge has no questions left" });
    const given = new Map(req.body.answers.map((row) => [row.questionId, row.answer]));
    let correct = 0;
    for (const question of questions) {
      const answer = given.get(String(question._id));
      if (answer !== undefined && grade(question, answer).isCorrect) correct++;
    }
    const result = { user: req.user.id, correct, total: questions.length };

    // One atomic step, so a second submit (or a second friend) cannot slip in between the check and the save.
    const claim = role === "creator"
      ? { creator: req.user.id }
      : { $or: [{ opponent: null }, { opponent: req.user.id }] };
    const saved = await Challenge.findOneAndUpdate(
      { _id: challenge._id, "results.user": { $ne: req.user.id }, ...claim },
      { $push: { results: result }, ...(role === "friend" ? { $set: { opponent: req.user.id } } : {}) },
      { returnDocument: "after" }
    ).lean();
    if (!saved) return res.status(409).json({ message: "You already played this challenge" });

    if (saved.results.length >= 2) {
      const [a, b] = saved.results;
      const winner = a.correct === b.correct ? null : (a.correct > b.correct ? a.user : b.user);
      if (winner) await Challenge.updateOne({ _id: saved._id }, { $set: { winner } });
      saved.winner = winner;
    }
    logEvent(req.user.id, "challenge_played", { challenge: saved._id, correct, total: result.total });
    await awardXp(req.user.id, "challenge", { timeZone: req.user.timeZone, key: String(saved._id) });
    if (role === "friend") {
      await Notification.create({
        user: challenge.creator, type: "challenge", key: `challenge:${saved._id}:played`, title: "Challenge played",
        body: `${await nameOf(req.user.id)} played your challenge. See how you did.`, link: `/challenge/${saved._id}`
      }).catch((error) => console.error("Challenge notification failed:", error.message));
    }
    return res.status(200).json({ data: { result: { correct, total: result.total }, comparison: await comparison(saved, req.user.id) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createChallenge, listMine, getChallenge, submitChallenge };
