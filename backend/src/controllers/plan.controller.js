const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Progress = require("../models/progress.models");
const User = require("../models/user.models");
const { dueCards } = require("./review.controller");
const { visibleMistakes, isDue } = require("./mistake.controller");

const DAY = 24 * 60 * 60 * 1000;
const LIST_MAX = 6;

// STUDENT: today's revision plan. A plain sum, no AI: the lessons not yet completed are shared evenly over the days
// left until the exam (today included), and today's share is shown with what is due for review today.
// Returns { data: null } when the student has not set an exam date, or it has passed.
const getPlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("examDate").lean();
    const today = new Date().toISOString().slice(0, 10);
    const examDay = user && user.examDate ? new Date(user.examDate).toISOString().slice(0, 10) : null;
    if (!examDay || examDay < today) return res.status(200).json({ data: null });
    const daysLeft = Math.round((Date.parse(examDay) - Date.parse(today)) / DAY) + 1;

    const courses = await Course.find({ isPublished: true, deletedAt: null }).select("code").sort({ code: 1 }).lean();
    const [units, doneRows, doneToday] = await Promise.all([
      Unit.find({ course: { $in: courses.map((course) => course._id) }, deletedAt: null }).select("course order").sort({ order: 1 }).lean(),
      Progress.find({ user: req.user.id, completed: true }).select("lesson").lean(),
      Progress.countDocuments({ user: req.user.id, completedDays: today })
    ]);
    const lessons = await Lesson.find({ unit: { $in: units.map((unit) => unit._id) }, isPublished: true, deletedAt: null })
      .select("unit title order").sort({ order: 1 }).lean();
    const done = new Set(doneRows.map((row) => row.lesson.toString()));
    const lessonsByUnit = new Map();
    for (const lesson of lessons) {
      const key = lesson.unit.toString();
      if (!lessonsByUnit.has(key)) lessonsByUnit.set(key, []);
      lessonsByUnit.get(key).push(lesson);
    }
    const remaining = [];
    for (const course of courses) {
      const courseUnits = units.filter((unit) => unit.course.toString() === course._id.toString() && lessonsByUnit.has(unit._id.toString()));
      courseUnits.forEach((unit, u) => lessonsByUnit.get(unit._id.toString()).forEach((lesson, l) => {
        if (!done.has(lesson._id.toString())) {
          remaining.push({ lessonId: lesson._id, courseId: course._id, course: course.code, label: `${u + 1}.${l + 1}`, title: lesson.title });
        }
      }));
    }

    // Today's share counts lessons already finished today, so the plan does not shrink as the student works through it.
    const perDay = Math.ceil((remaining.length + doneToday) / daysLeft);
    const left = Math.max(0, perDay - doneToday);
    const todays = remaining.slice(0, left);
    const [cards, mistakes] = await Promise.all([dueCards(req.user.id), visibleMistakes(req.user.id)]);
    return res.status(200).json({
      data: {
        examDate: examDay,
        daysLeft,
        remainingLessons: remaining.length,
        perDay,
        doneToday,
        lessons: todays.slice(0, LIST_MAX),
        moreLessons: Math.max(0, todays.length - LIST_MAX),
        due: { cards: cards.length, mistakes: mistakes.filter(isDue).length }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlan };
