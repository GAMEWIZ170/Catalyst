const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Progress = require("../models/progress.models");
const mongoose = require("mongoose");

const createCourse = async (req, res, next) => {
  try {
    const course = new Course(req.body);
    await course.save();

    // CHANGED: 201, because a new record was created
    return res.status(201).json({
      message: "Course created successfully",
      data: course
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this code already exists"
      });
    }
    next(error);
  }
};

// STUDENT: one course with its units and lessons, plus what this student has finished
const getCourseByID = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    // 1. The course itself
    const course = await Course.findOne({
      _id: req.params.id,
      isPublished: true,
      deletedAt: null
    })
      .select("code title description")
      .lean();

    if (!course) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }

    // 2. Its units, in order
    const units = await Unit.find({ course: course._id, deletedAt: null })
      .select("title order")
      .sort({ order: 1 })
      .lean();

    // 3. All the lessons in those units, in one query
    const lessons = await Lesson.find({
      unit: { $in: units.map((u) => u._id) },
      isPublished: true,
      deletedAt: null
    })
      .select("unit title order videoId")
      .sort({ order: 1 })
      .lean();

    // 4. Which of those lessons this student has completed
    const done = await Progress.find({
      user: req.user.id,
      lesson: { $in: lessons.map((l) => l._id) },
      completed: true
    })
      .select("lesson score")
      .lean();

    const scoreByLesson = new Map(done.map((p) => [p.lesson.toString(), p.score]));

    // 5. Put the pieces together: each unit gets its own lessons
    const outline = units
      .map((unit) => ({
        _id: unit._id,
        title: unit.title,
        order: unit.order,
        lessons: lessons
          .filter((lesson) => lesson.unit.toString() === unit._id.toString())
          .map((lesson) => ({
            _id: lesson._id,
            title: lesson.title,
            order: lesson.order,
            hasVideo: Boolean(lesson.videoId),
            completed: scoreByLesson.has(lesson._id.toString()),
            score: scoreByLesson.get(lesson._id.toString()) ?? null
          }))
      }))
      .filter((unit) => unit.lessons.length > 0); // hide units with nothing published yet

    return res.status(200).json({
      data: {
        ...course,
        units: outline,
        progress: {
          completedLessons: done.length,
          totalLessons: lessons.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      isPublished: true,
      deletedAt: null // CHANGED: deleted courses are hidden
    })
      .select("code title description")
      .sort({ code: 1 })
      .lean();

    // CHANGED: removed the "created" message
    return res.status(200).json({ count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  // CHANGED: check the ID first, so a bad ID gives a 400 instead of a 500
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    // CHANGED: findOneAndUpdate so we can also require deletedAt: null,
    // which stops a deleted course from being edited
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({
      message: "Course updated successfully",
      data: updatedCourse
    });
  } catch (error) {
    // CHANGED: a new code that clashes with another course
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this code already exists"
      });
    }
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  // CHANGED: ID check added
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    // CHANGED: soft delete. Nothing is removed; we stamp the date, and the
    // read functions above skip any course that has a deletedAt value.
    const deletedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedCourse) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    next(error);
  }
};


// ADMIN: every course that isn't deleted, drafts included
const getAllCoursesForAdmin = async (req, res, next) => {
  try {
    const courses = await Course.find({ deletedAt: null })
      .select("code title description isPublished")
      .sort({ code: 1 })
      .lean();
    const courseIds = courses.map((course) => course._id);
    const units = await Unit.find({ course: { $in: courseIds }, deletedAt: null })
      .select("course title order")
      .sort({ order: 1 })
      .lean();
    const lessons = await Lesson.find({
      unit: { $in: units.map((unit) => unit._id) },
      deletedAt: null
    })
      .select("unit title order")
      .sort({ order: 1 })
      .lean();

    const lessonsByUnit = new Map();
    for (const lesson of lessons) {
      const unitId = lesson.unit.toString();
      const unitLessons = lessonsByUnit.get(unitId) || [];
      unitLessons.push(lesson);
      lessonsByUnit.set(unitId, unitLessons);
    }

    const unitsByCourse = new Map();
    for (const unit of units) {
      const courseId = unit.course.toString();
      const courseUnits = unitsByCourse.get(courseId) || [];
      courseUnits.push({
        ...unit,
        lessons: lessonsByUnit.get(unit._id.toString()) || []
      });
      unitsByCourse.set(courseId, courseUnits);
    }

    return res.status(200).json({
      count: courses.length,
      data: courses.map((course) => ({
        ...course,
        units: unitsByCourse.get(course._id.toString()) || []
      }))
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createCourse,
  getCourseByID,
  getAllCourses,
  updateCourse,
  deleteCourse,
  getAllCoursesForAdmin
};