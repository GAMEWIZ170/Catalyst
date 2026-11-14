const mongoose = require("mongoose");
const StudySet = require("../models/studyset.models");
const SetNote = require("../models/setnote.models");
const Flashcard = require("../models/flashcard.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const Course = require("../models/course.models");
const { findOwnSet } = require("../utils/ownSet");
const { logEvent } = require("../utils/events");
const { questionForAdmin } = require("../utils/serializers");
const getFlashcardSummary = require("../utils/flashcardSummary");

const MAX_SETS = 100;
const MAX_CARDS = 500;
const MAX_QUIZZES = 20;
const MAX_QUESTIONS = 100;

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notFound = (res, what = "Study set") => res.status(404).json({ message: `${what} not found` });

const publicSet = (set, extra = {}) => ({
  id: set._id, title: set.title, description: set.description, topic: set.topic, visibility: set.visibility,
  course: set.course && set.course.code ? { id: set.course._id, code: set.course.code, title: set.course.title } : null,
  createdAt: set.createdAt, updatedAt: set.updatedAt, ...extra
});

// STUDENT: my sets, newest change first. ?q= searches the title, topic and description.
const listSets = async (req, res, next) => {
  try {
    const filter = { owner: req.user.id, deletedAt: null };
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: pattern }, { topic: pattern }, { description: pattern }];
    }
    const sets = await StudySet.find(filter).populate("course", "code title").sort({ updatedAt: -1 }).limit(MAX_SETS).lean();
    const ids = sets.map((set) => set._id);
    const [cards, quizzes] = await Promise.all([
      Flashcard.aggregate([{ $match: { set: { $in: ids }, deletedAt: null } }, { $group: { _id: "$set", n: { $sum: 1 } } }]),
      Test.aggregate([{ $match: { set: { $in: ids }, deletedAt: null } }, { $group: { _id: "$set", n: { $sum: 1 } } }])
    ]);
    const cardCount = new Map(cards.map((row) => [String(row._id), row.n]));
    const quizCount = new Map(quizzes.map((row) => [String(row._id), row.n]));
    return res.status(200).json({ data: sets.map((set) => publicSet(set, { cardCount: cardCount.get(String(set._id)) || 0, quizCount: quizCount.get(String(set._id)) || 0 })) });
  } catch (error) {
    next(error);
  }
};

const courseChecked = async (courseId) => (courseId ? Boolean(await Course.exists({ _id: courseId, isPublished: true, deletedAt: null })) : true);

const createSet = async (req, res, next) => {
  try {
    if ((await StudySet.countDocuments({ owner: req.user.id, deletedAt: null })) >= MAX_SETS) return res.status(409).json({ message: `You can keep up to ${MAX_SETS} study sets. Delete one first.` });
    if (!(await courseChecked(req.body.course))) return notFound(res, "Course");
    const set = await StudySet.create({ ...req.body, owner: req.user.id, visibility: "private" });
    logEvent(req.user.id, "set_created", { set: set._id });
    return res.status(201).json({ message: "Study set created", data: publicSet(set) });
  } catch (error) {
    next(error);
  }
};

const getSet = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    await set.populate("course", "code title");
    return res.status(200).json({ data: publicSet(set) });
  } catch (error) {
    next(error);
  }
};

const updateSet = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if (req.body.course !== undefined && !(await courseChecked(req.body.course))) return notFound(res, "Course");
    set.set(req.body);
    await set.save();
    await set.populate("course", "code title");
    return res.status(200).json({ message: "Study set saved", data: publicSet(set) });
  } catch (error) {
    next(error);
  }
};

// Deleting a set hides it everywhere (its cards leave the review queue and its quizzes close). Nothing is left for anyone else to see.
const deleteSet = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    set.deletedAt = new Date();
    await set.save();
    return res.status(200).json({ message: "Study set deleted" });
  } catch (error) {
    next(error);
  }
};

// --- notes
const getNotes = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const note = await SetNote.findOne({ set: set._id }).lean();
    return res.status(200).json({ data: { content: note?.content || null, updatedAt: note?.updatedAt || null } });
  } catch (error) {
    next(error);
  }
};

