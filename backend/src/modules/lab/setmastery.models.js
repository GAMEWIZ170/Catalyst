const mongoose = require("mongoose");

// How well one student knows one unit of a study set. One row per student and unit, made the first time they finish a
// lesson or take the unit's quiz. level: 0 Not started, 1 Familiar, 2 Proficient, 3 Mastered (rules in utils/setMastery.js).
// A student studying a shared set gets their own rows, so the owner's progress is never touched.
const setMasterySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "SetUnit", required: true },
  level: { type: Number, min: 0, max: 3, default: 0 },
  bestScore: { type: Number, min: 0, max: 100, default: 0 },
  lastScore: { type: Number, min: 0, max: 100, default: 0 },
  attempts: { type: Number, min: 0, default: 0 },
  proficientDay: { type: String, default: null },  // UTC day the unit first reached Proficient
  lessonsDone: { type: [mongoose.Schema.Types.ObjectId], default: [] } // lessons of this unit the student finished
}, { timestamps: true });

setMasterySchema.index({ user: 1, unit: 1 }, { unique: true });
setMasterySchema.index({ user: 1, set: 1 });

module.exports = mongoose.model("SetMastery", setMasterySchema);
