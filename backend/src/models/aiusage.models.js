const mongoose = require("mongoose");

// AI use for one UTC day. One row per student (user set) and one for the whole platform (user null).
// The counters drive the daily quotas, the global cap and the numbers on the admin dashboard.
// `resting` is set on the platform row when the free provider says its daily allowance is used up.
const aiUsageSchema = new mongoose.Schema({
  day: { type: String, required: true },                                   // "2026-11-15" (UTC)
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  messages: { type: Number, default: 0 },                                 // study companion messages
  generations: { type: Number, default: 0 },                              // drafts made in a study set
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  resting: { type: Boolean, default: false }
}, { versionKey: false });

aiUsageSchema.index({ day: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("AiUsage", aiUsageSchema);