const saveNotes = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const note = await SetNote.findOneAndUpdate({ set: set._id }, { $set: { content: req.body.content } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    await StudySet.updateOne({ _id: set._id }, { $set: { updatedAt: new Date() } });
    return res.status(200).json({ data: { updatedAt: note.updatedAt } });
  } catch (error) {
    next(error);
  }
};

// --- flashcards
const sideText = (value) => ({ text: String(value).trim() });
const publicCard = (card) => ({ id: card._id, front: card.front?.text || "", back: card.back?.text || "", order: card.order });

const listCards = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const cards = await Flashcard.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: cards.map(publicCard) });
  } catch (error) {
    next(error);
  }
};

const nextOrder = async (setId) => ((await Flashcard.findOne({ set: setId, deletedAt: null }).sort({ order: -1 }).select("order").lean())?.order || 0) + 1;
const cardCount = (setId) => Flashcard.countDocuments({ set: setId, deletedAt: null });

const createCard = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if ((await cardCount(set._id)) >= MAX_CARDS) return res.status(409).json({ message: `A set can hold up to ${MAX_CARDS} cards` });
    const card = await Flashcard.create({ set: set._id, front: sideText(req.body.front), back: sideText(req.body.back), order: await nextOrder(set._id), isPublished: true });
    return res.status(201).json({ message: "Card added", data: publicCard(card) });
  } catch (error) {
    next(error);
  }
};

// Many cards at once, for the paste-and-split helper. All or none.
const createCards = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const existing = await cardCount(set._id);
    if (existing + req.body.cards.length > MAX_CARDS) return res.status(409).json({ message: `A set can hold up to ${MAX_CARDS} cards. This one has ${existing}.` });
    let order = await nextOrder(set._id);
    const docs = req.body.cards.map((card) => ({ set: set._id, front: sideText(card.front), back: sideText(card.back), order: order++, isPublished: true }));
    const made = await Flashcard.insertMany(docs);
    await StudySet.updateOne({ _id: set._id }, { $set: { updatedAt: new Date() } });
    return res.status(201).json({ message: `${made.length} cards added`, data: made.map(publicCard) });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

const ownCard = async (req) => {
  if (badId(req.params.cardId)) return null;
  const card = await Flashcard.findOne({ _id: req.params.cardId, set: { $ne: null }, deletedAt: null });
  if (!card || !(await findOwnSet(card.set, req.user.id))) return null;
  return card;
};

const updateCard = async (req, res, next) => {
  try {
    const card = await ownCard(req);
    if (!card) return notFound(res, "Card");
    if (req.body.front !== undefined) card.front = sideText(req.body.front);
    if (req.body.back !== undefined) card.back = sideText(req.body.back);
    await card.save();
    return res.status(200).json({ message: "Card saved", data: publicCard(card) });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

const deleteCard = async (req, res, next) => {
  try {
    const card = await ownCard(req);
    if (!card) return notFound(res, "Card");
    card.deletedAt = new Date();
    await card.save();
    return res.status(200).json({ message: "Card deleted" });
  } catch (error) {
    next(error);
  }
};

// The deck to study now, with this student's rating on each card, like a lesson deck. Ratings go to POST /flashcards/:id/rate.
const studyCards = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const cards = await Flashcard.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean();
    const progress = await FlashcardProgress.find({ user: req.user.id, flashcard: { $in: cards.map((card) => card._id) } }).select("flashcard confidence").lean();
    const byCard = new Map(progress.map((row) => [String(row.flashcard), row.confidence]));
    const wanted = req.query.filter === "review" ? cards.filter((card) => !byCard.has(String(card._id)) || ["unsure", "unknown"].includes(byCard.get(String(card._id)))) : cards;
    return res.status(200).json({
      data: {
        cards: wanted.map((card) => ({ _id: card._id, front: card.front, back: card.back, order: card.order, confidence: byCard.get(String(card._id)) || null })),
        summary: getFlashcardSummary.summarize(cards, byCard)
      }
    });
  } catch (error) {
    next(error);
  }
};

// --- quizzes (a Test with scope "set", played in the normal test screen)
const quizCard = (test, questionCount) => ({ id: test._id, title: test.title, questionCount, timeLimitMinutes: test.timeLimitMinutes || null });

const listQuizzes = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    const tests = await Test.find({ set: set._id, deletedAt: null }).sort({ order: 1 }).lean();
    const counts = await Question.aggregate([{ $match: { test: { $in: tests.map((test) => test._id) }, deletedAt: null } }, { $group: { _id: "$test", n: { $sum: 1 } } }]);
    const byTest = new Map(counts.map((row) => [String(row._id), row.n]));
    return res.status(200).json({ data: tests.map((test) => quizCard(test, byTest.get(String(test._id)) || 0)) });
  } catch (error) {
    next(error);
  }
};

const createQuiz = async (req, res, next) => {
  try {
    const set = await findOwnSet(req.params.id, req.user.id);
    if (!set) return notFound(res);
    if ((await Test.countDocuments({ set: set._id, deletedAt: null })) >= MAX_QUIZZES) return res.status(409).json({ message: `A set can hold up to ${MAX_QUIZZES} quizzes` });
    const test = await Test.create({ scope: "set", set: set._id, title: req.body.title, isPublished: true });
    return res.status(201).json({ message: "Quiz created", data: quizCard(test, 0) });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

// The quiz with this id, only if it is in one of the student's own sets.
const ownQuiz = async (testId, userId) => {
  if (badId(testId)) return null;
  const test = await Test.findOne({ _id: testId, scope: "set", deletedAt: null });
  if (!test || !(await findOwnSet(test.set, userId))) return null;
  return test;
};

const updateQuiz = async (req, res, next) => {
  try {
    const test = await ownQuiz(req.params.testId, req.user.id);
    if (!test) return notFound(res, "Quiz");
    test.title = req.body.title;
    await test.save();
    return res.status(200).json({ message: "Quiz saved", data: quizCard(test, undefined) });
  } catch (error) {
    next(error);
  }
};

const deleteQuiz = async (req, res, next) => {
  try {
    const test = await ownQuiz(req.params.testId, req.user.id);
    if (!test) return notFound(res, "Quiz");
    test.deletedAt = new Date();
    await test.save();
    return res.status(200).json({ message: "Quiz deleted" });
  } catch (error) {
    next(error);
  }
};

// The quiz with its questions and answers, for its owner to edit.
const getQuiz = async (req, res, next) => {
  try {
    const test = await ownQuiz(req.params.testId, req.user.id);
    if (!test) return notFound(res, "Quiz");
    const questions = await Question.find({ test: test._id, deletedAt: null }).sort({ order: 1 }).lean();
    return res.status(200).json({ data: { id: test._id, title: test.title, set: test.set, questions: questions.map(questionForAdmin) } });
  } catch (error) {
    next(error);
  }
};

// Before the shared question handlers run: the quiz (or the question's quiz) must be the student's own, only plain
// multiple choice and true or false are allowed, and a quiz holds a limited number of questions.
const ownQuizInBody = async (req, res, next) => {
  try {
    const test = await ownQuiz(req.body.test, req.user.id);
    if (!test) return notFound(res, "Quiz");
    if (!["mcq", "true_false"].includes(req.body.type)) return res.status(400).json({ message: "Study set quizzes use multiple choice or true or false questions" });
    if ((await Question.countDocuments({ test: test._id, deletedAt: null })) >= MAX_QUESTIONS) return res.status(409).json({ message: `A quiz can hold up to ${MAX_QUESTIONS} questions` });
    next();
  } catch (error) {
    next(error);
  }
};

const ownQuestion = async (req, res, next) => {
  try {
    if (badId(req.params.id)) return notFound(res, "Question");
    const question = await Question.findOne({ _id: req.params.id, deletedAt: null }).select("test").lean();
    if (!question || !(await ownQuiz(question.test, req.user.id))) return notFound(res, "Question");
    if (req.body.test && String(req.body.test) !== String(question.test)) return res.status(400).json({ message: "A question cannot move to another quiz" });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSets, createSet, getSet, updateSet, deleteSet, getNotes, saveNotes,
  listCards, createCard, createCards, updateCard, deleteCard, studyCards,
  listQuizzes, createQuiz, updateQuiz, deleteQuiz, getQuiz, ownQuizInBody, ownQuestion, ownQuiz
};
