const DailyStat = require("./dailystat.models");
const StatSummary = require("./statsummary.models");
const Report = require("../community/report.models");
const AiUsage = require("../lab/aiusage.models");
const { limits: aiLimits, costOf } = require("../../utils/aiQuota");
const { shiftDay } = require("../../utils/day");
const { defaultModel } = require("../../config/ai");

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
      AiUsage.find({ day: { $gte: aiSince }, user: null }).select("day messages generations builds requests inputTokens outputTokens resting -_id").sort({ day: 1 }).lean(),
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

// ADMIN: AI use per student over the last ?days= (1 to 90, default 30), biggest spender first, with the platform total.
// `cost` is what the tokens would cost in US dollars on the paid tier of the default model (config/ai.js). The free tier
// costs nothing: the number is there to set a price (cost per paying student ÷ 0.6 keeps a 40% margin).
const getAiUsage = async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const today = new Date().toISOString().slice(0, 10);
    const since = shiftDay(today, -(days - 1));
    const sums = { messages: { $sum: "$messages" }, generations: { $sum: "$generations" }, builds: { $sum: "$builds" }, marks: { $sum: "$marks" }, requests: { $sum: "$requests" }, inputTokens: { $sum: "$inputTokens" }, outputTokens: { $sum: "$outputTokens" } };
    const [rows, platform] = await Promise.all([
      AiUsage.aggregate([
        { $match: { day: { $gte: since }, user: { $ne: null } } },
        { $group: { _id: "$user", activeDays: { $sum: 1 }, lastDay: { $max: "$day" }, ...sums } },
        { $sort: { inputTokens: -1 } },
        { $limit: 200 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", pipeline: [{ $project: { name: 1, email: 1 } }], as: "user" } }
      ]),
      AiUsage.aggregate([{ $match: { day: { $gte: since }, user: null } }, { $group: { _id: null, ...sums } }])
    ]);
    const model = defaultModel();
    const shape = ({ _id, user, ...row }) => ({ ...row, cost: Number(costOf(row.inputTokens, row.outputTokens).toFixed(4)) });
    const students = rows.map((row) => ({ user: { id: row._id, name: row.user[0]?.name || "Deleted account", email: row.user[0]?.email || "" }, ...shape(row) }));
    const total = shape(platform[0] || { messages: 0, generations: 0, builds: 0, requests: 0, inputTokens: 0, outputTokens: 0 });
    return res.status(200).json({
      data: {
        days, since, limits: aiLimits(),
        model: { id: model.id, label: model.label, inputPrice: model.inputPrice || 0, outputPrice: model.outputPrice || 0 },
        total,
        costPerStudent: students.length ? Number((total.cost / students.length).toFixed(4)) : 0,
        students
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getAiUsage };
