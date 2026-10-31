const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");

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
    const lesson = await Lesson.findOne({ _id: id, deletedAt: null }).select("unit").populate({
      path: "unit",
      select: "deletedAt course",
      populate: { path: "course", select: "deletedAt" }
    }).lean();
    return Boolean(lesson && lesson.unit && !lesson.unit.deletedAt &&
      lesson.unit.course && !lesson.unit.course.deletedAt);
  }
  return false;
};

const findVisibleLesson = async (id) => {
  const lesson = await Lesson.findOne({ _id: id, isPublished: true, deletedAt: null })
    .populate({ path: "unit", select: "deletedAt course", populate: { path: "course", select: "isPublished deletedAt" } })
    .lean();
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
