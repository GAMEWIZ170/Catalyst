const mongoose = require("mongoose");

// A score on the weekly or monthly board of a community set's quiz. A student gets onto a board by choosing to when they start
// the timed quiz, and only the FIRST timed attempt of a period counts (the unique index below), so scores can be compared.
// Weeks run Monday to Sunday and months are calendar months, both in UTC (one clock for everyone). A board "resets" simply
// because the key changes; old rows stay and are never shown.
const leaderboardSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: "StudySet", required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  period: { type: String, enum: ["week", "month"], required: true },
  key: { type: String, required: true },          // the Monday ("2026-11-09") for a week, "2026-11" for a month
  score: { type: Number, min: 0, max: 100, required: true },
  correct: { type: Number, min: 0, required: true },
  total: { type: Number, min: 1, required: true },
  durationMs: { type: Number, min: 0, required: true },
  at: { type: Date, default: Date.now }
}, { versionKey: false });

leaderboardSchema.index({ test: 1, user: 1, period: 1, key: 1 }, { unique: true });
leaderboardSchema.index({ test: 1, period: 1, key: 1 });
leaderboardSchema.index({ user: 1 });

module.exports = mongoose.model("LeaderboardEntry", leaderboardSchema);
