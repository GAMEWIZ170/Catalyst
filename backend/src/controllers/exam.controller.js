const mongoose = require("mongoose");
const ExamAttempt = require("../models/examattempt.models");
const Question = require("../models/question.models");
const { findVisibleTest } = require("../utils/visibility");
const { studentQuestion } = require("../utils/serializers");
const { grade, correctAnswerOf } = require("../utils/grading");
const { recordResult } = require("./test.controller");
const { recordAnswer } = require("./mistake.controller");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const GRACE_MS = 30 * 1000; // a submit that left just before the deadline may arrive a little after it

const studentView = (attempt, questions) => ({
  attemptId: attempt._id,
  serverNow: new Date(),
  endsAt: attempt.endsAt,
  answers: attempt.answers || {},
  flags: attempt.flags || [],
  questions: questions.map(studentQuestion)
});

// Keep only answers for real questions, as strings of a sane size.
const cleanAnswers = (given, questions) => {
  const ids = new Set(questions.map((question) => question._id.toString()));
  const clean = {};
  for (const [id, answer] of Object.entries(given || {})) {
    if (ids.has(id) && typeof answer === "string" && answer.length <= 1000) clean[id] = answer;
  }
  return clean;
};

// Marks the exam, records the result like a normal test, and stores the full review on the attempt.
const finish = async (attempt, test, questions, answers) => {
  let correct = 0;
  const review = questions.map((question) => {
    const answer = answers[question._id.toString()];
    const graded = answer === undefined ? { isCorrect: false } : grade(question, answer);
    if (graded.isCorrect) correct++;
    return {
      question: studentQuestion(question),
      yourAnswer: answer ?? null,
      isCorrect: graded.isCorrect,
      ...(graded.unitWrong ? { unitWrong: true } : {}),
      correctAnswer: correctAnswerOf(question),
      explanation: question.explanation,
      explanationImage: question.explanationImage,
      workedSolution: question.workedSolution || [],
      flagged: attempt.flags.includes(question._id.toString())
    };
  });
  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const { result, passPercent, passed } = await recordResult(attempt.user, test, score);
  // Wrong answers join the mistakes queue and right ones count toward leaving it, as with any answered question.
  await Promise.all(questions.map((question, index) => recordAnswer(attempt.user, question._id, review[index].isCorrect)));
  return { score, correct, total, bestScore: result.bestScore, attempts: result.attempts, passPercent, passed, review };
};

const loadQuestions = (testId) => Question.find({ test: testId, deletedAt: null }).sort({ order: 1 }).lean();

// Submits an attempt: with the browser's final answers if they arrived in time, otherwise the saved ones.
const submitAttempt = async (attempt, test, finalAnswers, finalFlags) => {
  const questions = await loadQuestions(test._id);
  const late = Date.now() > attempt.endsAt.getTime() + GRACE_MS;
  const answers = late ? (attempt.answers || {}) : { ...(attempt.answers || {}), ...cleanAnswers(finalAnswers, questions) };
  if (!late && Array.isArray(finalFlags)) attempt.flags = finalFlags.map(String);
  // Claim the attempt first so two submits at once cannot record two results. The loser gets the stored result (null while the winner is still marking).
  const claimed = await ExamAttempt.findOneAndUpdate({ _id: attempt._id, submittedAt: null }, { $set: { submittedAt: new Date() } }, { returnDocument: "before" }).lean();
  if (!claimed) return (await ExamAttempt.findById(attempt._id).lean()).result;
  const result = await finish(attempt, test, questions, answers);
  await ExamAttempt.updateOne({ _id: attempt._id }, { $set: { answers, flags: attempt.flags, result } });
  return result;
};

// STUDENT: start a timed exam, or pick up the one already running. No answers or feedback are sent.
const start = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid test ID" });
  try {
    const test = await findVisibleTest(req.params.id);
    if (!test || !test.timeLimitMinutes) return res.status(404).json({ message: "Test not found" });
    const questions = await loadQuestions(test._id);
    if (!questions.length) return res.status(409).json({ message: "This test has no questions yet" });
    const open = await ExamAttempt.findOne({ user: req.user.id, test: test._id, submittedAt: null }).sort({ startedAt: -1 });
    if (open && Date.now() > open.endsAt.getTime()) {
      // Time ran out while the student was away: mark what was saved.
      const result = await submitAttempt(open, test, null, null);
      return res.status(200).json({ data: { attemptId: open._id, finished: true, result } });
    }
    if (open) return res.status(200).json({ data: studentView(open, questions) });
    const now = new Date();
    const attempt = await ExamAttempt.create({ user: req.user.id, test: test._id, startedAt: now, endsAt: new Date(now.getTime() + test.timeLimitMinutes * 60 * 1000) });
    return res.status(201).json({ data: studentView(attempt, questions) });
  } catch (error) {
    next(error);
  }
};

const findOwn = async (req, res) => {
  if (badId(req.params.attemptId)) { res.status(400).json({ message: "Invalid attempt ID" }); return null; }
  const attempt = await ExamAttempt.findOne({ _id: req.params.attemptId, user: req.user.id });
  if (!attempt) { res.status(404).json({ message: "Attempt not found" }); return null; }
  return attempt;
};

// STUDENT: save answers and flags so far. Ignored once the time is up.
const save = async (req, res, next) => {
  try {
    const attempt = await findOwn(req, res);
    if (!attempt) return;
    if (attempt.submittedAt) return res.status(409).json({ message: "This exam was already submitted" });
    if (Date.now() > attempt.endsAt.getTime()) return res.status(409).json({ message: "Time is up" });
    const questions = await loadQuestions(attempt.test);
    attempt.answers = { ...(attempt.answers || {}), ...cleanAnswers(req.body?.answers, questions) };
    if (Array.isArray(req.body?.flags)) attempt.flags = req.body?.flags.map(String).slice(0, 200);
    attempt.markModified("answers");
    await attempt.save();
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// STUDENT: hand in the exam (or let the page do it when the clock reaches zero). Repeating it returns the same result.
const submit = async (req, res, next) => {
  try {
    const attempt = await findOwn(req, res);
    if (!attempt) return;
    const test = await findVisibleTest(attempt.test);
    if (!test) return res.status(404).json({ message: "Test not found" });
    const result = attempt.submittedAt ? attempt.result : await submitAttempt(attempt, test, req.body?.answers, req.body?.flags);
    if (!result) return res.status(409).json({ message: "Your exam is being marked. Try again in a moment." });
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { start, save, submit };
