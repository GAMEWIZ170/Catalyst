const Flashcard = require("../models/flashcard.models");
const FlashcardProgress = require("../models/flashcardprogress.models");

const getFlashcardSummary = async (lessonId, userId) => {
  const cards = await Flashcard.find({ lesson: lessonId, isPublished: true, deletedAt: null }).select("_id").lean();
  const progress = await FlashcardProgress.find({ user: userId, flashcard: { $in: cards.map((card) => card._id) } })
    .select("flashcard confidence").lean();
  const confidence = new Map(progress.map((item) => [item.flashcard.toString(), item.confidence]));
  const summary = { total: cards.length, confident: 0, unsure: 0, unknown: 0, unrated: 0 };
  for (const card of cards) {
    const rating = confidence.get(card._id.toString());
    if (rating) summary[rating]++;
    else summary.unrated++;
  }
  return summary;
};

module.exports = getFlashcardSummary;
