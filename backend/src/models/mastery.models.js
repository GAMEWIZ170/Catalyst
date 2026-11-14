const mongoose = require("mongoose");

// How well a student knows a lesson. level: 1 Attempted, 2 Familiar, 3 Proficient, 4 Mastered.
// A lesson with no row is Not started. See utils/mastery.js for the rules.
const masterySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
  level: { type: Number, min: 1, max: 4, default: 1 },
  proficientDay: { type: String, default: null }, // UTC day the lesson first reached Proficient
  lastDropDay: { type: String, default: null } // UTC day of the last drop (at most one drop a day)
}, { timestamps: true });

masterySchema.index({ user: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model("Mastery", masterySchema);
