const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const mongoose = require("mongoose");

const courseIsVisible = (course) => Boolean(
  course && course.isPublished && !course.deletedAt
);

const unitIsVisible = (unit) => Boolean(
  unit && !unit.deletedAt && courseIsVisible(unit.course)
);

const lessonIsVisible = (lesson) => Boolean(
  lesson && lesson.isPublished && !lesson.deletedAt && unitIsVisible(lesson.unit)
);

const testIsVisible = (test) => {
  if (!test || !test.isPublished || test.deletedAt) return false;
  if (test.scope === "lesson") return lessonIsVisible(test.lesson);
  if (test.scope === "unit") return unitIsVisible(test.unit);
  if (test.scope === "course") return courseIsVisible(test.course);
  return false;
};

const testPopulate = [
  {
    path: "lesson",
    select: "isPublished deletedAt unit",
    populate: { path: "unit", select: "deletedAt course", populate: { path: "course", select: "isPublished deletedAt" } }
  },
  {
    path: "unit",
    select: "deletedAt course",
    populate: { path: "course", select: "isPublished deletedAt" }
  },
  { path: "course", select: "isPublished deletedAt" }
];

const parentIsAvailable = async (scope, id) => {
  if (scope === "course") {
    return Boolean(await Course.exists({ _id: id, deletedAt: null }));
  }
  if (scope === "unit") {
    const unit = await Unit.findOne({ _id: id, deletedAt: null }).select("course").populate("course", "deletedAt").lean();
    return Boolean(unit && unit.course && !unit.course.deletedAt);
  }
  if (scope === "lesson") {
    const lesson = await Lesson.findOne({ _id: id, deletedAt: null }).select("unit").lean();
    if (!lesson) return false;
    const unit = await Unit.findOne({ _id: lesson.unit, deletedAt: null }).select("course").lean();
    if (!unit) return false;
    return Boolean(await Course.exists({ _id: unit.course, deletedAt: null }));
  }
  return false;
};

// The lesson with its unit and course, in one round trip (three populates were three trips).
// The shape is the same as before: lesson.unit = { _id, deletedAt, course: { _id, isPublished, deletedAt } }.
const findVisibleLesson = async (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const [lesson] = await Lesson.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(String(id)), isPublished: true, deletedAt: null } },
    { $lookup: { from: Unit.collection.name, localField: "unit", foreignField: "_id", pipeline: [{ $project: { deletedAt: 1, course: 1 } }], as: "unit" } },
    { $unwind: "$unit" },
    { $lookup: { from: Course.collection.name, localField: "unit.course", foreignField: "_id", pipeline: [{ $project: { isPublished: 1, deletedAt: 1 } }], as: "unit.course" } },
    { $unwind: "$unit.course" }
  ]);
  return lessonIsVisible(lesson) ? lesson : null;
};

const findVisibleTest = async (id) => {
  const test = await Test.findOne({ _id: id, isPublished: true, deletedAt: null })
    .populate(testPopulate)
    .lean();
  return testIsVisible(test) ? test : null;
};

const findTestQuestionCounts = async (query) => {
  const tests = await Test.find(query).sort({ order: 1 }).lean();
  if (!tests.length) return [];
  const counts = await Question.aggregate([
    { $match: { test: { $in: tests.map((test) => test._id) }, deletedAt: null } },
    { $group: { _id: "$test", questionCount: { $sum: 1 } } }
  ]);
  const countByTest = new Map(counts.map((item) => [item._id.toString(), item.questionCount]));
  return tests.map((test) => ({
    ...test,
    questionCount: countByTest.get(test._id.toString()) || 0
  }));
};

const findTestsWithQuestions = async (query) => {
  const tests = await findTestQuestionCounts(query);
  return tests.filter((test) => test.questionCount > 0);
};

const findVisibleQuestionTest = async (testId) => findVisibleTest(testId);

module.exports = {
  courseIsVisible,
  unitIsVisible,
  lessonIsVisible,
  testIsVisible,
  findVisibleLesson,
  findVisibleTest,
  findTestQuestionCounts,
  findTestsWithQuestions,
  parentIsAvailable
};
