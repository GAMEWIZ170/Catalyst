const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Progress = require("../models/progress.models");
const Position = require("../models/position.models");
const StudyTime = require("../models/studytime.models");
const User = require("../models/user.models");
const { dayKey, weekStart } = require("../utils/day");
const { loadActiveDays } = require("./progress.controller");
const { attachMeta } = require("../utils/courseMeta");
const { awardXp } = require("../utils/xp");

// STUDENT: the home screen in one call. Every published course with this student's progress and the
// next lesson to open, so the screen does not fetch each course tree one after another.
// A fixed number of queries however many courses there are (it only needs counts and the next lesson,
// not the tests and materials that a full outline carries).
const getHome = async (req, res, next) => {
  try {
    const courses = await attachMeta(await Course.find({ isPublished: true, deletedAt: null })
      .select("code title description category authors isFree")
      .sort({ code: 1 })
      .lean());
    const today = dayKey(req.user.timeZone);
    const [units, doneRows, positions, goalUser, studied, lessonsToday] = await Promise.all([
      Unit.find({ course: { $in: courses.map((course) => course._id) }, deletedAt: null }).select("course order").sort({ order: 1 }).lean(),
      Progress.find({ user: req.user.id, completed: true }).select("lesson").lean(),
      Position.find({ user: req.user.id }).select("course lesson kind position total updatedAt").lean(),
      User.findById(req.user.id).select("dailyGoal weeklyGoal").lean(),
      StudyTime.findOne({ user: req.user.id, day: today }).select("seconds").lean(),
      Progress.countDocuments({ user: req.user.id, completedDays: today })
    ]);
    const lessons = await Lesson.find({ unit: { $in: units.map((unit) => unit._id) }, isPublished: true, deletedAt: null })
      .select("unit title order").sort({ order: 1 }).lean();

    const lastByCourse = new Map(positions.map((row) => [row.course.toString(), row]));
    const done = new Set(doneRows.map((row) => row.lesson.toString()));
    const lessonsByUnit = new Map();
    for (const lesson of lessons) {
      const key = lesson.unit.toString();
      if (!lessonsByUnit.has(key)) lessonsByUnit.set(key, []);
      lessonsByUnit.get(key).push(lesson);
    }
    const unitsByCourse = new Map();
    for (const unit of units) {
      if (!lessonsByUnit.has(unit._id.toString())) continue; // a unit with nothing published is hidden
      const key = unit.course.toString();
      if (!unitsByCourse.has(key)) unitsByCourse.set(key, []);
      unitsByCourse.get(key).push(unit);
    }

    const data = courses.map((course) => {
      const courseUnits = unitsByCourse.get(course._id.toString()) || [];
      let total = 0;
      let completed = 0;
      let next = null;
      let last = null;
      const saved = lastByCourse.get(course._id.toString());
      courseUnits.forEach((unit, u) => {
        lessonsByUnit.get(unit._id.toString()).forEach((lesson, l) => {
          total++;
          if (saved && saved.lesson.toString() === lesson._id.toString()) {
            last = { lessonId: lesson._id, label: `${u + 1}.${l + 1}`, title: lesson.title, kind: saved.kind, position: saved.position, total: saved.total, at: saved.updatedAt, completed: done.has(lesson._id.toString()) };
          }
          if (done.has(lesson._id.toString())) completed++;
          else if (!next) next = { lessonId: lesson._id, label: `${u + 1}.${l + 1}`, title: lesson.title };
        });
      });
      return { ...course, progress: { completedLessons: completed, totalLessons: total }, next, last };
    });
    // Today's progress toward the student's own goal. Kind "none" means no bar is shown.
    const kind = goalUser?.dailyGoal?.kind || "none";
    const target = kind === "minutes" ? goalUser?.dailyGoal?.minutes || 10 : 1;
    const doneSoFar = kind === "minutes" ? Math.floor((studied?.seconds || 0) / 60) : lessonsToday;
    const goal = { kind, target, done: doneSoFar, met: kind !== "none" && doneSoFar >= target };
    // The goal bar is where a met goal is first seen, so the XP for it is given here. Once per day.
    if (goal.met) await awardXp(req.user.id, "daily_goal", { timeZone: req.user.timeZone, key: dayKey(req.user.timeZone) });
    // The weekly goal counts study days this week (Monday to Sunday). Missed days never take progress away, and
    // the rest of the week is rest. Met once, it stays met for the week.
    const weeklyDays = goalUser?.weeklyGoal?.days || 0;
    let weekly = null;
    if (weeklyDays > 0) {
      const monday = weekStart(today);
      const thisWeek = new Set((await loadActiveDays(req.user.id)).filter((day) => day >= monday && day <= today));
      weekly = { target: weeklyDays, done: thisWeek.size, met: thisWeek.size >= weeklyDays };
      if (weekly.met) await awardXp(req.user.id, "weekly_goal", { timeZone: req.user.timeZone, key: monday });
    }
    return res.status(200).json({ count: data.length, data, goal, weekly });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHome };
