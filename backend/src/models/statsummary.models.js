const mongoose = require("mongoose");

// The numbers that cannot be a simple row per day (activation, retention table, top lessons). One row, key "latest",
// replaced each time scripts/compute-stats.js runs.
const statSummarySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  computedAt: { type: Date, default: Date.now }
}, { minimize: false });

module.exports = mongoose.model("StatSummary", statSummarySchema, "stat_summaries");
