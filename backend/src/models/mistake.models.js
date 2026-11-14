const mongoose = require("mongoose");

// A question this student got wrong and has not yet mastered again.
// It is deleted once the student answers it right on two different days (see recordAnswer).
const mistakeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  wrongCount: { type: Number, min: 1, default: 1 },
  lastWrongAt: { type: Date, default: Date.now },
  correctStreak: { type: Number, min: 0, default: 0 },
  lastCorrectDay: { type: String, default: null } // UTC day, "YYYY-MM-DD"
}, { timestamps: true });

mistakeSchema.index({ user: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("Mistake", mistakeSchema);
