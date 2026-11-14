const mongoose = require("mongoose");

// A student's own study set: notes, flashcards and quizzes on one topic. Private unless its owner shares it (Phase X7).
const studySetSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", trim: true, maxlength: 300 },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null }, // optional link to an official course
  topic: { type: String, default: "", trim: true, maxlength: 80 },
  visibility: { type: String, enum: ["private", "link", "community"], default: "private" },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

studySetSchema.index({ owner: 1, deletedAt: 1, updatedAt: -1 });

module.exports = mongoose.model("StudySet", studySetSchema);
