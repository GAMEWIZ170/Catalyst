const DailyStat = require("../models/dailystat.models");
const StatSummary = require("../models/statsummary.models");
const Report = require("../models/report.models");
const AiUsage = require("../models/aiusage.models");
const { limits: aiLimits } = require("../utils/aiQuota");
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
    // AI use, last 14 days (UTC): the platform rows, with how many different students used it each day.
    const aiSince = shiftDay(today, -13);
    const [aiRows, aiStudents] = await Promise.all([
      AiUsage.find({ day: { $gte: aiSince }, user: null }).select("day messages generations inputTokens outputTokens resting -_id").sort({ day: 1 }).lean(),
      AiUsage.aggregate([{ $match: { day: { $gte: aiSince }, user: { $ne: null } } }, { $group: { _id: "$day", students: { $sum: 1 } } }])
    ]);
    const studentsByDay = new Map(aiStudents.map((row) => [row._id, row.students]));
    const ai = { limits: aiLimits(), days: aiRows.map((row) => ({ ...row, students: studentsByDay.get(row.day) || 0 })) };
    return res.status(200).json({
      data: {
        computedAt: summary?.computedAt || null,
        ai,
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
