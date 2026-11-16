const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  bestScore: { type: Number, min: 0, max: 100, default: 0 },
  lastScore: { type: Number, min: 0, max: 100, default: 0 },
  attempts: { type: Number, min: 0, default: 0 },
  completedAt: { type: Date, default: null },
  completedDays: { type: [String], default: [] }
}, { timestamps: true });

testResultSchema.index({ user: 1, test: 1 }, { unique: true });

module.exports = mongoose.model("TestResult", testResultSchema);
