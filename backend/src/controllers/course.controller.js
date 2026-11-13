const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Progress = require("../models/progress.models");
const Test = require("../models/test.models");
const TestResult = require("../models/testresult.models");
const mongoose = require("mongoose");
const { buildCourseOutline } = require("../utils/courseOutline");
const Question = require("../models/question.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");

// Course codes are unique ignoring upper and lower case, and a code in the Trash is still taken.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const findCodeClash = (code, excludeId) => Course.findOne({
  code: new RegExp(`^${escapeRegex(String(code).trim())}$`, "i"),
  ...(excludeId ? { _id: { $ne: excludeId } } : {})
}).select("deletedAt").lean();
const codeClashMessage = (clash) => clash.deletedAt
  ? "A deleted course already uses this code. Restore it from the Trash or choose another code."
  : "A course with this code already exists";

const createCourse = async (req, res, next) => {
  try {
    const clash = await findCodeClash(req.body.code);
    if (clash) return res.status(409).json({ message: codeClashMessage(clash) });
    const course = new Course(req.body);
    await course.save();

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
    const data = await buildCourseOutline(req.params.id, req.user.id);
    if (!data) {
      return res.status(404).json({
        message: `Course with ID ${req.params.id} not found`
      });
    }
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      isPublished: true,
      deletedAt: null
    })
      .select("code title description")
      .sort({ code: 1 })
      .lean();

    return res.status(200).json({ count: courses.length, data: courses });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    if (req.body.code !== undefined) {
      const clash = await findCodeClash(req.body.code, req.params.id);
      if (clash) return res.status(409).json({ message: codeClashMessage(clash) });
    }
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { returnDocument: "after", runValidators: true }
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
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A course with this code already exists"
      });
    }
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    const deletedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { returnDocument: "after" }
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

const getCourseForAdmin = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid course ID" });
  }
  try {
    const course = await Course.findOne({ _id: req.params.id, deletedAt: null })
      .select("_id code title description isPublished")
      .lean();
    if (!course) return res.status(404).json({ message: "Course not found" });

    const units = await Unit.find({ course: course._id, deletedAt: null })
      .select("_id title order")
      .sort({ order: 1 })
      .lean();
    const unitIds = units.map((unit) => unit._id);
    const lessons = await Lesson.find({ unit: { $in: unitIds }, deletedAt: null })
      .select("_id unit title order isPublished videoId")
      .sort({ order: 1 })
      .lean();
    const lessonIds = lessons.map((lesson) => lesson._id);
    const tests = await Test.find({
      deletedAt: null,
      $or: [
        { scope: "course", course: course._id },
        { scope: "unit", unit: { $in: unitIds } },
        { scope: "lesson", lesson: { $in: lessonIds } }
      ]
    }).select("_id scope course unit lesson title order isPublished").sort({ order: 1 }).lean();
    const testIds = tests.map((test) => test._id);
    const [questionCounts, flashcardCounts, materialCounts] = await Promise.all([
      Question.aggregate([
        { $match: { test: { $in: testIds }, deletedAt: null } },
        { $group: { _id: "$test", questionCount: { $sum: 1 } } }
      ]),
      Flashcard.aggregate([
        { $match: { lesson: { $in: lessonIds }, deletedAt: null } },
        { $group: { _id: "$lesson", flashcardCount: { $sum: 1 } } }
      ]),
      Material.aggregate([
        { $match: { lesson: { $in: lessonIds }, deletedAt: null } },
        { $group: { _id: "$lesson", materialCount: { $sum: 1 } } }
      ])
    ]);

    const questionCountByTest = new Map(questionCounts.map((item) => [item._id.toString(), item.questionCount]));
    const flashcardCountByLesson = new Map(flashcardCounts.map((item) => [item._id.toString(), item.flashcardCount]));
    const materialCountByLesson = new Map(materialCounts.map((item) => [item._id.toString(), item.materialCount]));
    const testsByParent = (scope, parentKey, parentId) => tests
      .filter((test) => test.scope === scope && test[parentKey]?.toString() === parentId.toString())
      .map((test) => ({
        _id: test._id,
        title: test.title,
        order: test.order,
        isPublished: test.isPublished,
        questionCount: questionCountByTest.get(test._id.toString()) || 0
      }));
    const lessonsByUnit = new Map();
    for (const lesson of lessons) {
      const items = lessonsByUnit.get(lesson.unit.toString()) || [];
      items.push({
        _id: lesson._id,
        title: lesson.title,
        order: lesson.order,
        isPublished: lesson.isPublished,
        hasVideo: Boolean(lesson.videoId),
        testCount: testsByParent("lesson", "lesson", lesson._id).length,
        flashcardCount: flashcardCountByLesson.get(lesson._id.toString()) || 0,
        materialCount: materialCountByLesson.get(lesson._id.toString()) || 0
      });
      lessonsByUnit.set(lesson.unit.toString(), items);
    }

    return res.status(200).json({
      data: {
        ...course,
        tests: testsByParent("course", "course", course._id),
        units: units.map((unit) => ({
          _id: unit._id,
          title: unit.title,
          order: unit.order,
          tests: testsByParent("unit", "unit", unit._id),
          lessons: lessonsByUnit.get(unit._id.toString()) || []
        }))
      }
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
  getAllCoursesForAdmin,
  getCourseForAdmin
};