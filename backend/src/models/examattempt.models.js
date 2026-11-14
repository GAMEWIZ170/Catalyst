const mongoose = require("mongoose");

// One go at a timed mock exam. The server sets endsAt when the exam starts and never trusts the browser's clock.
const examAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  startedAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  // questionId -> the answer string, saved as the student goes so a reload or a closed tab loses nothing.
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  flags: { type: [String], default: [] }, // question ids flagged for review
  result: { type: mongoose.Schema.Types.Mixed, default: null } // the marked exam, stored when it is submitted
}, { timestamps: true, minimize: false });

examAttemptSchema.index({ user: 1, test: 1, submittedAt: 1 });

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
