const DailyStat = require("../models/dailystat.models");
const StatSummary = require("../models/statsummary.models");
const Report = require("../models/report.models");
const { shiftDay } = require("../utils/day");

// ADMIN: the numbers for the dashboard. Everything but the open reports was worked out by scripts/compute-stats.js,
// so this is a few cheap reads. "computedAt" says how fresh it is (null until the script has run once).
const getDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rows, summary, openReports] = await Promise.all([
      DailyStat.find({ day: { $gte: shiftDay(today, -29), $lte: today } }).select("day dau wau mau signups -_id").sort({ day: 1 }).lean(),
      StatSummary.findOne({ key: "latest" }).lean(),
      Report.countDocuments({ status: "open" })
    ]);
    const latest = rows[rows.length - 1] || null;
    return res.status(200).json({
      data: {
        computedAt: summary?.computedAt || null,
        trend: rows,
        // Stickiness is the share of the month's active students who were active on a given day. Today is still in progress,
        // so the figure uses the latest finished day.
        stickiness: (() => {
          const done = rows.filter((row) => row.day < today).pop();
          return done && done.mau ? Math.round((done.dau / done.mau) * 100) : null;
        })(),
        latest,
        signupsThisWeek: rows.slice(-7).reduce((total, row) => total + row.signups, 0),
        summary: summary?.data || null,
        openReports
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
