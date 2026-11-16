const mongoose = require("mongoose");

const flashcardProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  flashcard: { type: mongoose.Schema.Types.ObjectId, ref: "Flashcard", required: true },
  confidence: { type: String, enum: ["confident", "unsure", "unknown"], required: true },
  reviewCount: { type: Number, default: 0, min: 0 },
  lastReviewedAt: { type: Date, default: null },
  reviewedDays: { type: [String], default: [] },
  // FSRS card state and the next due date. Rows from before spaced repetition have neither.
  fsrs: { type: mongoose.Schema.Types.Mixed, default: null },
  due: { type: Date, default: null }
}, { timestamps: true });

flashcardProgressSchema.index({ user: 1, flashcard: 1 }, { unique: true });

flashcardProgressSchema.index({ user: 1, due: 1 });

module.exports = mongoose.model("FlashcardProgress", flashcardProgressSchema);
