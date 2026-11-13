const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Progress = require("../models/progress.models");

// STUDENT: the home screen in one call. Every published course with this student's progress and the
// next lesson to open, so the screen does not fetch each course tree one after another.
// A fixed number of queries however many courses there are (it only needs counts and the next lesson,
// not the tests and materials that a full outline carries).
const getHome = async (req, res, next) => {
  try {
    const courses = await Course.find({ isPublished: true, deletedAt: null })
      .select("code title description")
      .sort({ code: 1 })
      .lean();
    const [units, doneRows] = await Promise.all([
      Unit.find({ course: { $in: courses.map((course) => course._id) }, deletedAt: null }).select("course order").sort({ order: 1 }).lean(),
      Progress.find({ user: req.user.id, completed: true }).select("lesson").lean()
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
      courseUnits.forEach((unit, u) => {
        lessonsByUnit.get(unit._id.toString()).forEach((lesson, l) => {
          total++;
          if (done.has(lesson._id.toString())) completed++;
          else if (!next) next = { lessonId: lesson._id, label: `${u + 1}.${l + 1}`, title: lesson.title };
        });
      });
      return { ...course, progress: { completedLessons: completed, totalLessons: total }, next };
    });
    return res.status(200).json({ count: data.length, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHome };
