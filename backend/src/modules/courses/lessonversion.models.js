const mongoose = require("mongoose");

// The content of a lesson as it was before a save. Only the parts an admin writes are kept;
// order, unit and published state are not history. The newest 50 per lesson are kept.
const lessonVersionSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
  title: { type: String, default: "" },
  explanation: { type: String, default: "" },
  explanationImage: { type: mongoose.Schema.Types.Mixed, default: null },
  videoHost: { type: String, default: "" },
  videoId: { type: String, default: "" },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // who made the change that replaced this version
  reason: { type: String, enum: ["edit", "restore"], default: "edit" }
}, { timestamps: true });

lessonVersionSchema.index({ lesson: 1, createdAt: -1 });

module.exports = mongoose.model("LessonVersion", lessonVersionSchema);
