const mongoose = require("mongoose");

// An exam the student added for themselves, to count down to. Not the timed mock exams (those are ExamAttempt).
const examDateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  startsAt: { type: Date, required: true },
  type: { type: String, enum: ["mid_semester", "end_semester", "quiz"], required: true }
}, { timestamps: true });

examDateSchema.index({ user: 1, startsAt: 1 });

module.exports = mongoose.model("ExamDate", examDateSchema);
