const mongoose = require("mongoose");
const Flashcard = require("../models/flashcard.models");
const FlashcardProgress = require("../models/flashcardprogress.models");
const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");
const { visibleMistakes, isDue } = require("./mistake.controller");

const SESSION_SIZE = 20;

// Cards this student should see now: due by the FSRS schedule, or rated unsure/unknown before spaced repetition existed
// (those rows have no due date). Hidden or deleted cards and lessons are left out. Soonest due first.
const dueCards = async (userId) => {
  const rows = await FlashcardProgress.find({
    user: userId,
    $or: [{ due: { $lte: new Date() } }, { due: null, confidence: { $in: ["unsure", "unknown"] } }]
  }).sort({ due: 1 }).limit(300).select("flashcard").lean();
  if (!rows.length) return [];
  const cards = await Flashcard.find({ _id: { $in: rows.map((row) => row.flashcard) }, isPublished: true, deletedAt: null }).lean();
  const lessonIds = [...new Set(cards.map((card) => card.lesson.toString()))].map((id) => new mongoose.Types.ObjectId(id));
  const visible = await Lesson.aggregate([
    { $match: { _id: { $in: lessonIds }, isPublished: true, deletedAt: null } },
    { $lookup: { from: Unit.collection.name, localField: "unit", foreignField: "_id", pipeline: [{ $match: { deletedAt: null } }, { $project: { course: 1 } }], as: "unit" } },
    { $unwind: "$unit" },
    { $lookup: { from: Course.collection.name, localField: "unit.course", foreignField: "_id", pipeline: [{ $match: { isPublished: true, deletedAt: null } }, { $project: { _id: 1 } }], as: "course" } },
    { $unwind: "$course" },
    { $project: { _id: 1 } }
  ]);
  const visibleSet = new Set(visible.map((lesson) => lesson._id.toString()));
  const cardById = new Map(cards.map((card) => [card._id.toString(), card]));
  return rows.map((row) => cardById.get(row.flashcard.toString())).filter((card) => card && visibleSet.has(card.lesson.toString()));
};

// STUDENT: how much is due today.
const due = async (req, res, next) => {
  try {
    const [cards, mistakes] = await Promise.all([dueCards(req.user.id), visibleMistakes(req.user.id)]);
    return res.status(200).json({ data: { cards: cards.length, mistakes: mistakes.filter(isDue).length } });
  } catch (error) {
    next(error);
  }
};

// STUDENT: up to 20 due cards. Each is rated with POST /flashcards/:id/rate, which sets its next due date.
const session = async (req, res, next) => {
  try {
    const cards = (await dueCards(req.user.id)).slice(0, SESSION_SIZE);
    return res.status(200).json({ data: { cards: cards.map((card) => ({ _id: card._id, front: card.front, back: card.back, lessonId: card.lesson })) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { dueCards, due, session };
