const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Progress = require("../models/progress.models");
const Test = require("../models/test.models");
const TestResult = require("../models/testresult.models");
const Question = require("../models/question.models");
const Flashcard = require("../models/flashcard.models");
const Material = require("../models/material.models");
const Mastery = require("../models/mastery.models");

const countBy = (rows, field) => new Map(rows.map((row) => [row._id.toString(), row[field]]));

// One course as a student sees it: units, lessons, tests and what this student has finished.
// Returns null when the course is missing, unpublished or deleted.
// The database is far away, so each round trip costs. Queries that do not depend on each other
// run together: 4 round trips instead of 9.
const buildCourseOutline = async (courseId, userId) => {
  // Round trip 1: the course and its units. The units query does not need the course first.
  const [course, units] = await Promise.all([
    Course.findOne({ _id: courseId, isPublished: true, deletedAt: null }).select("code title description").lean(),
    Unit.find({ course: courseId, deletedAt: null }).select("title order").sort({ order: 1 }).lean()
  ]);
  if (!course) return null;

  // Round trip 2: every lesson in those units, in one query.
  const unitIds = units.map((unit) => unit._id);
  const lessons = await Lesson.find({ unit: { $in: unitIds }, isPublished: true, deletedAt: null })
    .select("unit title order videoId").sort({ order: 1 }).lean();
  const lessonIds = lessons.map((lesson) => lesson._id);

  // Round trip 3: tests, flashcard and material counts, and this student's finished lessons.
  const [tests, flashcardCounts, materialCounts, done, masteryRows] = await Promise.all([
    Test.find({
      deletedAt: null,
      isPublished: true,
      $or: [
        { scope: "course", course: course._id },
        { scope: "unit", unit: { $in: unitIds } },
        { scope: "lesson", lesson: { $in: lessonIds } }
      ]
    }).select("_id scope lesson unit course title order").sort({ order: 1 }).lean(),
    Flashcard.aggregate([
      { $match: { lesson: { $in: lessonIds }, isPublished: true, deletedAt: null } },
      { $group: { _id: "$lesson", count: { $sum: 1 } } }
    ]),
    Material.aggregate([
      { $match: { lesson: { $in: lessonIds }, isPublished: true, deletedAt: null } },
      { $group: { _id: "$lesson", count: { $sum: 1 } } }
    ]),
    Progress.find({ user: userId, lesson: { $in: lessonIds }, completed: true }).select("lesson score").lean(),
    Mastery.find({ user: userId, lesson: { $in: lessonIds } }).select("lesson level").lean()
  ]);

  // Round trip 4: question counts (a test with no questions is hidden) and best scores.
  const testIds = tests.map((test) => test._id);
  const [questionCounts, results] = await Promise.all([
    Question.aggregate([
      { $match: { test: { $in: testIds }, deletedAt: null } },
      { $group: { _id: "$test", questionCount: { $sum: 1 } } }
    ]),
    TestResult.find({ user: userId, test: { $in: testIds } }).select("test bestScore").lean()
  ]);

  const countByTest = countBy(questionCounts, "questionCount");
  const scoreByTest = new Map(results.map((result) => [result.test.toString(), result.bestScore]));
  const flashcardCountByLesson = countBy(flashcardCounts, "count");
  const materialCountByLesson = countBy(materialCounts, "count");
  const masteryByLesson = new Map(masteryRows.map((row) => [row.lesson.toString(), row.level]));
  const scoreByLesson = new Map(done.map((item) => [item.lesson.toString(), item.score]));

  const testsByLesson = new Map();
  const testsByUnit = new Map();
  const courseTests = [];
  for (const test of tests.filter((item) => countByTest.has(item._id.toString()))) {
    const summary = { _id: test._id, title: test.title, order: test.order, bestScore: scoreByTest.get(test._id.toString()) ?? null };
    if (test.scope === "lesson") {
      const list = testsByLesson.get(test.lesson.toString()) || [];
      list.push(summary);
      testsByLesson.set(test.lesson.toString(), list);
    } else if (test.scope === "unit") {
      const list = testsByUnit.get(test.unit.toString()) || [];
      list.push(summary);
      testsByUnit.set(test.unit.toString(), list);
    } else {
      courseTests.push(summary);
    }
  }

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
          mastery: masteryByLesson.get(lesson._id.toString()) || 0,
          score: scoreByLesson.get(lesson._id.toString()) ?? null,
          testCount: (testsByLesson.get(lesson._id.toString()) || []).length,
          flashcardCount: flashcardCountByLesson.get(lesson._id.toString()) || 0,
          materialCount: materialCountByLesson.get(lesson._id.toString()) || 0
        })),
      tests: testsByUnit.get(unit._id.toString()) || []
    }))
    .filter((unit) => unit.lessons.length > 0); // hide units with nothing published yet

  return {
    ...course,
    units: outline,
    progress: { completedLessons: done.length, totalLessons: lessons.length },
    tests: courseTests
  };
};

module.exports = { buildCourseOutline };
