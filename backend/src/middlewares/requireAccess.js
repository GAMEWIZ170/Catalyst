// requireAccess.js: when REQUIRE_SUBSCRIPTION=true, students need an active subscription
// to open lessons, tests, flashcards and materials. Admins always have access.
// Browsing courses and viewing progress stay open. With the setting off, everyone has access.
// Exception: content inside a course marked isFree stays open to every signed-in student.
const mongoose = require("mongoose");
const Course = require("../models/course.models");
const Unit = require("../models/unit.models");
const Lesson = require("../models/lesson.models");
const Test = require("../models/test.models");
const Question = require("../models/question.models");
const Flashcard = require("../models/flashcard.models");

const hasAccess = (user) =>
  process.env.REQUIRE_SUBSCRIPTION !== "true" ||
  user.role === "admin" ||
  Boolean(user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > new Date());

const unitCourse = async (unitId) => (unitId ? (await Unit.findById(unitId).select("course").lean())?.course : null);
const lessonCourse = async (lessonId) => {
  const lesson = lessonId && (await Lesson.findById(lessonId).select("unit").lean());
  return lesson ? unitCourse(lesson.unit) : null;
};
const testCourse = async (testId) => {
  const test = await Test.findById(testId).select("lesson unit course").lean();
  if (!test) return null;
  return test.course || (await unitCourse(test.unit)) || (await lessonCourse(test.lesson));
};

// Works out which course a request points at from its URL. Returns null for anything else.
const courseOfRequest = async (req) => {
  const match = req.originalUrl.split("?")[0].match(/^\/api\/v1\/(lessons|tests|questions|flashcards)\/([^/]+)/)
    || req.originalUrl.split("?")[0].match(/^\/api\/v1\/(lessons)\/([^/]+)\/(?:flashcards|materials)$/);
  if (!match || !mongoose.isObjectIdOrHexString(match[2])) return null;
  const [, kind, id] = match;
  if (kind === "lessons") return lessonCourse(id);
  if (kind === "tests") return testCourse(id);
  if (kind === "questions") {
    const q = await Question.findById(id).select("test").lean();
    return q ? testCourse(q.test) : null;
  }
  const card = await Flashcard.findById(id).select("lesson").lean();
  return card ? lessonCourse(card.lesson) : null;
};

const isFreeRequest = async (req) => {
  const courseId = await courseOfRequest(req);
  if (!courseId) return false;
  return Boolean(await Course.exists({ _id: courseId, isFree: true, isPublished: true, deletedAt: null }));
};

const requireAccess = async (req, res, next) => {
  try {
    if (hasAccess(req.user) || (await isFreeRequest(req))) return next();
    return res.status(403).json({
      message: "Your access has ended. Contact Catalyst to renew it.",
      code: "SUBSCRIPTION_REQUIRED"
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = requireAccess;
module.exports.hasAccess = hasAccess;
