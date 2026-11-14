const mongoose = require("mongoose");

// Running totals for one question, across all students. No student id is stored, so the numbers are anonymous.
// "wrong" counts wrong answers per choice: the option id for multiple choice, "true" or "false" for true/false.
// Counting started with this feature, so older answers are not in it.
const questionStatSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, unique: true },
  attempts: { type: Number, default: 0, min: 0 },
  correct: { type: Number, default: 0, min: 0 },
  wrong: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// The analytics table reads rows with enough attempts, lowest percent first.
questionStatSchema.index({ attempts: 1 });

module.exports = mongoose.model("QuestionStat", questionStatSchema);
