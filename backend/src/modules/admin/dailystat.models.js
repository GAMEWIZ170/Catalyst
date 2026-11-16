const mongoose = require("mongoose");

// One row per UTC day, filled from the events collection by scripts/compute-stats.js. Safe to rebuild: running it again
// replaces the row for each day it covers.
const dailyStatSchema = new mongoose.Schema({
  day: { type: String, required: true, unique: true }, // "2026-11-14"
  dau: { type: Number, default: 0 },  // students active that day
  wau: { type: Number, default: 0 },  // active in the 7 days ending that day
  mau: { type: Number, default: 0 },  // active in the 30 days ending that day
  signups: { type: Number, default: 0 },
  counts: { type: mongoose.Schema.Types.Mixed, default: {} } // events that day, by type
}, { timestamps: true, minimize: false });

// The collection is named daily_stats.
module.exports = mongoose.model("DailyStat", dailyStatSchema, "daily_stats");
