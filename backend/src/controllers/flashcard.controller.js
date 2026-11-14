const mongoose = require("mongoose");
const Flashcard = require("../models/flashcard.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const Progress = require("../models/progress.models");
const Lesson = require("../models/lesson.models");
const { findVisibleLesson, parentIsAvailable } = require("../utils/visibility");
const getFlashcardSummary = require("../utils/flashcardSummary");
const { schedule, RATING } = require("../utils/scheduler");

const badId = (id) => !mongoose.isObjectIdOrHexString(id);
const todayKey = () => new Date().toISOString().slice(0, 10);

const cardsForStudent = (cards, progressByCard) => cards.map((card) => ({
  _id: card._id,
  front: card.front,
  back: card.back,
  order: card.order,
  confidence: progressByCard.get(card._id.toString()) || null
}));

const getLessonFlashcards = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid lesson ID" });
  try {
    const lesson = await findVisibleLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const cards = await Flashcard.find({ lesson: lesson._id, isPublished: true, deletedAt: null })
      .select("_id front back order").sort({ order: 1 }).lean();
    const progress = await FlashcardProgress.find({
      user: req.user.id,
      flashcard: { $in: cards.map((card) => card._id) }
    }).select("flashcard confidence").lean();
    const progressByCard = new Map(progress.map((item) => [item.flashcard.toString(), item.confidence]));
    const summary = await getFlashcardSummary(lesson._id, req.user.id);
    const filtered = req.query.filter === "review"
      ? cards.filter((card) => !progressByCard.has(card._id.toString()) ||
        ["unsure", "unknown"].includes(progressByCard.get(card._id.toString())))
      : cards;
    return res.status(200).json({ data: { cards: cardsForStudent(filtered, progressByCard), summary } });
  } catch (error) {
    next(error);
  }
};

const rateFlashcard = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid flashcard ID" });
  try {
    const card = await Flashcard.findOne({ _id: req.params.id, isPublished: true, deletedAt: null }).lean();
    if (!card || !(await findVisibleLesson(card.lesson))) return res.status(404).json({ message: "Flashcard not found" });
    const existing = await FlashcardProgress.findOne({ user: req.user.id, flashcard: card._id }).select("fsrs").lean();
    const next = schedule(existing?.fsrs, RATING[req.body.confidence]);
    // The save and the card list do not depend on each other, so they run together.
    const [progress, cards] = await Promise.all([
      FlashcardProgress.findOneAndUpdate(
        { user: req.user.id, flashcard: card._id },
        {
          $set: { confidence: req.body.confidence, lastReviewedAt: new Date(), fsrs: next.fsrs, due: next.due },
          $inc: { reviewCount: 1 },
          $addToSet: { reviewedDays: todayKey() }
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
      ).lean(),
      Flashcard.find({ lesson: card.lesson, isPublished: true, deletedAt: null }).select("_id").lean()
    ]);
    const progressRecords = await FlashcardProgress.find({
      user: req.user.id,
      flashcard: { $in: cards.map((item) => item._id) }
    }).select("flashcard confidence").lean();
    const progressByCard = new Map(progressRecords.map((item) => [item.flashcard.toString(), item.confidence]));
    if (cards.length && cards.every((item) => progressByCard.has(item._id.toString()))) {
      await Progress.findOneAndUpdate(
        { user: req.user.id, lesson: card.lesson },
        { $set: { completed: true }, $setOnInsert: { completedAt: new Date() }, $addToSet: { completedDays: todayKey() } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
      );
    }
    return res.status(200).json({ data: { summary: getFlashcardSummary.summarize(cards, progressByCard), reviewCount: progress.reviewCount } });
  } catch (error) {
    next(error);
  }
};

const createFlashcard = async (req, res, next) => {
  try {
    if (!(await parentIsAvailable("lesson", req.body.lesson))) return res.status(404).json({ message: "Lesson not found" });
    const lesson = await Lesson.findOne({ _id: req.body.lesson, deletedAt: null }).select("_id").lean();
    const order = req.body.order || ((await Flashcard.find({ lesson: lesson._id, deletedAt: null }).select("order").sort({ order: -1 }).limit(1).lean())[0]?.order || 0) + 1;
    const card = await Flashcard.create({ ...req.body, order });
    return res.status(201).json({ message: "Flashcard created successfully", data: card });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

const updateFlashcard = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid flashcard ID" });
  try {
    const card = await Flashcard.findOne({ _id: req.params.id, deletedAt: null });
    if (!card) return res.status(404).json({ message: "Flashcard not found" });
    if (req.body.lesson && !(await parentIsAvailable("lesson", req.body.lesson))) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    card.set(req.body);
    await card.save();
    return res.status(200).json({ message: "Flashcard updated successfully", data: card });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors)[0].message });
    next(error);
  }
};

const deleteFlashcard = async (req, res, next) => {
  if (badId(req.params.id)) return res.status(400).json({ message: "Invalid flashcard ID" });
  try {
    const card = await Flashcard.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() }, { returnDocument: "after" });
    if (!card) return res.status(404).json({ message: "Flashcard not found" });
    return res.status(200).json({ message: "Flashcard deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLessonFlashcards, rateFlashcard, createFlashcard, updateFlashcard, deleteFlashcard };
