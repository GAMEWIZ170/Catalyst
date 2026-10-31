const Lesson = require("../models/lesson.models");
const Unit = require("../models/unit.models");
const Course = require("../models/course.models");
const Test = require("../models/test.models");

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

const findVisibleQuestionTest = async (testId) => findVisibleTest(testId);

module.exports = {
  courseIsVisible,
  unitIsVisible,
  lessonIsVisible,
  testIsVisible,
  findVisibleLesson,
  findVisibleTest,
  findVisibleQuestionTest,
  Course,
  Unit
};
