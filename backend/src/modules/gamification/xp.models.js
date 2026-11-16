const mongoose = require("mongoose");

// One XP award. The ledger is what the daily caps and the once-only rules check against.
// key makes an award happen once (for example one lesson, or one question on one day).
const xpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  source: { type: String, required: true },
  day: { type: String, required: true },
  key: { type: String, default: null },
  xp: { type: Number, required: true, min: 1 },
  ts: { type: Date, default: Date.now }
}, { versionKey: false });

xpSchema.index({ user: 1, source: 1, day: 1 });
xpSchema.index({ user: 1, source: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string" } } });

module.exports = mongoose.model("XpEntry", xpSchema);
